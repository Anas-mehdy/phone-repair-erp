import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { bankAccountService } from "@/lib/services/bankAccountService";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { electronicServiceProviderService } from "@/lib/services/electronicServiceProviderService";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { getInventoryDamageReportSummary } from "@/lib/services/inventoryDamageReportService";
import {
  getReportDepartmentPerformances,
  type ReportDepartmentPerformance,
} from "@/lib/services/reportDepartmentPerformanceService";
import { reportService, type FinancialRange } from "@/lib/services/reportService";

export type { ReportDepartmentPerformance } from "@/lib/services/reportDepartmentPerformanceService";

export type ReportDashboardData = {
  baseReport: Awaited<ReturnType<typeof reportService.getFinancialReport>>;
  summary: {
    sales: number;
    directCosts: number;
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  departments: Record<ReportDepartmentPerformance["key"], ReportDepartmentPerformance>;
  electronicProviderTopUps: number;
  balances: {
    drawer: number;
    wallets: number;
    banks: number;
    electronicProviders: number;
    liquidity: number;
    inventory: number;
  };
  obligations: {
    debts: number;
    supplierPurchaseDebt: number;
    expenses: number;
    expenseCount: number;
    damages: number;
    damageCount: number;
  };
};

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined) {
  return value == null ? 0 : Number(value);
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getReportDashboard(shopId: string, range: FinancialRange): Promise<ReportDashboardData> {
  const [
    baseReport,
    damages,
    wallets,
    bankAccounts,
    drawer,
    providerOverview,
    departmentRows,
    expenseAggregate,
    supplierPurchaseAggregate,
    providerTopUpRows,
    currentDebtRows,
  ] = await Promise.all([
    reportService.getFinancialReport(shopId, range),
    getInventoryDamageReportSummary(shopId, range.start, range.end),
    financialTransferService.listWallets(shopId).catch(() => []),
    bankAccountService.listAccounts(shopId, { includeInactive: true }).catch(() => []),
    cashDrawerService.getSnapshot(shopId, 1).catch(() => null),
    electronicServiceProviderService.getOverview(shopId).catch(() => null),
    getReportDepartmentPerformances(shopId, range),
    prisma.expense.aggregate({
      where: {
        shopId,
        deletedAt: null,
        spentAt: { gte: range.start, lt: range.end },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.purchaseInvoice.aggregate({
      where: {
        shopId,
        status: "POSTED",
        deletedAt: null,
      },
      _sum: { balanceDue: true },
    }),
    prisma.$queryRaw<Array<{ total: Prisma.Decimal }>>`
      SELECT COALESCE(SUM("amount"), 0) AS "total"
      FROM "ElectronicServiceProviderMovement"
      WHERE "shopId" = ${shopId}::uuid
        AND "type" = 'TOP_UP'
        AND "direction" = 'IN'
        AND "createdAt" >= ${range.start}
        AND "createdAt" < ${range.end}
    `,
    prisma.$queryRaw<Array<{ totalOutstanding: Prisma.Decimal }>>`
      WITH balances AS (
        SELECT
          a."customerId",
          COALESCE(SUM(
            CASE
              WHEN e."isReversed" THEN 0
              WHEN e."type" IN ('DEBT', 'OPENING_BALANCE', 'ADJUSTMENT_DEBIT') THEN e."amount"
              WHEN e."type" IN ('PAYMENT', 'ADJUSTMENT_CREDIT') THEN -e."amount"
              ELSE 0
            END
          ), 0) AS balance,
          COUNT(e."id") FILTER (WHERE e."isReversed" = FALSE) AS "activeEntryCount"
        FROM "DebtLedgerAccount" a
        LEFT JOIN "DebtLedgerEntry" e ON e."accountId" = a."id"
        WHERE a."shopId" = ${shopId}::uuid
        GROUP BY a."customerId"
      )
      SELECT COALESCE(SUM(GREATEST(b.balance, 0)), 0) AS "totalOutstanding"
      FROM balances b
      JOIN "Customer" c ON c."id" = b."customerId"
      WHERE c."deletedAt" IS NULL
        AND b."activeEntryCount" > 0
        AND b.balance > 0.005
    `,
  ]);

  const electronic: ReportDepartmentPerformance = {
    key: "electronic",
    label: "الخدمات الإلكترونية",
    revenue: baseReport.metrics.electronicServiceRevenue,
    cost: baseReport.metrics.electronicServiceCost,
    profit: baseReport.metrics.electronicServiceProfit,
    count: baseReport.counts.electronicServices,
  };

  const expenseTotal = money(decimalNumber(expenseAggregate._sum.amount));
  const expenseCount = expenseAggregate._count._all;
  const supplierPurchaseDebt = money(Math.max(0, decimalNumber(supplierPurchaseAggregate._sum.balanceDue)));
  const electronicProviderTopUps = money(decimalNumber(providerTopUpRows[0]?.total));
  const currentCustomerDebt = money(Math.max(0, decimalNumber(currentDebtRows[0]?.totalOutstanding)));
  const grossProfit = money(baseReport.metrics.grossProfit + departmentRows.transfers.profit);
  const netProfit = money(grossProfit - expenseTotal);
  const profitBase = baseReport.metrics.netRevenueBeforeTax + departmentRows.transfers.profit;
  const profitMargin = profitBase > 0 ? money((netProfit / profitBase) * 100) : 0;

  const walletBalance = money(wallets.reduce((sum, wallet) => sum + decimalNumber(wallet.currentBalance), 0));
  const bankBalance = money(bankAccounts.reduce((sum, account) => sum + decimalNumber(account.currentBalance), 0));
  const drawerBalance = money(drawer?.currentBalance ?? 0);
  const electronicProviders = money(providerOverview?.stats.totalBalance ?? 0);
  const liquidity = money(drawerBalance + walletBalance + bankBalance);

  return {
    baseReport,
    summary: {
      sales: baseReport.metrics.grossRevenue,
      directCosts: baseReport.metrics.directCosts,
      grossProfit,
      netProfit,
      profitMargin,
    },
    departments: {
      repairs: departmentRows.repairs,
      pos: departmentRows.pos,
      electronic,
      software: departmentRows.software,
      transfers: departmentRows.transfers,
    },
    electronicProviderTopUps,
    balances: {
      drawer: drawerBalance,
      wallets: walletBalance,
      banks: bankBalance,
      electronicProviders,
      liquidity,
      inventory: baseReport.metrics.inventoryValue,
    },
    obligations: {
      debts: currentCustomerDebt,
      supplierPurchaseDebt,
      expenses: expenseTotal,
      expenseCount,
      damages: damages.totalValue,
      damageCount: damages.movementCount,
    },
  };
}

export const reportDashboardService = { getReportDashboard };
