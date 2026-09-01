import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FinancialTransferType =
  | "CUSTOMER_DEPOSIT"
  | "CUSTOMER_WITHDRAWAL"
  | "WALLET_TOPUP"
  | "WALLET_WITHDRAWAL";

export type WalletRow = {
  id: string;
  name: string;
  currentBalance: Prisma.Decimal;
  monthlyLimit: Prisma.Decimal | null;
  monthlyUsed: Prisma.Decimal;
  defaultDepositCommission: Prisma.Decimal;
  defaultWithdrawalCommission: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
};

export type TransferRow = {
  id: string;
  walletId: string;
  walletName: string;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  operationType: FinancialTransferType;
  amount: Prisma.Decimal;
  commission: Prisma.Decimal;
  status: "ACTIVE" | "VOID";
  notes: string | null;
  createdAt: Date;
  voidedAt: Date | null;
};

export type TransferFilters = {
  walletId?: string;
  operationType?: FinancialTransferType;
  q?: string;
  from?: Date;
  to?: Date;
};

export type CreateWalletInput = {
  name: string;
  openingBalance?: string;
  monthlyLimit?: string;
  defaultDepositCommission?: string;
  defaultWithdrawalCommission?: string;
};

export type CreateTransferInput = {
  walletId: string;
  operationType: FinancialTransferType;
  amount: string;
  commission?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
};

const TRANSFER_TYPES = new Set<FinancialTransferType>([
  "CUSTOMER_DEPOSIT",
  "CUSTOMER_WITHDRAWAL",
  "WALLET_TOPUP",
  "WALLET_WITHDRAWAL",
]);

let tablesReady: Promise<void> | null = null;

function decimal(value: string | number | Prisma.Decimal | null | undefined) {
  return new Prisma.Decimal(String(value ?? 0).replace(",", "."));
}

function nullableText(value?: string) {
  const text = value?.trim();
  return text ? text : null;
}

function normalizePhone(value?: string | null) {
  const text = value?.trim();
  if (!text) return null;
  return text.replace(/[^\d+]/g, "");
}

async function createTables() {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(68119724)");
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FinancialWallet" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
        "monthlyLimit" DECIMAL(14,2),
        "defaultDepositCommission" DECIMAL(8,4) NOT NULL DEFAULT 0,
        "defaultWithdrawalCommission" DECIMAL(8,4) NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP(3)
      )`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialWallet_shopId_name_idx" ON "FinancialWallet"("shopId", "name")`);
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FinancialTransfer" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "walletId" UUID NOT NULL REFERENCES "FinancialWallet"("id") ON DELETE RESTRICT,
        "customerId" UUID REFERENCES "Customer"("id") ON DELETE SET NULL,
        "createdByUserId" UUID,
        "voidedByUserId" UUID,
        "operationType" TEXT NOT NULL,
        "amount" DECIMAL(14,2) NOT NULL,
        "commission" DECIMAL(14,2) NOT NULL DEFAULT 0,
        "customerName" TEXT,
        "customerPhone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "voidedAt" TIMESTAMP(3),
        "deletedAt" TIMESTAMP(3)
      )`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialTransfer_shopId_createdAt_idx" ON "FinancialTransfer"("shopId", "createdAt")`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialTransfer_walletId_createdAt_idx" ON "FinancialTransfer"("walletId", "createdAt")`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialTransfer_shopId_status_idx" ON "FinancialTransfer"("shopId", "status")`);
    }, { timeout: 10_000 });
  } catch {
    throw new Error("تعذر تجهيز قسم التحويلات والمحافظ. يرجى تطبيق تحديث قاعدة البيانات ثم المحاولة مجدداً.");
  }
}

async function ensureTables() {
  if (!tablesReady) {
    tablesReady = createTables().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  await tablesReady;
}

export async function listWallets(shopId: string) {
  await ensureTables();
  return prisma.$queryRaw<WalletRow[]>`
    SELECT
      w."id", w."name", w."currentBalance", w."monthlyLimit",
      w."defaultDepositCommission", w."defaultWithdrawalCommission",
      w."isActive", w."createdAt",
      COALESCE((
        SELECT SUM(t."amount")
        FROM "FinancialTransfer" t
        WHERE t."walletId" = w."id"
          AND t."status" = 'ACTIVE'
          AND t."deletedAt" IS NULL
          AND t."operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL')
          AND t."createdAt" >= date_trunc('month', NOW())
          AND t."createdAt" < date_trunc('month', NOW()) + interval '1 month'
      ), 0) AS "monthlyUsed"
    FROM "FinancialWallet" w
    WHERE w."shopId" = ${shopId}::uuid
      AND w."deletedAt" IS NULL
      AND w."isActive" = TRUE
    ORDER BY w."createdAt" ASC
  `;
}

export async function getStats(shopId: string) {
  await ensureTables();
  const rows = await prisma.$queryRaw<Array<{
    totalBalance: Prisma.Decimal;
    todayCommission: Prisma.Decimal;
    todayDeposits: Prisma.Decimal;
    todayWithdrawals: Prisma.Decimal;
    todayOperations: bigint;
  }>>`
    SELECT
      COALESCE((SELECT SUM(w."currentBalance") FROM "FinancialWallet" w WHERE w."shopId" = ${shopId}::uuid AND w."deletedAt" IS NULL AND w."isActive" = TRUE), 0) AS "totalBalance",
      COALESCE(SUM(t."commission") FILTER (WHERE t."status" = 'ACTIVE'), 0) AS "todayCommission",
      COALESCE(SUM(t."amount") FILTER (WHERE t."status" = 'ACTIVE' AND t."operationType" = 'CUSTOMER_DEPOSIT'), 0) AS "todayDeposits",
      COALESCE(SUM(t."amount") FILTER (WHERE t."status" = 'ACTIVE' AND t."operationType" = 'CUSTOMER_WITHDRAWAL'), 0) AS "todayWithdrawals",
      COUNT(*) FILTER (WHERE t."status" = 'ACTIVE' AND t."operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL')) AS "todayOperations"
    FROM "FinancialTransfer" t
    WHERE t."shopId" = ${shopId}::uuid
      AND t."deletedAt" IS NULL
      AND t."createdAt" >= date_trunc('day', NOW())
      AND t."createdAt" < date_trunc('day', NOW()) + interval '1 day'
  `;
  const row = rows[0];
  return {
    totalBalance: Number(row?.totalBalance ?? 0),
    todayCommission: Number(row?.todayCommission ?? 0),
    todayDeposits: Number(row?.todayDeposits ?? 0),
    todayWithdrawals: Number(row?.todayWithdrawals ?? 0),
    todayOperations: Number(row?.todayOperations ?? 0),
  };
}

export async function listTransfers(shopId: string, filters: TransferFilters = {}) {
  await ensureTables();
  const conditions: Prisma.Sql[] = [
    Prisma.sql`t."shopId" = ${shopId}::uuid`,
    Prisma.sql`t."deletedAt" IS NULL`,
  ];

  if (filters.walletId) conditions.push(Prisma.sql`t."walletId" = ${filters.walletId}::uuid`);
  if (filters.operationType && TRANSFER_TYPES.has(filters.operationType)) {
    conditions.push(Prisma.sql`t."operationType" = ${filters.operationType}`);
  }
  if (filters.from) conditions.push(Prisma.sql`t."createdAt" >= ${filters.from}`);
  if (filters.to) conditions.push(Prisma.sql`t."createdAt" < ${filters.to}`);
  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push(Prisma.sql`(
      COALESCE(t."customerName", '') ILIKE ${pattern}
      OR COALESCE(t."customerPhone", '') ILIKE ${pattern}
      OR t."id"::text ILIKE ${pattern}
      OR w."name" ILIKE ${pattern}
    )`);
  }

  return prisma.$queryRaw<TransferRow[]>(Prisma.sql`
    SELECT
      t."id", t."walletId", w."name" AS "walletName", t."customerId",
      COALESCE(c."name", t."customerName") AS "customerName",
      COALESCE(c."phone", t."customerPhone") AS "customerPhone",
      t."operationType", t."amount", t."commission", t."status",
      t."notes", t."createdAt", t."voidedAt"
    FROM "FinancialTransfer" t
    JOIN "FinancialWallet" w ON w."id" = t."walletId"
    LEFT JOIN "Customer" c ON c."id" = t."customerId" AND c."deletedAt" IS NULL
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY t."createdAt" DESC
    LIMIT 200
  `);
}

export async function createWallet(shopId: string, input: CreateWalletInput) {
  await ensureTables();
  const name = input.name.trim();
  if (!name) throw new Error("اسم المحفظة مطلوب.");

  const openingBalance = decimal(input.openingBalance);
  const monthlyLimit = input.monthlyLimit?.trim() ? decimal(input.monthlyLimit) : null;
  const depositCommission = decimal(input.defaultDepositCommission);
  const withdrawalCommission = decimal(input.defaultWithdrawalCommission);

  if (openingBalance.lt(0)) throw new Error("الرصيد الافتتاحي لا يمكن أن يكون سالباً.");
  if (monthlyLimit?.lte(0)) throw new Error("الحد الشهري يجب أن يكون أكبر من صفر.");
  if (depositCommission.lt(0) || withdrawalCommission.lt(0)) throw new Error("نسبة العمولة لا يمكن أن تكون سالبة.");

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "FinancialWallet"
    WHERE "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND LOWER("name") = LOWER(${name})
    LIMIT 1
  `;
  if (existing[0]) throw new Error("يوجد بالفعل محفظة بهذا الاسم.");

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "FinancialWallet" (
      "shopId", "name", "currentBalance", "monthlyLimit",
      "defaultDepositCommission", "defaultWithdrawalCommission"
    ) VALUES (
      ${shopId}::uuid, ${name}, ${openingBalance}, ${monthlyLimit},
      ${depositCommission}, ${withdrawalCommission}
    )
    RETURNING "id"
  `;
  return rows[0];
}

function balanceDelta(type: FinancialTransferType, amount: Prisma.Decimal) {
  if (type === "CUSTOMER_DEPOSIT" || type === "WALLET_WITHDRAWAL") return amount.negated();
  return amount;
}

export async function createTransfer(shopId: string, userId: string | null, input: CreateTransferInput) {
  await ensureTables();
  if (!TRANSFER_TYPES.has(input.operationType)) throw new Error("نوع العملية غير صحيح.");
  const amount = decimal(input.amount);
  if (amount.lte(0)) throw new Error("المبلغ يجب أن يكون أكبر من صفر.");

  return prisma.$transaction(async (tx) => {
    const wallets = await tx.$queryRaw<Array<{
      id: string;
      currentBalance: Prisma.Decimal;
      defaultDepositCommission: Prisma.Decimal;
      defaultWithdrawalCommission: Prisma.Decimal;
    }>>`
      SELECT "id", "currentBalance", "defaultDepositCommission", "defaultWithdrawalCommission"
      FROM "FinancialWallet"
      WHERE "id" = ${input.walletId}::uuid
        AND "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
        AND "isActive" = TRUE
      FOR UPDATE
    `;
    const wallet = wallets[0];
    if (!wallet) throw new Error("المحفظة غير موجودة.");

    let customerId = input.customerId?.trim() || null;
    let customerName = nullableText(input.customerName);
    let customerPhone = normalizePhone(input.customerPhone);

    if (customerId) {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, shopId, deletedAt: null },
        select: { id: true, name: true, phone: true },
      });
      if (!customer) throw new Error("العميل المحدد غير موجود.");
      customerId = customer.id;
      customerName = customerName || customer.name;
      customerPhone = customerPhone || normalizePhone(customer.phone);
    }

    const isCustomerOperation = input.operationType === "CUSTOMER_DEPOSIT" || input.operationType === "CUSTOMER_WITHDRAWAL";
    let commission = new Prisma.Decimal(0);
    if (isCustomerOperation) {
      if (input.commission?.trim()) {
        commission = decimal(input.commission);
      } else {
        const rate = input.operationType === "CUSTOMER_DEPOSIT"
          ? wallet.defaultDepositCommission
          : wallet.defaultWithdrawalCommission;
        commission = amount.mul(rate).div(100);
      }
    }
    if (commission.lt(0)) throw new Error("العمولة لا يمكن أن تكون سالبة.");

    const delta = balanceDelta(input.operationType, amount);
    const newBalance = decimal(wallet.currentBalance).plus(delta);
    if (newBalance.lt(0)) throw new Error("رصيد المحفظة غير كافٍ لتنفيذ العملية.");

    await tx.$executeRaw`
      UPDATE "FinancialWallet"
      SET "currentBalance" = ${newBalance}, "updatedAt" = NOW()
      WHERE "id" = ${wallet.id}::uuid AND "shopId" = ${shopId}::uuid
    `;

    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "FinancialTransfer" (
        "shopId", "walletId", "customerId", "createdByUserId", "operationType",
        "amount", "commission", "customerName", "customerPhone", "notes"
      ) VALUES (
        ${shopId}::uuid, ${wallet.id}::uuid, ${customerId}::uuid, ${userId}::uuid,
        ${input.operationType}, ${amount}, ${commission}, ${customerName}, ${customerPhone}, ${nullableText(input.notes)}
      )
      RETURNING "id"
    `;
    if (!rows[0]) throw new Error("تعذر تسجيل العملية.");
    return rows[0];
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
}

export async function voidTransfer(shopId: string, id: string, userId: string | null) {
  await ensureTables();
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      walletId: string;
      operationType: FinancialTransferType;
      amount: Prisma.Decimal;
      status: "ACTIVE" | "VOID";
    }>>`
      SELECT "id", "walletId", "operationType", "amount", "status"
      FROM "FinancialTransfer"
      WHERE "id" = ${id}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL
      FOR UPDATE
    `;
    const transfer = rows[0];
    if (!transfer) throw new Error("العملية غير موجودة.");
    if (transfer.status === "VOID") throw new Error("العملية ملغاة بالفعل.");

    const walletRows = await tx.$queryRaw<Array<{ id: string; currentBalance: Prisma.Decimal }>>`
      SELECT "id", "currentBalance"
      FROM "FinancialWallet"
      WHERE "id" = ${transfer.walletId}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL
      FOR UPDATE
    `;
    const wallet = walletRows[0];
    if (!wallet) throw new Error("المحفظة المرتبطة غير موجودة.");

    const reversedBalance = decimal(wallet.currentBalance).minus(balanceDelta(transfer.operationType, transfer.amount));
    if (reversedBalance.lt(0)) throw new Error("لا يمكن إلغاء العملية لأن رصيد المحفظة الحالي لا يكفي لعكسها.");

    await tx.$executeRaw`
      UPDATE "FinancialWallet"
      SET "currentBalance" = ${reversedBalance}, "updatedAt" = NOW()
      WHERE "id" = ${wallet.id}::uuid AND "shopId" = ${shopId}::uuid
    `;
    await tx.$executeRaw`
      UPDATE "FinancialTransfer"
      SET "status" = 'VOID', "voidedAt" = NOW(), "voidedByUserId" = ${userId}::uuid, "updatedAt" = NOW()
      WHERE "id" = ${transfer.id}::uuid AND "shopId" = ${shopId}::uuid
    `;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
}

export const financialTransferService = {
  listWallets,
  getStats,
  listTransfers,
  createWallet,
  createTransfer,
  voidTransfer,
};
