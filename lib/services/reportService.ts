import {
  ExpenseCategory,
  InstallmentPlanSource,
  InstallmentPlanStatus,
  InventoryMovementType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
  RepairStatus,
  SaleStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FinancialRange = {
  start: Date;
  end: Date;
};

export type CreateExpenseInput = {
  title: string;
  category: ExpenseCategory;
  amount: string;
  spentAt: Date;
  notes?: string;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  OTHER: "أخرى",
};

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return value == null ? 0 : Number(value);
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function rangeWhere(range: FinancialRange) {
  return { gte: range.start, lt: range.end };
}

export async function getFinancialReport(shopId: string, range: FinancialRange) {
  const [
    sales,
    invoices,
    manualPlans,
    invoicePayments,
    manualInstallmentPayments,
    inventoryMovements,
    externalRepairItems,
    legacyRepairOrders,
    expenses,
    inventoryItems,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: SaleStatus.COMPLETED,
        soldAt: rangeWhere(range),
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        discountTotal: true,
        soldAt: true,
        invoices: {
          where: { deletedAt: null, status: { not: InvoiceStatus.VOID } },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.invoice.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: { not: InvoiceStatus.VOID },
        issuedAt: rangeWhere(range),
      },
      select: {
        id: true,
        saleId: true,
        total: true,
        subtotal: true,
        discountTotal: true,
        balanceDue: true,
        issuedAt: true,
        type: true,
      },
    }),
    prisma.installmentPlan.findMany({
      where: {
        shopId,
        deletedAt: null,
        source: InstallmentPlanSource.MANUAL,
        status: { not: InstallmentPlanStatus.CANCELLED },
        createdAt: rangeWhere(range),
      },
      select: {
        id: true,
        totalAmount: true,
        balanceDue: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        shopId,
        deletedAt: null,
        paidAt: rangeWhere(range),
        invoice: { is: { deletedAt: null, status: { not: InvoiceStatus.VOID } } },
      },
      select: { amount: true, method: true, sourceName: true, paidAt: true },
    }),
    prisma.installmentPayment.findMany({
      where: {
        shopId,
        voidedAt: null,
        paidAt: rangeWhere(range),
        plan: {
          is: {
            deletedAt: null,
            source: InstallmentPlanSource.MANUAL,
            status: { not: InstallmentPlanStatus.CANCELLED },
          },
        },
      },
      select: { amount: true, method: true, sourceName: true, paidAt: true },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        shopId,
        deletedAt: null,
        createdAt: rangeWhere(range),
        type: {
          in: [
            InventoryMovementType.SALE,
            InventoryMovementType.REPAIR_USAGE,
            InventoryMovementType.RETURN,
            InventoryMovementType.REPAIR_RETURN,
          ],
        },
      },
      select: {
        type: true,
        quantityChange: true,
        unitCostSnapshot: true,
        createdAt: true,
        sale: { select: { status: true, deletedAt: true } },
        repairOrder: { select: { status: true, deletedAt: true } },
      },
    }),
    prisma.repairOrderItem.findMany({
      where: {
        shopId,
        deletedAt: null,
        inventoryItemId: null,
        unitCost: { not: null },
        createdAt: rangeWhere(range),
        repairOrder: { is: { deletedAt: null, status: { not: RepairStatus.CANCELLED } } },
      },
      select: { quantity: true, unitCost: true, createdAt: true },
    }),
    prisma.repairOrder.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: { not: RepairStatus.CANCELLED },
        deductPartCost: true,
        partCost: { not: null },
        createdAt: rangeWhere(range),
        items: { none: { deletedAt: null } },
      },
      select: { partCost: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { shopId, deletedAt: null, spentAt: rangeWhere(range) },
      include: { createdByUser: { select: { name: true } } },
      orderBy: { spentAt: "desc" },
      take: 100,
    }),
    prisma.inventoryItem.findMany({
      where: { shopId, deletedAt: null, quantity: { gt: 0 }, unitCost: { not: null } },
      select: { quantity: true, unitCost: true },
    }),
  ]);

  const salesGross = sales.reduce((sum, sale) => sum + decimalNumber(sale.total), 0);
  const salesNet = sales.reduce(
    (sum, sale) => sum + decimalNumber(sale.subtotal) - decimalNumber(sale.discountTotal),
    0,
  );
  const standaloneInvoices = invoices.filter((invoice) => !invoice.saleId);
  const invoiceGross = standaloneInvoices.reduce(
    (sum, invoice) => sum + decimalNumber(invoice.total),
    0,
  );
  const invoiceNet = standaloneInvoices.reduce(
    (sum, invoice) => sum + decimalNumber(invoice.subtotal) - decimalNumber(invoice.discountTotal),
    0,
  );
  const manualPlanGross = manualPlans.reduce(
    (sum, plan) => sum + decimalNumber(plan.totalAmount),
    0,
  );

  const grossRevenue = money(salesGross + invoiceGross + manualPlanGross);
  const netRevenueBeforeTax = money(salesNet + invoiceNet + manualPlanGross);
  const invoiceCollected = invoicePayments.reduce(
    (sum, payment) => sum + decimalNumber(payment.amount),
    0,
  );
  const manualInstallmentsCollected = manualInstallmentPayments.reduce(
    (sum, payment) => sum + decimalNumber(payment.amount),
    0,
  );
  const immediateSalesCollected = sales
    .filter((sale) => sale.invoices.length === 0)
    .reduce((sum, sale) => sum + decimalNumber(sale.total), 0);
  const collected = money(
    invoiceCollected + manualInstallmentsCollected + immediateSalesCollected,
  );

  const outstanding = money(
    invoices.reduce((sum, invoice) => sum + decimalNumber(invoice.balanceDue), 0) +
      manualPlans.reduce((sum, plan) => sum + decimalNumber(plan.balanceDue), 0),
  );

  const movementCost = inventoryMovements.reduce((sum, movement) => {
    if (
      movement.type === InventoryMovementType.SALE &&
      (movement.sale?.status !== SaleStatus.COMPLETED || movement.sale.deletedAt)
    ) {
      return sum;
    }
    if (
      movement.type === InventoryMovementType.REPAIR_USAGE &&
      (movement.repairOrder?.status === RepairStatus.CANCELLED || movement.repairOrder?.deletedAt)
    ) {
      return sum;
    }

    const unitCost = decimalNumber(movement.unitCostSnapshot);
    const quantity = Math.abs(movement.quantityChange);
    const isReturn =
      movement.type === InventoryMovementType.RETURN ||
      movement.type === InventoryMovementType.REPAIR_RETURN;
    return sum + (isReturn ? -1 : 1) * quantity * unitCost;
  }, 0);
  const externalCost = externalRepairItems.reduce(
    (sum, item) => sum + item.quantity * decimalNumber(item.unitCost),
    0,
  );
  const legacyCost = legacyRepairOrders.reduce(
    (sum, order) => sum + decimalNumber(order.partCost),
    0,
  );
  const directCosts = money(Math.max(0, movementCost + externalCost + legacyCost));
  const expenseTotal = money(
    expenses.reduce((sum, expense) => sum + decimalNumber(expense.amount), 0),
  );
  const grossProfit = money(netRevenueBeforeTax - directCosts);
  const netProfit = money(grossProfit - expenseTotal);
  const profitMargin = netRevenueBeforeTax > 0 ? money((netProfit / netRevenueBeforeTax) * 100) : 0;
  const inventoryValue = money(
    inventoryItems.reduce(
      (sum, item) => sum + item.quantity * decimalNumber(item.unitCost),
      0,
    ),
  );

  const paymentSources = new Map<string, number>();
  const paymentRows = [...invoicePayments, ...manualInstallmentPayments];
  for (const payment of paymentRows) {
    const label = payment.sourceName?.trim() || paymentMethodLabels[payment.method];
    paymentSources.set(label, (paymentSources.get(label) ?? 0) + decimalNumber(payment.amount));
  }
  if (immediateSalesCollected > 0) {
    paymentSources.set(
      "مبيعات POS مباشرة",
      (paymentSources.get("مبيعات POS مباشرة") ?? 0) + immediateSalesCollected,
    );
  }

  const revenueMix = [
    { label: "المبيعات والـ POS", value: money(salesGross) },
    {
      label: "فواتير الصيانة والخدمات",
      value: money(
        invoices
          .filter((invoice) => !invoice.saleId && invoice.type !== "MANUAL")
          .reduce((sum, invoice) => sum + decimalNumber(invoice.total), 0),
      ),
    },
    {
      label: "فواتير وخطط مستقلة",
      value: money(
        invoices
          .filter((invoice) => !invoice.saleId && invoice.type === "MANUAL")
          .reduce((sum, invoice) => sum + decimalNumber(invoice.total), 0) + manualPlanGross,
      ),
    },
  ];

  return {
    metrics: {
      grossRevenue,
      netRevenueBeforeTax,
      collected,
      outstanding,
      directCosts,
      expenseTotal,
      grossProfit,
      netProfit,
      profitMargin,
      inventoryValue,
    },
    counts: {
      sales: sales.length,
      invoices: invoices.length,
      manualPlans: manualPlans.length,
      expenses: expenses.length,
    },
    revenueMix,
    paymentSources: [...paymentSources.entries()]
      .map(([label, value]) => ({ label, value: money(value) }))
      .sort((a, b) => b.value - a.value),
    expenses,
  };
}

export async function createExpense(
  shopId: string,
  createdByUserId: string,
  input: CreateExpenseInput,
) {
  const amount = new Prisma.Decimal(input.amount.replace(",", "."));
  if (!amount.isPositive()) throw new Error("قيمة المصروف يجب أن تكون أكبر من صفر.");

  return prisma.expense.create({
    data: {
      shopId,
      createdByUserId,
      category: input.category,
      title: input.title.trim(),
      amount,
      spentAt: input.spentAt,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function deleteExpense(shopId: string, expenseId: string) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!expense) throw new Error("المصروف غير موجود.");

  return prisma.expense.update({
    where: { id: expense.id },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });
}

export const reportService = {
  getFinancialReport,
  createExpense,
  deleteExpense,
};
