import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayUtcBoundsForTimeZone } from "@/lib/timezone";
import { getShopTimeZone } from "@/lib/shop-timezone";

export type TodayTransferOperation = {
  id: string;
  walletName: string;
  userName: string;
  customerName: string | null;
  operationType: "CUSTOMER_DEPOSIT" | "CUSTOMER_WITHDRAWAL";
  amount: number;
  commission: number;
  createdAt: Date;
};

export async function getTransferDailyData(shopId: string) {
  const timeZone = await getShopTimeZone(shopId);
  const { start, end } = dayUtcBoundsForTimeZone(new Date(), timeZone);

  const [balanceRows, operationRows] = await Promise.all([
    prisma.$queryRaw<Array<{ totalBalance: Prisma.Decimal | number | string }>>`
      SELECT COALESCE(SUM("currentBalance"), 0) AS "totalBalance"
      FROM "FinancialWallet"
      WHERE "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
        AND "isActive" = TRUE
    `,
    prisma.$queryRaw<Array<{
      id: string;
      walletName: string;
      userName: string | null;
      customerName: string | null;
      operationType: "CUSTOMER_DEPOSIT" | "CUSTOMER_WITHDRAWAL";
      amount: Prisma.Decimal | number | string;
      commission: Prisma.Decimal | number | string;
      createdAt: Date;
    }>>`
      SELECT
        t."id",
        w."name" AS "walletName",
        COALESCE(u."name", 'غير معروف') AS "userName",
        COALESCE(c."name", t."customerName") AS "customerName",
        t."operationType",
        t."amount",
        t."commission",
        t."createdAt"
      FROM "FinancialTransfer" t
      JOIN "FinancialWallet" w ON w."id" = t."walletId"
      LEFT JOIN "User" u ON u."id" = t."createdByUserId"
      LEFT JOIN "Customer" c ON c."id" = t."customerId" AND c."deletedAt" IS NULL
      WHERE t."shopId" = ${shopId}::uuid
        AND t."deletedAt" IS NULL
        AND t."status" = 'ACTIVE'
        AND t."operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL')
        AND t."createdAt" >= ${start}
        AND t."createdAt" < ${end}
      ORDER BY t."createdAt" DESC
    `,
  ]);

  const operations: TodayTransferOperation[] = operationRows.map((row) => ({
    id: row.id,
    walletName: row.walletName,
    userName: row.userName || "غير معروف",
    customerName: row.customerName,
    operationType: row.operationType,
    amount: Number(row.amount ?? 0),
    commission: Number(row.commission ?? 0),
    createdAt: row.createdAt,
  }));

  const todayDeposits = operations
    .filter((row) => row.operationType === "CUSTOMER_DEPOSIT")
    .reduce((sum, row) => sum + row.amount, 0);
  const todayWithdrawals = operations
    .filter((row) => row.operationType === "CUSTOMER_WITHDRAWAL")
    .reduce((sum, row) => sum + row.amount, 0);
  const todayCommission = operations.reduce((sum, row) => sum + row.commission, 0);

  return {
    timeZone,
    operations,
    stats: {
      totalBalance: Number(balanceRows[0]?.totalBalance ?? 0),
      todayCommission,
      todayDeposits,
      todayWithdrawals,
      todayOperations: operations.length,
    },
  };
}
