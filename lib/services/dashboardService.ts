import { InvoiceStatus, RepairStatus, SaleStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { softwareServiceService } from "@/lib/services/softwareServiceService";

function getTodayRange() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  return { startOfToday, startOfTomorrow };
}

export async function getDashboardMetrics(shopId: string) {
  const { startOfToday, startOfTomorrow } = getTodayRange();

  const [
    openRepairOrdersCount,
    readyForDeliveryCount,
    repairOrdersCreatedToday,
    deliveredToday,
    salesTodayAggregate,
    softwareSalesToday,
    unpaidInvoicesAggregate,
    inventoryItems,
    debtRows,
  ] = await Promise.all([
    prisma.repairOrder.count({
      where: {
        shopId,
        deletedAt: null,
        status: { notIn: [RepairStatus.DELIVERED, RepairStatus.CANCELLED] },
      },
    }),
    prisma.repairOrder.count({
      where: { shopId, deletedAt: null, status: RepairStatus.DONE },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        deletedAt: null,
        createdAt: { gte: startOfToday, lt: startOfTomorrow },
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        deletedAt: null,
        deliveredAt: { gte: startOfToday, lt: startOfTomorrow },
      },
    }),
    prisma.sale.aggregate({
      where: {
        shopId,
        deletedAt: null,
        status: SaleStatus.COMPLETED,
        soldAt: { gte: startOfToday, lt: startOfTomorrow },
      },
      _sum: { total: true },
    }),
    softwareServiceService.getTodaySalesTotal(shopId).catch(() => 0),
    prisma.invoice.aggregate({
      where: {
        shopId,
        deletedAt: null,
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
      },
      _count: { id: true },
      _sum: { balanceDue: true },
    }),
    prisma.inventoryItem.findMany({
      where: { shopId, deletedAt: null },
      select: { quantity: true, reorderLevel: true },
    }),
    prisma.$queryRaw<Array<{ totalOutstanding: Prisma.Decimal | number | string }>>`
      WITH balances AS (
        SELECT
          a."customerId",
          COALESCE(SUM(
            CASE
              WHEN e."isReversed" THEN 0
              WHEN e."type" IN ('DEBT','OPENING_BALANCE','ADJUSTMENT_DEBIT') THEN e."amount"
              WHEN e."type" IN ('PAYMENT','ADJUSTMENT_CREDIT') THEN -e."amount"
              ELSE 0
            END
          ), 0) AS balance
        FROM "DebtLedgerAccount" a
        LEFT JOIN "DebtLedgerEntry" e ON e."accountId" = a."id"
        WHERE a."shopId" = ${shopId}::uuid
        GROUP BY a."customerId"
      )
      SELECT COALESCE(SUM(GREATEST(balance, 0)), 0) AS "totalOutstanding"
      FROM balances
    `,
  ]);

  return {
    openRepairOrdersCount,
    readyForDeliveryCount,
    repairOrdersCreatedToday,
    deliveredToday,
    salesRevenueToday: salesTodayAggregate._sum.total ?? 0,
    softwareSalesToday,
    unpaidInvoicesCount: unpaidInvoicesAggregate._count.id ?? 0,
    unpaidBalanceTotal: unpaidInvoicesAggregate._sum.balanceDue ?? 0,
    totalDebtOutstanding: Number(debtRows[0]?.totalOutstanding ?? 0),
    lowStockItemsCount: inventoryItems.filter(
      (item) => item.quantity <= item.reorderLevel,
    ).length,
  };
}

export async function getRecentActivity(shopId: string) {
  const [repairOrders, sales, invoices] = await Promise.all([
    prisma.repairOrder.findMany({
      where: { shopId, deletedAt: null },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.sale.findMany({
      where: { shopId, deletedAt: null },
      include: { customer: true },
      orderBy: { soldAt: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { shopId, deletedAt: null },
      include: { customer: true },
      orderBy: { issuedAt: "desc" },
      take: 5,
    }),
  ]);

  return { repairOrders, sales, invoices };
}

export const dashboardService = {
  getDashboardMetrics,
  getRecentActivity,
};
