import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bankAccountService } from "@/lib/services/bankAccountService";
import { cashDrawerService } from "@/lib/services/cashDrawerService";
import { financialTransferService } from "@/lib/services/financialTransferService";

/** Same movement definitions as the reports screen; balances are current, not historical. */
export async function getReportLiquidity(shopId: string, start: Date, end: Date) {
  const [drawer, bank, wallets, rows] = await Promise.all([
    cashDrawerService.getReportSnapshot(shopId, start, end),
    bankAccountService.getReportSnapshot(shopId, start, end),
    financialTransferService.listWallets(shopId),
    prisma.$queryRaw<Array<{ inflow: Prisma.Decimal; outflow: Prisma.Decimal }>>`
      SELECT
        COALESCE(SUM("walletAmount") FILTER (WHERE "status" = 'ACTIVE' AND "operationType" IN ('CUSTOMER_WITHDRAWAL','WALLET_TOPUP')), 0) AS "inflow",
        COALESCE(SUM("walletAmount") FILTER (WHERE "status" = 'ACTIVE' AND "operationType" IN ('CUSTOMER_DEPOSIT','WALLET_WITHDRAWAL')), 0) AS "outflow"
      FROM "FinancialTransfer"
      WHERE "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL
        AND "createdAt" >= ${start} AND "createdAt" < ${end}
    `,
  ]);
  const inflow = Number(rows[0]?.inflow ?? 0);
  const outflow = Number(rows[0]?.outflow ?? 0);
  return {
    drawer,
    bank,
    wallets: {
      currentBalance: wallets.reduce((sum, wallet) => sum + Number(wallet.currentBalance), 0),
      inflow, outflow, netMovement: inflow - outflow,
    },
  };
}
