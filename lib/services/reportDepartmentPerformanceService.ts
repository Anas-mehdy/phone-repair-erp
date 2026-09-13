import {
  InventoryMovementType,
  InvoiceStatus,
  Prisma,
  RepairStatus,
  SaleStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { financialTransferService } from "@/lib/services/financialTransferService";
import type { FinancialRange } from "@/lib/services/reportService";
import { softwareServiceService } from "@/lib/services/softwareServiceService";

export type ReportDepartmentPerformance = {
  key: "repairs" | "pos" | "electronic" | "software" | "transfers";
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
};

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return value == null ? 0 : Number(value);
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getPosPerformance(shopId: string, range: FinancialRange): Promise<ReportDepartmentPerformance> {
  const [sales, movements] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: SaleStatus.COMPLETED,
        soldAt: { gte: range.start, lt: range.end },
      },
      select: { subtotal: true, discountTotal: true },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        shopId,
        deletedAt: null,
        createdAt: { gte: range.start, lt: range.end },
        type: { in: [InventoryMovementType.SALE, InventoryMovementType.RETURN] },
      },
      select: {
        type: true,
        quantityChange: true,
        unitCostSnapshot: true,
        sale: { select: { status: true, deletedAt: true } },
      },
    }),
  ]);

  const revenue = money(sales.reduce(
    (sum, sale) => sum + decimalNumber(sale.subtotal) - decimalNumber(sale.discountTotal),
    0,
  ));

  const cost = money(Math.max(0, movements.reduce((sum, movement) => {
    if (movement.sale?.status !== SaleStatus.COMPLETED || movement.sale.deletedAt) return sum;
    const unitCost = decimalNumber(movement.unitCostSnapshot);
    const quantity = Math.abs(movement.quantityChange);
    return sum + (movement.type === InventoryMovementType.RETURN ? -1 : 1) * quantity * unitCost;
  }, 0)));

  return {
    key: "pos",
    label: "مبيعات POS",
    revenue,
    cost,
    profit: money(revenue - cost),
    count: sales.length,
  };
}

async function getRepairPerformance(shopId: string, range: FinancialRange): Promise<ReportDepartmentPerformance> {
  const [invoices, movements, externalItems, legacyOrders] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        shopId,
        deletedAt: null,
        status: { not: InvoiceStatus.VOID },
        repairOrderId: { not: null },
        issuedAt: { gte: range.start, lt: range.end },
      },
      select: { subtotal: true, discountTotal: true },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        shopId,
        deletedAt: null,
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
      select: {
        type: true,
        quantityChange: true,
        unitCostSnapshot: true,
        repairOrder: { select: { status: true, deletedAt: true } },
      },
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
      select: { quantity: true, unitCost: true },
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
      select: { partCost: true },
    }),
  ]);

  const revenue = money(invoices.reduce(
    (sum, invoice) => sum + decimalNumber(invoice.subtotal) - decimalNumber(invoice.discountTotal),
    0,
  ));

  const inventoryCost = movements.reduce((sum, movement) => {
    if (movement.repairOrder?.status === RepairStatus.CANCELLED || movement.repairOrder?.deletedAt) return sum;
    const unitCost = decimalNumber(movement.unitCostSnapshot);
    const quantity = Math.abs(movement.quantityChange);
    return sum + (movement.type === InventoryMovementType.REPAIR_RETURN ? -1 : 1) * quantity * unitCost;
  }, 0);
  const externalCost = externalItems.reduce((sum, item) => sum + item.quantity * decimalNumber(item.unitCost), 0);
  const legacyCost = legacyOrders.reduce((sum, order) => sum + decimalNumber(order.partCost), 0);
  const cost = money(Math.max(0, inventoryCost + externalCost + legacyCost));

  return {
    key: "repairs",
    label: "مبيعات الصيانة",
    revenue,
    cost,
    profit: money(revenue - cost),
    count: invoices.length,
  };
}

async function getSoftwarePerformance(shopId: string, range: FinancialRange): Promise<ReportDepartmentPerformance> {
  const rows = await softwareServiceService.getFinancialRows(shopId, range.start, range.end).catch(() => []);
  const activeRows = rows.filter((row) => row.invoiceStatus !== InvoiceStatus.VOID);
  const revenue = money(activeRows.reduce((sum, row) => sum + decimalNumber(row.invoiceTotal), 0));
  const cost = money(activeRows.reduce((sum, row) => sum + decimalNumber(row.serviceCost), 0));

  return {
    key: "software",
    label: "خدمات السوفتوير",
    revenue,
    cost,
    profit: money(revenue - cost),
    count: activeRows.length,
  };
}

async function getTransferPerformance(shopId: string, range: FinancialRange): Promise<ReportDepartmentPerformance> {
  // FinancialTransfer is runtime-managed. This call guarantees the table/backfill exists.
  await financialTransferService.listWallets(shopId);

  const rows = await prisma.$queryRaw<Array<{
    revenue: Prisma.Decimal;
    cost: Prisma.Decimal;
    profit: Prisma.Decimal;
    operationCount: bigint;
  }>>`
    SELECT
      COALESCE(SUM(
        CASE
          WHEN "operationType" = 'CUSTOMER_DEPOSIT'
            THEN COALESCE("settlementAmount", "amount")
          ELSE "walletAmount"
        END
      ), 0) AS "revenue",
      COALESCE(SUM(
        CASE
          WHEN "operationType" = 'CUSTOMER_DEPOSIT'
            THEN "walletAmount"
          ELSE COALESCE("settlementAmount", "amount")
        END
      ), 0) AS "cost",
      COALESCE(SUM("commission"), 0) AS "profit",
      COUNT(*) AS "operationCount"
    FROM "FinancialTransfer"
    WHERE "shopId" = ${shopId}::uuid
      AND "deletedAt" IS NULL
      AND "status" = 'ACTIVE'
      AND "sourceType" = 'CUSTOMER_TRANSFER'
      AND "operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL')
      AND "createdAt" >= ${range.start}
      AND "createdAt" < ${range.end}
  `;

  const row = rows[0];
  return {
    key: "transfers",
    label: "المحافظ والتحويلات",
    revenue: money(decimalNumber(row?.revenue)),
    cost: money(decimalNumber(row?.cost)),
    profit: money(decimalNumber(row?.profit)),
    count: Number(row?.operationCount ?? 0),
  };
}


export async function getReportDepartmentPerformances(shopId: string, range: FinancialRange) {
  const [pos, repairs, software, transfers] = await Promise.all([
    getPosPerformance(shopId, range),
    getRepairPerformance(shopId, range),
    getSoftwarePerformance(shopId, range),
    getTransferPerformance(shopId, range).catch(() => ({
      key: "transfers" as const,
      label: "المحافظ والتحويلات",
      revenue: 0,
      cost: 0,
      profit: 0,
      count: 0,
    })),
  ]);
  return { pos, repairs, software, transfers };
}
