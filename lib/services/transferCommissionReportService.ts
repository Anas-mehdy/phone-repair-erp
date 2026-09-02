import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { financialTransferService } from "@/lib/services/financialTransferService";

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getTransferCommissionReportSummary(shopId: string, start: Date, end: Date) {
  // FinancialTransfer is a runtime-managed table. Ensure it exists and legacy rows are backfilled first.
  await financialTransferService.listWallets(shopId);

  const rows = await prisma.$queryRaw<Array<{
    totalProfit: Prisma.Decimal;
    operationCount: bigint;
  }>>`
    SELECT
      COALESCE(SUM("commission"), 0) AS "totalProfit",
      COUNT(*) AS "operationCount"
    FROM "FinancialTransfer"
    WHERE "shopId" = ${shopId}::uuid
      AND "deletedAt" IS NULL
      AND "status" = 'ACTIVE'
      AND "sourceType" = 'CUSTOMER_TRANSFER'
      AND "operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL')
      AND "commission" > 0
      AND "createdAt" >= ${start}
      AND "createdAt" < ${end}
  `;

  const row = rows[0];
  return {
    totalProfit: money(Number(row?.totalProfit ?? 0)),
    operationCount: Number(row?.operationCount ?? 0),
  };
}
