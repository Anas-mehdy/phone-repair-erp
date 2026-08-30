import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

/**
 * Dashboard query that keeps settled customer ledgers visible as history.
 * Only positive balances contribute to outstanding totals and debtor count.
 */
export async function getDebtDashboardWithHistory() {
  const auth = await requirePermission("debts:manage");

  const rows = await prisma.$queryRaw<Array<{
    customerId: string;
    customerName: string;
    phone: string | null;
    balance: Prisma.Decimal | number | string;
    lastActivityAt: Date | null;
    oldestDebtAt: Date | null;
  }>>`
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
        ), 0) AS balance,
        MAX(e."occurredAt") FILTER (WHERE e."isReversed" = FALSE) AS "lastActivityAt",
        MIN(e."occurredAt") FILTER (
          WHERE e."isReversed" = FALSE
            AND e."type" IN ('DEBT','OPENING_BALANCE','ADJUSTMENT_DEBIT')
        ) AS "oldestDebtAt",
        COUNT(e."id") FILTER (WHERE e."isReversed" = FALSE) AS "activeEntryCount"
      FROM "DebtLedgerAccount" a
      LEFT JOIN "DebtLedgerEntry" e ON e."accountId" = a."id"
      WHERE a."shopId" = ${auth.shop.id}::uuid
      GROUP BY a."customerId"
    )
    SELECT
      c."id" AS "customerId",
      c."name" AS "customerName",
      c."phone" AS "phone",
      b.balance,
      b."lastActivityAt",
      b."oldestDebtAt"
    FROM balances b
    JOIN "Customer" c ON c."id" = b."customerId"
    WHERE c."deletedAt" IS NULL
      AND b."activeEntryCount" > 0
    ORDER BY
      (b.balance > 0.005) DESC,
      b.balance DESC,
      b."lastActivityAt" DESC NULLS LAST,
      c."name" ASC
  `;

  const collectedRows = await prisma.$queryRaw<Array<{ total: Prisma.Decimal | number | string }>>`
    SELECT COALESCE(SUM("amount"), 0) AS total
    FROM "DebtLedgerEntry"
    WHERE "shopId" = ${auth.shop.id}::uuid
      AND "type" = 'PAYMENT'
      AND "isReversed" = FALSE
      AND "occurredAt" >= date_trunc('month', NOW())
  `;

  const customers = rows.map((row) => ({
    ...row,
    balance: Math.max(0, Number(row.balance)),
  }));

  const openDebts = customers.filter((row) => row.balance > 0.005);

  return {
    customers,
    totalOutstanding: openDebts.reduce((sum, row) => sum + row.balance, 0),
    debtorCount: openDebts.length,
    collectedThisMonth: Number(collectedRows[0]?.total ?? 0),
  };
}
