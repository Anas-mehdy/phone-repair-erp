import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export type DebtEntryType =
  | "DEBT"
  | "PAYMENT"
  | "OPENING_BALANCE"
  | "ADJUSTMENT_DEBIT"
  | "ADJUSTMENT_CREDIT";

export interface DebtSummaryRow {
  customerId: string;
  customerName: string;
  phone: string | null;
  balance: number;
  lastActivityAt: Date | null;
  oldestDebtAt: Date | null;
}

export interface DebtLedgerEntryRow {
  id: string;
  type: DebtEntryType;
  amount: number;
  occurredAt: Date;
  dueAt: Date | null;
  description: string | null;
  reference: string | null;
  paymentMethod: string | null;
  createdByName: string | null;
  isReversed: boolean;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parsePositiveAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("يجب أن يكون المبلغ أكبر من صفر.");
  }
  return Math.round(value * 100) / 100;
}

async function ensureCustomerBelongsToShop(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Customer"
    WHERE "id" = ${customerId}::uuid
      AND "shopId" = ${shopId}::uuid
      AND "deletedAt" IS NULL
    LIMIT 1
  `;
  if (!rows[0]) throw new Error("العميل غير موجود في هذا المتجر.");
}

async function ensureAccount(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "DebtLedgerAccount" ("shopId", "customerId", "updatedAt")
    VALUES (${shopId}::uuid, ${customerId}::uuid, NOW())
    ON CONFLICT ("shopId", "customerId")
    DO UPDATE SET "updatedAt" = NOW()
    RETURNING "id"
  `;
  return rows[0].id;
}

async function getBalanceInTransaction(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
) {
  const rows = await tx.$queryRaw<Array<{ balance: Prisma.Decimal | number | string }>>`
    SELECT COALESCE(SUM(
      CASE
        WHEN "isReversed" THEN 0
        WHEN "type" IN ('DEBT','OPENING_BALANCE','ADJUSTMENT_DEBIT') THEN "amount"
        WHEN "type" IN ('PAYMENT','ADJUSTMENT_CREDIT') THEN -"amount"
        ELSE 0
      END
    ), 0) AS "balance"
    FROM "DebtLedgerEntry"
    WHERE "shopId" = ${shopId}::uuid
      AND "customerId" = ${customerId}::uuid
  `;
  return Number(rows[0]?.balance ?? 0);
}

export async function createDebtEntry(input: {
  customerId: string;
  amount: number;
  type?: "DEBT" | "OPENING_BALANCE";
  occurredAt?: string | null;
  dueAt?: string | null;
  description?: string | null;
  reference?: string | null;
}) {
  const auth = await requirePermission("debts:manage");
  const amount = parsePositiveAmount(input.amount);
  const type = input.type === "OPENING_BALANCE" ? "OPENING_BALANCE" : "DEBT";
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;

  if (Number.isNaN(occurredAt.getTime()) || (dueAt && Number.isNaN(dueAt.getTime()))) {
    throw new Error("تاريخ الحركة غير صالح.");
  }

  await prisma.$transaction(async (tx) => {
    await ensureCustomerBelongsToShop(tx, auth.shop.id, input.customerId);
    const accountId = await ensureAccount(tx, auth.shop.id, input.customerId);

    await tx.$executeRaw`
      INSERT INTO "DebtLedgerEntry" (
        "shopId", "accountId", "customerId", "type", "amount",
        "occurredAt", "dueAt", "description", "reference", "createdByUserId"
      ) VALUES (
        ${auth.shop.id}::uuid,
        ${accountId}::uuid,
        ${input.customerId}::uuid,
        ${type},
        ${amount},
        ${occurredAt},
        ${dueAt},
        ${normalizeOptional(input.description)},
        ${normalizeOptional(input.reference)},
        ${auth.user.id}::uuid
      )
    `;
  });
}

export async function recordDebtPayment(input: {
  customerId: string;
  amount: number;
  occurredAt?: string | null;
  paymentMethod?: string | null;
  description?: string | null;
  reference?: string | null;
}) {
  const auth = await requirePermission("debts:manage");
  const amount = parsePositiveAmount(input.amount);
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) throw new Error("تاريخ التحصيل غير صالح.");

  await prisma.$transaction(async (tx) => {
    await ensureCustomerBelongsToShop(tx, auth.shop.id, input.customerId);
    const accountId = await ensureAccount(tx, auth.shop.id, input.customerId);
    const currentBalance = await getBalanceInTransaction(tx, auth.shop.id, input.customerId);

    if (currentBalance <= 0) throw new Error("لا يوجد رصيد مستحق على هذا العميل.");
    if (amount - currentBalance > 0.005) {
      throw new Error(`المبلغ المدفوع أكبر من الرصيد المستحق (${currentBalance.toFixed(2)}).`);
    }

    await tx.$executeRaw`
      INSERT INTO "DebtLedgerEntry" (
        "shopId", "accountId", "customerId", "type", "amount",
        "occurredAt", "description", "reference", "paymentMethod", "createdByUserId"
      ) VALUES (
        ${auth.shop.id}::uuid,
        ${accountId}::uuid,
        ${input.customerId}::uuid,
        'PAYMENT',
        ${amount},
        ${occurredAt},
        ${normalizeOptional(input.description)},
        ${normalizeOptional(input.reference)},
        ${normalizeOptional(input.paymentMethod)},
        ${auth.user.id}::uuid
      )
    `;
  });
}

export async function getDebtDashboard() {
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
        ) AS "oldestDebtAt"
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
      AND b.balance > 0.005
    ORDER BY b.balance DESC, c."name" ASC
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
    balance: Number(row.balance),
  }));

  return {
    customers,
    totalOutstanding: customers.reduce((sum, row) => sum + row.balance, 0),
    debtorCount: customers.length,
    collectedThisMonth: Number(collectedRows[0]?.total ?? 0),
  };
}

export async function getCustomerDebtLedger(customerId: string) {
  const auth = await requirePermission("debts:manage");

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId: auth.shop.id, deletedAt: null },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (!customer) throw new Error("العميل غير موجود.");

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    type: DebtEntryType;
    amount: Prisma.Decimal | number | string;
    occurredAt: Date;
    dueAt: Date | null;
    description: string | null;
    reference: string | null;
    paymentMethod: string | null;
    createdByName: string | null;
    isReversed: boolean;
  }>>`
    SELECT
      e."id",
      e."type",
      e."amount",
      e."occurredAt",
      e."dueAt",
      e."description",
      e."reference",
      e."paymentMethod",
      u."name" AS "createdByName",
      e."isReversed"
    FROM "DebtLedgerEntry" e
    LEFT JOIN "User" u ON u."id" = e."createdByUserId"
    WHERE e."shopId" = ${auth.shop.id}::uuid
      AND e."customerId" = ${customerId}::uuid
    ORDER BY e."occurredAt" DESC, e."createdAt" DESC
  `;

  const entries: DebtLedgerEntryRow[] = rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));

  const balance = entries.reduce((sum, entry) => {
    if (entry.isReversed) return sum;
    if (["DEBT", "OPENING_BALANCE", "ADJUSTMENT_DEBIT"].includes(entry.type)) return sum + entry.amount;
    return sum - entry.amount;
  }, 0);

  return { customer, entries, balance: Math.max(0, balance) };
}

export const debtLedgerService = {
  createDebtEntry,
  recordDebtPayment,
  getDebtDashboard,
  getCustomerDebtLedger,
};
