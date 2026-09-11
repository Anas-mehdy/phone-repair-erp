import {
  InstallmentPlanSource,
  InstallmentPlanStatus,
  InventoryMovementType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
  RepairStatus,
  SaleStatus,
} from "@prisma/client";

import { parseSourceDebtReference } from "@/lib/debt-source-reference";
import { prisma } from "@/lib/prisma";
import { reportService, type FinancialRange } from "@/lib/services/reportService";
import { debtReportService } from "@/lib/services/debtReportService";
import { softwareServiceService } from "@/lib/services/softwareServiceService";
import { getTransferCommissionReportSummary } from "@/lib/services/transferCommissionReportService";
import { financialTransferService } from "@/lib/services/financialTransferService";

export type ReportMetricKey =
  | "sales"
  | "collected"
  | "outstanding"
  | "direct-costs"
  | "electronic-profit"
  | "transfer-profit"
  | "gross-profit"
  | "expenses"
  | "net-profit"
  | "inventory-value";

export type ReportDrilldownRow = {
  id: string;
  occurredAt: Date | null;
  source: string;
  description: string;
  party?: string | null;
  reference?: string | null;
  amount: number;
  href?: string | null;
};

export type ReportDrilldownSection = {
  key: string;
  title: string;
  description: string;
  total: number;
  rows: ReportDrilldownRow[];
};

export type ReportDrilldownResult = {
  metric: ReportMetricKey;
  title: string;
  description: string;
  total: number;
  detailedTotal: number;
  formula?: string;
  sections: ReportDrilldownSection[];
  note?: string;
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "نقدي",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  OTHER: "أخرى",
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return value == null ? 0 : Number(value);
}

function sumRows(rows: ReportDrilldownRow[]) {
  return money(rows.reduce((sum, row) => sum + row.amount, 0));
}

function section(
  key: string,
  title: string,
  description: string,
  rows: ReportDrilldownRow[],
): ReportDrilldownSection {
  return { key, title, description, total: sumRows(rows), rows };
}

function invoiceTypeLabel(type: string) {
  if (type === "REPAIR") return "فاتورة صيانة";
  if (type === "SALE") return "فاتورة بيع";
  return "فاتورة مستقلة";
}

function electronicDestinationLabel(value: string) {
  if (value === "DRAWER") return "الدرج النقدي";
  if (value === "WALLET") return "محفظة";
  if (value === "BANK") return "حساب بنكي";
  if (value === "DEBT") return "دفتر الديون";
  return "مصدر آخر";
}

async function getSalesRevenueRows(shopId: string, range: FinancialRange, net = false) {
  const [sales, invoices, manualPlans, electronicRows] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: SaleStatus.COMPLETED,
        soldAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        receiptNumber: true,
        total: true,
        subtotal: true,
        discountTotal: true,
        soldAt: true,
        customer: { select: { name: true } },
      },
      orderBy: { soldAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: { not: InvoiceStatus.VOID },
        saleId: null,
        issuedAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        total: true,
        subtotal: true,
        discountTotal: true,
        issuedAt: true,
        customer: { select: { name: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.installmentPlan.findMany({
      where: {
        shopId,
        deletedAt: null,
        source: InstallmentPlanSource.MANUAL,
        status: { not: InstallmentPlanStatus.CANCELLED },
        createdAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        planNumber: true,
        title: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRaw<Array<{
      id: string;
      serviceName: string;
      customerCharge: Prisma.Decimal;
      createdAt: Date;
      customerName: string | null;
      reference: string | null;
    }>>`
      SELECT tx."id", tx."serviceName", tx."customerCharge", tx."createdAt",
             c."name" AS "customerName", tx."reference"
      FROM "ElectronicServiceTransaction" tx
      LEFT JOIN "Customer" c ON c."id" = tx."customerId" AND c."deletedAt" IS NULL
      WHERE tx."shopId" = ${shopId}::uuid
        AND tx."status" = 'ACTIVE'
        AND tx."createdAt" >= ${range.start}
        AND tx."createdAt" < ${range.end}
      ORDER BY tx."createdAt" DESC
    `.catch(() => []),
  ]);

  const saleRows: ReportDrilldownRow[] = sales.map((sale) => ({
    id: `sale-${sale.id}`,
    occurredAt: sale.soldAt,
    source: "المبيعات والـ POS",
    description: sale.receiptNumber ? `إيصال ${sale.receiptNumber}` : "عملية بيع",
    party: sale.customer?.name ?? "عميل نقدي / غير مسجل",
    reference: sale.receiptNumber,
    amount: money(net
      ? decimalNumber(sale.subtotal) - decimalNumber(sale.discountTotal)
      : decimalNumber(sale.total)),
    href: `/sales/${sale.id}`,
  }));

  const invoiceRows: ReportDrilldownRow[] = invoices.map((invoice) => ({
    id: `invoice-${invoice.id}`,
    occurredAt: invoice.issuedAt,
    source: invoiceTypeLabel(invoice.type),
    description: invoice.invoiceNumber,
    party: invoice.customer?.name ?? "عميل غير محدد",
    reference: invoice.invoiceNumber,
    amount: money(net
      ? decimalNumber(invoice.subtotal) - decimalNumber(invoice.discountTotal)
      : decimalNumber(invoice.total)),
    href: `/invoices/${invoice.id}`,
  }));

  const planRows: ReportDrilldownRow[] = manualPlans.map((plan) => ({
    id: `plan-${plan.id}`,
    occurredAt: plan.createdAt,
    source: "خطة تقسيط مستقلة",
    description: plan.title,
    party: plan.customer.name,
    reference: plan.planNumber,
    amount: money(decimalNumber(plan.totalAmount)),
    href: `/installments/${plan.id}`,
  }));

  const electronicServiceRows: ReportDrilldownRow[] = electronicRows.map((row) => ({
    id: `electronic-${row.id}`,
    occurredAt: row.createdAt,
    source: "خدمة إلكترونية",
    description: row.serviceName,
    party: row.customerName ?? "عميل غير محدد",
    reference: row.reference,
    amount: money(decimalNumber(row.customerCharge)),
    href: `/electronic-services/new?transaction=${row.id}`,
  }));

  return [
    section("sales", "المبيعات والـ POS", net ? "قيمة البيع قبل الضريبة وبعد الخصم." : "إجمالي عمليات البيع المكتملة.", saleRows),
    section("invoices", "الفواتير غير المرتبطة بمبيعة POS", net ? "قيمة الفواتير قبل الضريبة وبعد الخصم." : "فواتير الصيانة والخدمات والفواتير المستقلة.", invoiceRows),
    section("manual-plans", "خطط التقسيط المستقلة", "الخطط اليدوية التي أنشئت خلال الفترة.", planRows),
    section("electronic-services", "الخدمات الإلكترونية", "قيمة الخدمات الإلكترونية الفعالة.", electronicServiceRows),
  ];
}

async function getDebtOutstandingRows(shopId: string, range: FinancialRange) {
  type LedgerRow = {
    id: string;
    customerId: string;
    customerName: string | null;
    type: string;
    amount: Prisma.Decimal;
    occurredAt: Date;
    reference: string | null;
    description: string | null;
    isReversed: boolean;
  };

  const rows = await prisma.$queryRaw<LedgerRow[]>`
    SELECT e."id", e."customerId", c."name" AS "customerName", e."type",
           e."amount", e."occurredAt", e."reference", e."description", e."isReversed"
    FROM "DebtLedgerEntry" e
    LEFT JOIN "Customer" c ON c."id" = e."customerId" AND c."deletedAt" IS NULL
    WHERE e."shopId" = ${shopId}::uuid
    ORDER BY e."customerId" ASC, e."occurredAt" ASC, e."createdAt" ASC
  `.catch(() => []);

  const remaining = new Map<string, Prisma.Decimal>();
  const queues = new Map<string, Array<{ id: string; remaining: Prisma.Decimal }>>();
  const sourceRows = new Map<string, {
    row: LedgerRow;
    sourceType: "SALE" | "ELECTRONIC_SERVICE";
    sourceId: string;
    displayReference: string | null;
  }>();

  for (const row of rows) {
    if (row.isReversed) continue;
    const amount = new Prisma.Decimal(row.amount);
    const queue = queues.get(row.customerId) ?? [];
    if (!queues.has(row.customerId)) queues.set(row.customerId, queue);

    if (row.type === "DEBT" || row.type === "OPENING_BALANCE" || row.type === "ADJUSTMENT_DEBIT") {
      const debit = { id: row.id, remaining: amount };
      queue.push(debit);
      remaining.set(row.id, amount);
      const source = row.type === "DEBT" ? parseSourceDebtReference(row.reference) : null;
      if (source?.sourceType === "SALE" || source?.sourceType === "ELECTRONIC_SERVICE") {
        sourceRows.set(row.id, {
          row,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          displayReference: source.displayReference,
        });
      }
      continue;
    }

    let credit = amount;
    for (const debit of queue) {
      if (credit.lte(0)) break;
      if (debit.remaining.lte(0)) continue;
      const applied = debit.remaining.lte(credit) ? debit.remaining : credit;
      debit.remaining = debit.remaining.sub(applied);
      remaining.set(debit.id, debit.remaining);
      credit = credit.sub(applied);
    }
  }

  const saleSourceIds = [...sourceRows.values()]
    .filter((source) => source.sourceType === "SALE")
    .map((source) => source.sourceId);
  const existingSales = saleSourceIds.length
    ? await prisma.sale.findMany({
        where: { shopId, id: { in: saleSourceIds }, deletedAt: null },
        select: { id: true },
      })
    : [];
  const existingSaleIds = new Set(existingSales.map((sale) => sale.id));

  const saleRows: ReportDrilldownRow[] = [];
  const electronicRows: ReportDrilldownRow[] = [];

  for (const [entryId, source] of sourceRows) {
    if (source.row.occurredAt < range.start || source.row.occurredAt >= range.end) continue;
    const amount = money(Number(remaining.get(entryId) ?? 0));
    if (amount <= 0) continue;

    const common = {
      id: `debt-${entryId}`,
      occurredAt: source.row.occurredAt,
      party: source.row.customerName ?? "عميل غير محدد",
      reference: source.displayReference ?? source.row.reference,
      amount,
    };

    if (source.sourceType === "SALE") {
      saleRows.push({
        ...common,
        source: "دين مبيعة",
        description: source.displayReference || source.row.description || "مبيعة على الدين",
        href: existingSaleIds.has(source.sourceId)
          ? `/sales/${source.sourceId}`
          : `/debts/${source.row.customerId}`,
      });
    } else {
      electronicRows.push({
        ...common,
        source: "دين خدمة إلكترونية",
        description: source.displayReference || source.row.description || "خدمة إلكترونية على الدين",
        href: `/electronic-services/new?transaction=${source.sourceId}`,
      });
    }
  }

  return { saleRows, electronicRows };
}

async function getCollectedSections(shopId: string, range: FinancialRange) {
  const [invoicePayments, installmentPayments, sales, debtRows, debtSummary, electronicRows] = await Promise.all([
    prisma.payment.findMany({
      where: {
        shopId,
        deletedAt: null,
        paidAt: { gte: range.start, lt: range.end },
        invoice: { is: { deletedAt: null, status: { not: InvoiceStatus.VOID } } },
      },
      select: {
        id: true,
        invoiceId: true,
        amount: true,
        method: true,
        sourceName: true,
        paidAt: true,
        reference: true,
        invoice: {
          select: {
            invoiceNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
    prisma.installmentPayment.findMany({
      where: {
        shopId,
        voidedAt: null,
        paidAt: { gte: range.start, lt: range.end },
        plan: {
          is: {
            deletedAt: null,
            source: InstallmentPlanSource.MANUAL,
            status: { not: InstallmentPlanStatus.CANCELLED },
          },
        },
      },
      select: {
        id: true,
        planId: true,
        amount: true,
        method: true,
        sourceName: true,
        paidAt: true,
        reference: true,
        plan: {
          select: {
            planNumber: true,
            title: true,
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
    prisma.sale.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: SaleStatus.COMPLETED,
        soldAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        receiptNumber: true,
        total: true,
        soldAt: true,
        customer: { select: { name: true } },
        invoices: {
          where: { deletedAt: null, status: { not: InvoiceStatus.VOID } },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { soldAt: "desc" },
    }),
    prisma.$queryRaw<Array<{
      id: string;
      customerId: string;
      customerName: string | null;
      amount: Prisma.Decimal;
      occurredAt: Date;
      sourceName: string | null;
      paymentMethod: string | null;
      reference: string | null;
      description: string | null;
    }>>`
      SELECT e."id", e."customerId", c."name" AS "customerName", e."amount",
             e."occurredAt", e."sourceName", e."paymentMethod", e."reference", e."description"
      FROM "DebtLedgerEntry" e
      LEFT JOIN "Customer" c ON c."id" = e."customerId" AND c."deletedAt" IS NULL
      WHERE e."shopId" = ${shopId}::uuid
        AND e."type" = 'PAYMENT'
        AND e."isReversed" = FALSE
        AND e."occurredAt" >= ${range.start}
        AND e."occurredAt" < ${range.end}
      ORDER BY e."occurredAt" DESC
    `.catch(() => []),
    debtReportService.getDebtReportSummary(shopId, range.start, range.end)
      .catch(() => ({ deferredSaleIds: [], saleOutstanding: 0, electronicServiceOutstanding: 0, payments: [] })),
    prisma.$queryRaw<Array<{
      id: string;
      serviceName: string;
      customerCharge: Prisma.Decimal;
      paymentDestination: string;
      createdAt: Date;
      customerName: string | null;
      reference: string | null;
    }>>`
      SELECT tx."id", tx."serviceName", tx."customerCharge", tx."paymentDestination",
             tx."createdAt", c."name" AS "customerName", tx."reference"
      FROM "ElectronicServiceTransaction" tx
      LEFT JOIN "Customer" c ON c."id" = tx."customerId" AND c."deletedAt" IS NULL
      WHERE tx."shopId" = ${shopId}::uuid
        AND tx."status" = 'ACTIVE'
        AND tx."paymentDestination" <> 'DEBT'
        AND tx."createdAt" >= ${range.start}
        AND tx."createdAt" < ${range.end}
      ORDER BY tx."createdAt" DESC
    `.catch(() => []),
  ]);

  const invoiceRows: ReportDrilldownRow[] = invoicePayments.map((payment) => ({
    id: `payment-${payment.id}`,
    occurredAt: payment.paidAt,
    source: payment.sourceName?.trim() || paymentMethodLabels[payment.method],
    description: `دفعة فاتورة ${payment.invoice.invoiceNumber}`,
    party: payment.invoice.customer?.name ?? "عميل غير محدد",
    reference: payment.reference ?? payment.invoice.invoiceNumber,
    amount: money(decimalNumber(payment.amount)),
    href: `/invoices/${payment.invoiceId}`,
  }));

  const installmentRows: ReportDrilldownRow[] = installmentPayments.map((payment) => ({
    id: `installment-payment-${payment.id}`,
    occurredAt: payment.paidAt,
    source: payment.sourceName?.trim() || paymentMethodLabels[payment.method],
    description: `دفعة تقسيط — ${payment.plan.title}`,
    party: payment.plan.customer.name,
    reference: payment.reference ?? payment.plan.planNumber,
    amount: money(decimalNumber(payment.amount)),
    href: `/installments/${payment.planId}`,
  }));

  const deferredSaleIds = new Set(debtSummary.deferredSaleIds);
  const immediateSaleRows: ReportDrilldownRow[] = sales
    .filter((sale) => sale.invoices.length === 0 && !deferredSaleIds.has(sale.id))
    .map((sale) => ({
      id: `direct-sale-${sale.id}`,
      occurredAt: sale.soldAt,
      source: "مبيعات POS مباشرة",
      description: sale.receiptNumber ? `إيصال ${sale.receiptNumber}` : "عملية بيع مباشرة",
      party: sale.customer?.name ?? "عميل نقدي / غير مسجل",
      reference: sale.receiptNumber,
      amount: money(decimalNumber(sale.total)),
      href: `/sales/${sale.id}`,
    }));

  const collectedDebtRows: ReportDrilldownRow[] = debtRows.map((entry) => ({
    id: `debt-payment-${entry.id}`,
    occurredAt: entry.occurredAt,
    source: entry.sourceName?.trim() || entry.paymentMethod?.trim() || "تحصيل دين",
    description: entry.description || "دفعة على دفتر الديون",
    party: entry.customerName ?? "عميل غير محدد",
    reference: entry.reference,
    amount: money(decimalNumber(entry.amount)),
    href: `/debts/${entry.customerId}`,
  }));

  const electronicServiceRows: ReportDrilldownRow[] = electronicRows.map((row) => ({
    id: `electronic-collected-${row.id}`,
    occurredAt: row.createdAt,
    source: `خدمة إلكترونية — ${electronicDestinationLabel(row.paymentDestination)}`,
    description: row.serviceName,
    party: row.customerName ?? "عميل غير محدد",
    reference: row.reference,
    amount: money(decimalNumber(row.customerCharge)),
    href: `/electronic-services/new?transaction=${row.id}`,
  }));

  return [
    section("invoice-payments", "دفعات الفواتير", "كل دفعة فعلية على فاتورة غير ملغاة خلال الفترة.", invoiceRows),
    section("installment-payments", "دفعات الخطط المستقلة", "الدفعات المسجلة على خطط تقسيط مستقلة.", installmentRows),
    section("direct-sales", "مبيعات POS المباشرة", "مبيعات مكتملة بلا فاتورة مستقلة ولم تُسجل على دفتر الدين.", immediateSaleRows),
    section("debt-payments", "تحصيلات الديون", "دفعات فعلية دخلت على دفتر ديون العملاء خلال الفترة.", collectedDebtRows),
    section("electronic-collected", "الخدمات الإلكترونية المحصلة مباشرة", "عمليات الخدمات الإلكترونية التي لم تُسجل على الدين.", electronicServiceRows),
  ];
}

async function getOutstandingSections(shopId: string, range: FinancialRange) {
  const [invoices, manualPlans, debt] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: { not: InvoiceStatus.VOID },
        issuedAt: { gte: range.start, lt: range.end },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        balanceDue: true,
        issuedAt: true,
        dueAt: true,
        customer: { select: { name: true } },
      },
      orderBy: { issuedAt: "desc" },
    }),
    prisma.installmentPlan.findMany({
      where: {
        shopId,
        deletedAt: null,
        source: InstallmentPlanSource.MANUAL,
        status: { not: InstallmentPlanStatus.CANCELLED },
        createdAt: { gte: range.start, lt: range.end },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        planNumber: true,
        title: true,
        balanceDue: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getDebtOutstandingRows(shopId, range),
  ]);

  const invoiceRows: ReportDrilldownRow[] = invoices.map((invoice) => ({
    id: `outstanding-invoice-${invoice.id}`,
    occurredAt: invoice.issuedAt,
    source: invoiceTypeLabel(invoice.type),
    description: `${invoice.invoiceNumber}${invoice.dueAt ? " — مستحق" : ""}`,
    party: invoice.customer?.name ?? "عميل غير محدد",
    reference: invoice.invoiceNumber,
    amount: money(decimalNumber(invoice.balanceDue)),
    href: `/invoices/${invoice.id}`,
  }));

  const planRows: ReportDrilldownRow[] = manualPlans.map((plan) => ({
    id: `outstanding-plan-${plan.id}`,
    occurredAt: plan.createdAt,
    source: "خطة تقسيط مستقلة",
    description: plan.title,
    party: plan.customer.name,
    reference: plan.planNumber,
    amount: money(decimalNumber(plan.balanceDue)),
    href: `/installments/${plan.id}`,
  }));

  return [
    section("invoice-outstanding", "المتبقي على الفواتير", "الرصيد المتبقي على الفواتير الصادرة خلال الفترة.", invoiceRows),
    section("plan-outstanding", "المتبقي على الخطط المستقلة", "الرصيد المتبقي على خطط التقسيط المستقلة التي أنشئت خلال الفترة.", planRows),
    section("sale-debts", "ديون المبيعات", "المتبقي الفعلي بعد توزيع التحصيلات على دفتر الدين.", debt.saleRows),
    section("electronic-debts", "ديون الخدمات الإلكترونية", "المتبقي الفعلي من الخدمات الإلكترونية المسجلة على الدين.", debt.electronicRows),
  ];
}

async function getDirectCostRows(shopId: string, range: FinancialRange) {
  const [movements, externalItems, legacyOrders, softwareRows, electronicRows] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: {
        shopId,
        deletedAt: null,
        OR: [
          {
            createdAt: { gte: range.start, lt: range.end },
            type: { in: [InventoryMovementType.SALE, InventoryMovementType.RETURN] },
          },
          {
            createdAt: { lt: range.end },
            type: { in: [InventoryMovementType.REPAIR_USAGE, InventoryMovementType.REPAIR_RETURN] },
            repairOrder: {
              is: {
                deletedAt: null,
                status: { not: RepairStatus.CANCELLED },
                invoices: {
                  some: {
                    deletedAt: null,
                    status: { not: InvoiceStatus.VOID },
                    issuedAt: { gte: range.start, lt: range.end },
                  },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        type: true,
        quantityChange: true,
        unitCostSnapshot: true,
        createdAt: true,
        inventoryItem: { select: { name: true } },
        saleId: true,
        repairOrderId: true,
        sale: { select: { status: true, deletedAt: true, receiptNumber: true } },
        repairOrder: { select: { status: true, deletedAt: true, ticketNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repairOrderItem.findMany({
      where: {
        shopId,
        deletedAt: null,
        inventoryItemId: null,
        unitCost: { not: null },
        createdAt: { lt: range.end },
        repairOrder: {
          is: {
            deletedAt: null,
            status: { not: RepairStatus.CANCELLED },
            invoices: {
              some: {
                deletedAt: null,
                status: { not: InvoiceStatus.VOID },
                issuedAt: { gte: range.start, lt: range.end },
              },
            },
          },
        },
      },
      select: {
        id: true,
        quantity: true,
        unitCost: true,
        partName: true,
        createdAt: true,
        repairOrderId: true,
        repairOrder: { select: { ticketNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.repairOrder.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: { not: RepairStatus.CANCELLED },
        deductPartCost: true,
        partCost: { not: null },
        createdAt: { lt: range.end },
        items: { none: { deletedAt: null } },
        invoices: {
          some: {
            deletedAt: null,
            status: { not: InvoiceStatus.VOID },
            issuedAt: { gte: range.start, lt: range.end },
          },
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        partName: true,
        partCost: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    softwareServiceService.getFinancialRows(shopId, range.start, range.end).catch(() => []),
    prisma.$queryRaw<Array<{
      id: string;
      serviceName: string;
      providerCost: Prisma.Decimal;
      createdAt: Date;
      reference: string | null;
      providerName: string | null;
    }>>`
      SELECT tx."id", tx."serviceName", tx."providerCost", tx."createdAt",
             tx."reference", p."name" AS "providerName"
      FROM "ElectronicServiceTransaction" tx
      LEFT JOIN "ElectronicServiceProvider" p ON p."id" = tx."providerId" AND p."shopId" = tx."shopId"
      WHERE tx."shopId" = ${shopId}::uuid
        AND tx."status" = 'ACTIVE'
        AND tx."createdAt" >= ${range.start}
        AND tx."createdAt" < ${range.end}
      ORDER BY tx."createdAt" DESC
    `.catch(() => []),
  ]);

  const movementRows: ReportDrilldownRow[] = [];
  for (const movement of movements) {
    const isSaleMovement =
      movement.type === InventoryMovementType.SALE || movement.type === InventoryMovementType.RETURN;
    if (isSaleMovement && (movement.sale?.status !== SaleStatus.COMPLETED || movement.sale.deletedAt)) continue;

    const isRepairMovement =
      movement.type === InventoryMovementType.REPAIR_USAGE ||
      movement.type === InventoryMovementType.REPAIR_RETURN;
    if (isRepairMovement && (
      movement.repairOrder?.status === RepairStatus.CANCELLED ||
      movement.repairOrder?.deletedAt
    )) continue;

    const quantity = Math.abs(movement.quantityChange);
    const unitCost = decimalNumber(movement.unitCostSnapshot);
    const isReturn =
      movement.type === InventoryMovementType.RETURN ||
      movement.type === InventoryMovementType.REPAIR_RETURN;
    const amount = money((isReturn ? -1 : 1) * quantity * unitCost);

    movementRows.push({
      id: `movement-${movement.id}`,
      occurredAt: movement.createdAt,
      source: isReturn ? "مرتجع تكلفة مخزون" : "تكلفة قطعة من المخزون",
      description: `${movement.inventoryItem.name} × ${quantity}`,
      reference: movement.sale?.receiptNumber ?? movement.repairOrder?.ticketNumber ?? null,
      amount,
      href: movement.saleId
        ? `/sales/${movement.saleId}`
        : movement.repairOrderId
          ? `/repair-orders/${movement.repairOrderId}`
          : null,
    });
  }

  const externalRows: ReportDrilldownRow[] = externalItems.map((item) => ({
    id: `external-item-${item.id}`,
    occurredAt: item.createdAt,
    source: "قطعة صيانة خارج المخزون",
    description: `${item.partName} × ${item.quantity}`,
    reference: item.repairOrder.ticketNumber,
    amount: money(item.quantity * decimalNumber(item.unitCost)),
    href: `/repair-orders/${item.repairOrderId}`,
  }));

  const legacyRows: ReportDrilldownRow[] = legacyOrders.map((order) => ({
    id: `legacy-cost-${order.id}`,
    occurredAt: order.createdAt,
    source: "تكلفة صيانة قديمة",
    description: order.partName || "تكلفة قطعة مسجلة على أمر الصيانة",
    reference: order.ticketNumber,
    amount: money(decimalNumber(order.partCost)),
    href: `/repair-orders/${order.id}`,
  }));

  const softwareCostRows: ReportDrilldownRow[] = softwareRows
    .filter((row) => row.invoiceStatus !== InvoiceStatus.VOID && decimalNumber(row.serviceCost) !== 0)
    .map((row) => ({
      id: `software-cost-${row.invoiceId}`,
      occurredAt: null,
      source: "تكلفة خدمة سوفتوير",
      description: "تكلفة مزود/تنفيذ خدمة سوفتوير",
      reference: row.invoiceId,
      amount: money(decimalNumber(row.serviceCost)),
      href: `/invoices/${row.invoiceId}`,
    }));

  const electronicCostRows: ReportDrilldownRow[] = electronicRows
    .filter((row) => decimalNumber(row.providerCost) !== 0)
    .map((row) => ({
      id: `electronic-cost-${row.id}`,
      occurredAt: row.createdAt,
      source: "تكلفة مزود خدمة إلكترونية",
      description: row.serviceName,
      party: row.providerName,
      reference: row.reference,
      amount: money(decimalNumber(row.providerCost)),
      href: `/electronic-services/new?transaction=${row.id}`,
    }));

  return [
    section("inventory-cost", "تكلفة قطع المخزون", "حركات البيع والاستخدام بالصيانة مطروحاً منها المرتجعات.", movementRows),
    section("external-repair-cost", "قطع صيانة خارج المخزون", "قطع أدخلت مباشرة في أوامر الصيانة مع تكلفة.", externalRows),
    section("legacy-repair-cost", "تكاليف صيانة قديمة", "تكاليف الجزء القديمة عندما لا توجد بنود تفصيلية على أمر الصيانة.", legacyRows),
    section("software-cost", "تكاليف خدمات السوفتوير", "تكلفة تنفيذ خدمات السوفتوير غير الملغاة.", softwareCostRows),
    section("electronic-cost", "تكاليف مزودي الخدمات الإلكترونية", "التكلفة المسجلة على مزود كل خدمة إلكترونية فعالة.", electronicCostRows),
  ];
}

async function getElectronicProfitRows(shopId: string, range: FinancialRange) {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    serviceName: string;
    customerCharge: Prisma.Decimal;
    providerCost: Prisma.Decimal;
    profit: Prisma.Decimal;
    createdAt: Date;
    reference: string | null;
    providerName: string | null;
    customerName: string | null;
  }>>`
    SELECT tx."id", tx."serviceName", tx."customerCharge", tx."providerCost", tx."profit",
           tx."createdAt", tx."reference", p."name" AS "providerName", c."name" AS "customerName"
    FROM "ElectronicServiceTransaction" tx
    LEFT JOIN "ElectronicServiceProvider" p ON p."id" = tx."providerId" AND p."shopId" = tx."shopId"
    LEFT JOIN "Customer" c ON c."id" = tx."customerId" AND c."deletedAt" IS NULL
    WHERE tx."shopId" = ${shopId}::uuid
      AND tx."status" = 'ACTIVE'
      AND tx."createdAt" >= ${range.start}
      AND tx."createdAt" < ${range.end}
    ORDER BY tx."createdAt" DESC
  `.catch(() => []);

  return rows.map<ReportDrilldownRow>((row) => ({
    id: `electronic-profit-${row.id}`,
    occurredAt: row.createdAt,
    source: row.providerName ? `خدمة إلكترونية — ${row.providerName}` : "خدمة إلكترونية",
    description: `${row.serviceName} — على العميل ${money(decimalNumber(row.customerCharge))} / التكلفة ${money(decimalNumber(row.providerCost))}`,
    party: row.customerName,
    reference: row.reference,
    amount: money(decimalNumber(row.profit)),
    href: `/electronic-services/new?transaction=${row.id}`,
  }));
}

async function getTransferProfitRows(shopId: string, range: FinancialRange) {
  await financialTransferService.listWallets(shopId).catch(() => []);
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    operationType: string;
    commission: Prisma.Decimal;
    amount: Prisma.Decimal;
    customerName: string | null;
    customerPhone: string | null;
    sourceReference: string | null;
    createdAt: Date;
  }>>`
    SELECT "id", "operationType", "commission", "amount", "customerName",
           "customerPhone", "sourceReference", "createdAt"
    FROM "FinancialTransfer"
    WHERE "shopId" = ${shopId}::uuid
      AND "deletedAt" IS NULL
      AND "status" = 'ACTIVE'
      AND "sourceType" = 'CUSTOMER_TRANSFER'
      AND "operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL')
      AND "commission" > 0
      AND "createdAt" >= ${range.start}
      AND "createdAt" < ${range.end}
    ORDER BY "createdAt" DESC
  `.catch(() => []);

  return rows.map<ReportDrilldownRow>((row) => ({
    id: `transfer-profit-${row.id}`,
    occurredAt: row.createdAt,
    source: row.operationType === "CUSTOMER_DEPOSIT" ? "إيداع عميل" : "سحب عميل",
    description: `أصل العملية ${money(decimalNumber(row.amount))} — الربح هنا هو العمولة فقط`,
    party: row.customerName || row.customerPhone || "عميل غير محدد",
    reference: row.sourceReference,
    amount: money(decimalNumber(row.commission)),
    href: `/transfers/${row.id}`,
  }));
}

async function getExpenseRows(shopId: string, range: FinancialRange) {
  const rows = await prisma.expense.findMany({
    where: {
      shopId,
      deletedAt: null,
      spentAt: { gte: range.start, lt: range.end },
    },
    select: {
      id: true,
      title: true,
      category: true,
      amount: true,
      spentAt: true,
      notes: true,
      fundingSource: true,
      fundingWalletName: true,
      createdByUser: { select: { name: true } },
    },
    orderBy: { spentAt: "desc" },
  });

  return rows.map<ReportDrilldownRow>((expense) => ({
    id: `expense-${expense.id}`,
    occurredAt: expense.spentAt,
    source: expense.fundingSource === "DRAWER"
      ? "الدرج النقدي"
      : expense.fundingSource === "WALLET"
        ? `محفظة — ${expense.fundingWalletName || "محفظة إلكترونية"}`
        : expense.fundingSource === "BANK"
          ? "حساب بنكي"
          : "مصدر غير محدد",
    description: expense.notes ? `${expense.title} — ${expense.notes}` : expense.title,
    party: expense.createdByUser?.name ?? null,
    reference: expense.category,
    amount: money(decimalNumber(expense.amount)),
    href: `/reports?expense=${expense.id}#expense-${expense.id}`,
  }));
}

async function getInventoryValueRows(shopId: string) {
  const rows = await prisma.inventoryItem.findMany({
    where: {
      shopId,
      deletedAt: null,
      quantity: { gt: 0 },
      unitCost: { not: null },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      quantity: true,
      unitCost: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });

  return rows.map<ReportDrilldownRow>((item) => ({
    id: `inventory-${item.id}`,
    occurredAt: item.updatedAt,
    source: "مخزون حالي",
    description: `${item.name} — ${item.quantity} × ${money(decimalNumber(item.unitCost))}`,
    reference: item.sku,
    amount: money(item.quantity * decimalNumber(item.unitCost)),
    href: `/inventory/${item.id}`,
  }));
}

function normalizeDirectCostSections(
  sections: ReportDrilldownSection[],
  expectedTotal: number,
) {
  const raw = money(sections.reduce((sum, item) => sum + item.total, 0));
  const difference = money(expectedTotal - raw);
  if (Math.abs(difference) < 0.01) return sections;

  return [
    ...sections,
    section(
      "accounting-adjustment",
      "تسوية مطابقة البطاقة",
      "فرق ناتج عن قاعدة التقرير الحالية التي تمنع إجمالي التكاليف المباشرة من النزول تحت الصفر أو عن فروقات التقريب.",
      [{
        id: "direct-cost-adjustment",
        occurredAt: null,
        source: "تسوية التقرير",
        description: "تسوية آلية لمطابقة رقم بطاقة التكاليف المباشرة.",
        amount: difference,
      }],
    ),
  ];
}

function negateSections(
  sections: ReportDrilldownSection[],
  prefix: string,
  titlePrefix: string,
) {
  return sections.map((item) =>
    section(
      `${prefix}-${item.key}`,
      `${titlePrefix}${item.title}`,
      item.description,
      item.rows.map((row) => ({
        ...row,
        id: `${prefix}-${row.id}`,
        amount: money(-row.amount),
      })),
    ),
  );
}

export async function getReportMetricDrilldown(
  shopId: string,
  metric: ReportMetricKey,
  range: FinancialRange,
): Promise<ReportDrilldownResult> {
  const [report, transferSummary] = await Promise.all([
    reportService.getFinancialReport(shopId, range),
    getTransferCommissionReportSummary(shopId, range.start, range.end),
  ]);

  if (metric === "sales") {
    const sections = await getSalesRevenueRows(shopId, range, false);
    return {
      metric,
      title: "تفاصيل إجمالي المبيعات",
      description: "كل عملية دخلت في بطاقة إجمالي المبيعات خلال الفترة، مع مصدرها ورابطها الأصلي.",
      total: report.metrics.grossRevenue,
      detailedTotal: money(sections.reduce((sum, item) => sum + item.total, 0)),
      sections,
    };
  }

  if (metric === "collected") {
    const sections = await getCollectedSections(shopId, range);
    return {
      metric,
      title: "تفاصيل المقبوض فعلياً",
      description: "كل مبلغ تم تحصيله فعلياً خلال الفترة: فواتير، أقساط، مبيعات مباشرة، ديون وخدمات إلكترونية.",
      total: report.metrics.collected,
      detailedTotal: money(sections.reduce((sum, item) => sum + item.total, 0)),
      sections,
    };
  }

  if (metric === "outstanding") {
    const sections = await getOutstandingSections(shopId, range);
    return {
      metric,
      title: "تفاصيل المتبقي عند العملاء",
      description: "جرد المبالغ التي بقيت على العملاء من الفواتير والخطط وديون المبيعات والخدمات الإلكترونية.",
      total: report.metrics.outstanding,
      detailedTotal: money(sections.reduce((sum, item) => sum + item.total, 0)),
      sections,
      note: "ديون دفتر العملاء تُحسب بعد توزيع التحصيلات تاريخياً بنفس منطق التقرير العام.",
    };
  }

  if (metric === "direct-costs") {
    const rawSections = await getDirectCostRows(shopId, range);
    const sections = normalizeDirectCostSections(rawSections, report.metrics.directCosts);
    return {
      metric,
      title: "تفاصيل التكاليف المباشرة",
      description: "قطع المخزون والصيانة وخدمات السوفتوير وتكلفة مزودي الخدمات الإلكترونية التي دخلت في التكلفة.",
      total: report.metrics.directCosts,
      detailedTotal: money(sections.reduce((sum, item) => sum + item.total, 0)),
      sections,
    };
  }

  if (metric === "electronic-profit") {
    const rows = await getElectronicProfitRows(shopId, range);
    const sections = [section(
      "electronic-profit",
      "عمليات الخدمات الإلكترونية",
      "الربح المسجل لكل عملية = مبلغ العميل ناقص تكلفة المزود.",
      rows,
    )];
    return {
      metric,
      title: "تفاصيل ربح الخدمات الإلكترونية",
      description: "كل عملية خدمة إلكترونية فعالة وربحها الفردي.",
      total: report.metrics.electronicServiceProfit,
      detailedTotal: sumRows(rows),
      sections,
      formula: "ربح العملية = المبلغ على العميل − تكلفة المزود",
    };
  }

  if (metric === "transfer-profit") {
    const rows = await getTransferProfitRows(shopId, range);
    const sections = [section(
      "transfer-profit",
      "عمولات التحويلات",
      "يُحتسب الربح من العمولة فقط، ولا يدخل أصل مبلغ التحويل في الإيراد.",
      rows,
    )];
    return {
      metric,
      title: "تفاصيل ربح التحويلات",
      description: "العمولات الفعلية للعمليات المكتملة خلال الفترة.",
      total: transferSummary.totalProfit,
      detailedTotal: sumRows(rows),
      sections,
      formula: "ربح التحويلات = مجموع عمولات العمليات الفعالة فقط",
    };
  }

  if (metric === "expenses") {
    const rows = await getExpenseRows(shopId, range);
    const sections = [section(
      "expenses",
      "سجل المصروفات",
      "جميع المصروفات غير المحذوفة المسجلة ضمن الفترة.",
      rows,
    )];
    return {
      metric,
      title: "تفاصيل المصروفات",
      description: "كل حركة مصروف ومصدر السحب ومن أضافها.",
      total: report.metrics.expenseTotal,
      detailedTotal: sumRows(rows),
      sections,
    };
  }

  if (metric === "inventory-value") {
    const rows = await getInventoryValueRows(shopId);
    const sections = [section(
      "inventory-value",
      "قيمة الأصناف الحالية",
      "القيمة الحالية لكل صنف = الكمية المتوفرة × تكلفة الوحدة.",
      rows,
    )];
    return {
      metric,
      title: "تفاصيل قيمة المخزون الحالية",
      description: "جرد الأصناف التي لها كمية موجبة وتكلفة شراء مسجلة.",
      total: report.metrics.inventoryValue,
      detailedTotal: sumRows(rows),
      sections,
      formula: "قيمة الصنف = الكمية الحالية × تكلفة الوحدة",
      note: "قيمة المخزون الحالية ليست مرتبطة بالفترة الزمنية؛ هي لقطة لحالة المخزون الآن.",
    };
  }

  const revenueSections = await getSalesRevenueRows(shopId, range, true);
  const rawCostSections = await getDirectCostRows(shopId, range);
  const costSections = normalizeDirectCostSections(rawCostSections, report.metrics.directCosts);
  const transferRows = await getTransferProfitRows(shopId, range);
  const transferSections = [section(
    "transfer-profit",
    "ربح التحويلات",
    "عمولات التحويلات التي تُضاف إلى مجمل الربح.",
    transferRows,
  )];

  const positiveRevenue = revenueSections;
  const negativeCosts = negateSections(costSections, "subtract-cost", "طرح: ");
  const profitSections = [...positiveRevenue, ...negativeCosts, ...transferSections];

  if (metric === "gross-profit") {
    return {
      metric,
      title: "تفاصيل مجمل الربح",
      description: "تفكيك مجمل الربح إلى صافي الإيراد قبل الضريبة، التكاليف المباشرة، وربح التحويلات.",
      total: money(report.metrics.grossProfit + transferSummary.totalProfit),
      detailedTotal: money(profitSections.reduce((sum, item) => sum + item.total, 0)),
      sections: profitSections,
      formula: "مجمل الربح = صافي الإيراد قبل الضريبة − التكاليف المباشرة + ربح التحويلات",
    };
  }

  const expenseRows = await getExpenseRows(shopId, range);
  const expenseSections = [section(
    "subtract-expenses",
    "طرح: المصروفات",
    "المصروفات التشغيلية المسجلة ضمن الفترة.",
    expenseRows.map((row) => ({ ...row, id: `subtract-${row.id}`, amount: money(-row.amount) })),
  )];
  const sections = [...profitSections, ...expenseSections];

  return {
    metric: "net-profit",
    title: "تفاصيل صافي الربح",
    description: "المعادلة النهائية بعد طرح المصروفات من مجمل الربح.",
    total: money(report.metrics.netProfit + transferSummary.totalProfit),
    detailedTotal: money(sections.reduce((sum, item) => sum + item.total, 0)),
    sections,
    formula: "صافي الربح = مجمل الربح − المصروفات",
  };
}

export const reportDrilldownService = { getReportMetricDrilldown };
