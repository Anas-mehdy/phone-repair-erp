import { InvoiceStatus, RepairStatus, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function getTodayRange() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  return {
    startOfToday,
    startOfTomorrow,
  };
}

export async function getDashboardMetrics(shopId: string) {
  const { startOfToday, startOfTomorrow } = getTodayRange();

  const [
    openRepairOrdersCount,
    readyForDeliveryCount,
    repairOrdersCreatedToday,
    deliveredToday,
    salesTodayAggregate,
    unpaidInvoicesCount,
    unpaidInvoicesAggregate,
    inventoryItems,
  ] = await Promise.all([
    prisma.repairOrder.count({
      where: {
        shopId,
        deletedAt: null,
        status: {
          notIn: [RepairStatus.DELIVERED, RepairStatus.CANCELLED],
        },
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        deletedAt: null,
        status: RepairStatus.DONE,
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        deletedAt: null,
        createdAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        deletedAt: null,
        deliveredAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    }),
    prisma.sale.aggregate({
      where: {
        shopId,
        deletedAt: null,
        status: SaleStatus.COMPLETED,
        soldAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
      _sum: {
        total: true,
      },
    }),
    prisma.invoice.count({
      where: {
        shopId,
        deletedAt: null,
        status: {
          in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID],
        },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        shopId,
        deletedAt: null,
        status: {
          in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID],
        },
      },
      _sum: {
        balanceDue: true,
      },
    }),
    prisma.inventoryItem.findMany({
      where: {
        shopId,
        deletedAt: null,
      },
      select: {
        quantity: true,
        reorderLevel: true,
      },
    }),
  ]);

  return {
    openRepairOrdersCount,
    readyForDeliveryCount,
    repairOrdersCreatedToday,
    deliveredToday,
    salesRevenueToday: salesTodayAggregate._sum.total ?? 0,
    unpaidInvoicesCount,
    unpaidBalanceTotal: unpaidInvoicesAggregate._sum.balanceDue ?? 0,
    lowStockItemsCount: inventoryItems.filter(
      (item) => item.quantity <= item.reorderLevel,
    ).length,
  };
}

export async function getRecentActivity(shopId: string) {
  const [repairOrders, sales, invoices] = await Promise.all([
    prisma.repairOrder.findMany({
      where: {
        shopId,
        deletedAt: null,
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.sale.findMany({
      where: {
        shopId,
        deletedAt: null,
      },
      include: {
        customer: true,
      },
      orderBy: {
        soldAt: "desc",
      },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        shopId,
        deletedAt: null,
      },
      include: {
        customer: true,
      },
      orderBy: {
        issuedAt: "desc",
      },
      take: 5,
    }),
  ]);

  return {
    repairOrders,
    sales,
    invoices,
  };
}

export const dashboardService = {
  getDashboardMetrics,
  getRecentActivity,
};
