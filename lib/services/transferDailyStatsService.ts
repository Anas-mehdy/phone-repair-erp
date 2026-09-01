import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COUNTRY_TIME_ZONES: Record<string, string> = {
  SA: "Asia/Riyadh",
  EG: "Africa/Cairo",
  AE: "Asia/Dubai",
  KW: "Asia/Kuwait",
  QA: "Asia/Qatar",
  BH: "Asia/Bahrain",
  OM: "Asia/Muscat",
  JO: "Asia/Amman",
  IQ: "Asia/Baghdad",
  SY: "Asia/Damascus",
  PS: "Asia/Hebron",
  YE: "Asia/Aden",
  LB: "Asia/Beirut",
  LY: "Africa/Tripoli",
  TN: "Africa/Tunis",
  DZ: "Africa/Algiers",
  MA: "Africa/Casablanca",
  SD: "Africa/Khartoum",
  MR: "Africa/Nouakchott",
  SO: "Africa/Mogadishu",
  DJ: "Africa/Djibouti",
  KM: "Indian/Comoro",
  TR: "Europe/Istanbul",
  US: "America/New_York",
};

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
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, deletedAt: null },
    select: { countryCode: true },
  });

  const countryCode = shop?.countryCode?.toUpperCase() || "US";
  const timeZone = COUNTRY_TIME_ZONES[countryCode] || "UTC";

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
        AND t."createdAt" >= ((date_trunc('day', NOW() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone}) AT TIME ZONE 'UTC')
        AND t."createdAt" < (((date_trunc('day', NOW() AT TIME ZONE ${timeZone}) + interval '1 day') AT TIME ZONE ${timeZone}) AT TIME ZONE 'UTC')
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
