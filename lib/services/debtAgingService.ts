import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export interface DebtAgingSummary {
  current0To30: number;
  days31To60: number;
  days61To90: number;
  over90Days: number;
  total: number;
}

/**
 * Accounts-receivable aging using FIFO allocation:
 * customer payments/credits consume the oldest debit entries first.
 * Only the remaining unpaid portion of each debit is placed into an age bucket.
 */
export async function getDebtAgingSummary(now = new Date()): Promise<DebtAgingSummary> {
  const auth = await requirePermission("debts:manage");

  const rows = await prisma.$queryRaw<Array<{
    current0To30: Prisma.Decimal | number | string;
    days31To60: Prisma.Decimal | number | string;
    days61To90: Prisma.Decimal | number | string;
    over90Days: Prisma.Decimal | number | string;
  }>>`
    WITH active_entries AS (
      SELECT
        "customerId",
        "type",
        "amount",
        "occurredAt",
        "createdAt",
        "id"
      FROM "DebtLedgerEntry"
      WHERE "shopId" = ${auth.shop.id}::uuid
        AND "isReversed" = FALSE
    ),
    credits AS (
      SELECT
        "customerId",
        COALESCE(SUM("amount") FILTER (WHERE "type" IN ('PAYMENT','ADJUSTMENT_CREDIT')), 0) AS total_credit
      FROM active_entries
      GROUP BY "customerId"
    ),
    debits AS (
      SELECT
        e."customerId",
        e."amount",
        e."occurredAt",
        COALESCE(c.total_credit, 0) AS total_credit,
        COALESCE(
          SUM(e."amount") OVER (
            PARTITION BY e."customerId"
            ORDER BY e."occurredAt", e."createdAt", e."id"
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ),
          0
        ) AS prior_debits
      FROM active_entries e
      LEFT JOIN credits c ON c."customerId" = e."customerId"
      WHERE e."type" IN ('DEBT','OPENING_BALANCE','ADJUSTMENT_DEBIT')
    ),
    outstanding AS (
      SELECT
        "occurredAt",
        GREATEST(
          0,
          "amount" - GREATEST(0, LEAST("amount", total_credit - prior_debits))
        ) AS remaining
      FROM debits
    )
    SELECT
      COALESCE(SUM(remaining) FILTER (WHERE "occurredAt" > ${now}::timestamptz - INTERVAL '31 days'), 0) AS "current0To30",
      COALESCE(SUM(remaining) FILTER (WHERE "occurredAt" <= ${now}::timestamptz - INTERVAL '31 days' AND "occurredAt" > ${now}::timestamptz - INTERVAL '61 days'), 0) AS "days31To60",
      COALESCE(SUM(remaining) FILTER (WHERE "occurredAt" <= ${now}::timestamptz - INTERVAL '61 days' AND "occurredAt" > ${now}::timestamptz - INTERVAL '91 days'), 0) AS "days61To90",
      COALESCE(SUM(remaining) FILTER (WHERE "occurredAt" <= ${now}::timestamptz - INTERVAL '91 days'), 0) AS "over90Days"
    FROM outstanding
    WHERE remaining > 0.005
  `;

  const row = rows[0];
  const result = {
    current0To30: Number(row?.current0To30 ?? 0),
    days31To60: Number(row?.days31To60 ?? 0),
    days61To90: Number(row?.days61To90 ?? 0),
    over90Days: Number(row?.over90Days ?? 0),
  };

  return {
    ...result,
    total: result.current0To30 + result.days31To60 + result.days61To90 + result.over90Days,
  };
}
