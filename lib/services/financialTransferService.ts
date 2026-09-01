import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FinancialTransferType =
  | "CUSTOMER_DEPOSIT"
  | "CUSTOMER_WITHDRAWAL"
  | "WALLET_TOPUP"
  | "WALLET_WITHDRAWAL";
export type CommissionMode = "DEDUCTED" | "ADDED" | "NONE";

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
  walletAmount: Prisma.Decimal;
  commission: Prisma.Decimal;
  commissionMode: CommissionMode;
  isDeferred: boolean;
  debtEntryId: string | null;
  status: "ACTIVE" | "VOID";
  notes: string | null;
  createdAt: Date;
  voidedAt: Date | null;
};

export type TransferFilters = { walletId?: string; operationType?: FinancialTransferType; q?: string; from?: Date; to?: Date };
export type CreateWalletInput = { name: string; openingBalance?: string; monthlyLimit?: string; defaultDepositCommission?: string; defaultWithdrawalCommission?: string };
export type CreateTransferInput = {
  walletId: string;
  operationType: FinancialTransferType;
  amount: string;
  commission?: string;
  commissionMode?: CommissionMode;
  isDeferred?: boolean;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
};

const TRANSFER_TYPES = new Set<FinancialTransferType>(["CUSTOMER_DEPOSIT", "CUSTOMER_WITHDRAWAL", "WALLET_TOPUP", "WALLET_WITHDRAWAL"]);
const COMMISSION_MODES = new Set<CommissionMode>(["DEDUCTED", "ADDED", "NONE"]);
let tablesReady: Promise<void> | null = null;

function decimal(value: string | number | Prisma.Decimal | null | undefined) { return new Prisma.Decimal(String(value ?? 0).replace(",", ".")); }
function nullableText(value?: string) { const text = value?.trim(); return text ? text : null; }
function normalizePhone(value?: string | null) { const text = value?.trim(); return text ? text.replace(/[^\d+]/g, "") : null; }

async function createTables() {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(68119724)");
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FinancialWallet" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL, "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0, "monthlyLimit" DECIMAL(14,2),
        "defaultDepositCommission" DECIMAL(8,4) NOT NULL DEFAULT 0, "defaultWithdrawalCommission" DECIMAL(8,4) NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3)
      )`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialWallet_shopId_name_idx" ON "FinancialWallet"("shopId", "name")`);
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "FinancialTransfer" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "walletId" UUID NOT NULL REFERENCES "FinancialWallet"("id") ON DELETE RESTRICT, "customerId" UUID REFERENCES "Customer"("id") ON DELETE SET NULL,
        "createdByUserId" UUID, "voidedByUserId" UUID, "operationType" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL,
        "walletAmount" DECIMAL(14,2), "commission" DECIMAL(14,2) NOT NULL DEFAULT 0, "commissionMode" TEXT NOT NULL DEFAULT 'ADDED',
        "isDeferred" BOOLEAN NOT NULL DEFAULT FALSE, "debtEntryId" UUID, "customerName" TEXT, "customerPhone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE', "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "voidedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3)
      )`);
      await tx.$executeRawUnsafe(`ALTER TABLE "FinancialTransfer" ADD COLUMN IF NOT EXISTS "walletAmount" DECIMAL(14,2)`);
      await tx.$executeRawUnsafe(`ALTER TABLE "FinancialTransfer" ADD COLUMN IF NOT EXISTS "commissionMode" TEXT NOT NULL DEFAULT 'ADDED'`);
      await tx.$executeRawUnsafe(`ALTER TABLE "FinancialTransfer" ADD COLUMN IF NOT EXISTS "isDeferred" BOOLEAN NOT NULL DEFAULT FALSE`);
      await tx.$executeRawUnsafe(`ALTER TABLE "FinancialTransfer" ADD COLUMN IF NOT EXISTS "debtEntryId" UUID`);
      await tx.$executeRawUnsafe(`UPDATE "FinancialTransfer" SET "walletAmount" = "amount" WHERE "walletAmount" IS NULL`);
      await tx.$executeRawUnsafe(`ALTER TABLE "FinancialTransfer" ALTER COLUMN "walletAmount" SET NOT NULL`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialTransfer_shopId_createdAt_idx" ON "FinancialTransfer"("shopId", "createdAt")`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialTransfer_walletId_createdAt_idx" ON "FinancialTransfer"("walletId", "createdAt")`);
      await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "FinancialTransfer_shopId_status_idx" ON "FinancialTransfer"("shopId", "status")`);
    }, { timeout: 10_000 });
  } catch {
    throw new Error("تعذر تجهيز قسم التحويلات والمحافظ. يرجى تطبيق تحديث قاعدة البيانات ثم المحاولة مجدداً.");
  }
}

async function ensureTables() {
  if (!tablesReady) tablesReady = createTables().catch((error) => { tablesReady = null; throw error; });
  await tablesReady;
}

export async function listWallets(shopId: string) {
  await ensureTables();
  return prisma.$queryRaw<WalletRow[]>`
    SELECT w."id", w."name", w."currentBalance", w."monthlyLimit", w."defaultDepositCommission", w."defaultWithdrawalCommission", w."isActive", w."createdAt",
      COALESCE((SELECT SUM(t."amount") FROM "FinancialTransfer" t WHERE t."walletId" = w."id" AND t."status" = 'ACTIVE' AND t."deletedAt" IS NULL
        AND t."operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL') AND t."createdAt" >= date_trunc('month', NOW())
        AND t."createdAt" < date_trunc('month', NOW()) + interval '1 month'), 0) AS "monthlyUsed"
    FROM "FinancialWallet" w
    WHERE w."shopId" = ${shopId}::uuid AND w."deletedAt" IS NULL AND w."isActive" = TRUE ORDER BY w."createdAt" ASC
  `;
}

export async function getStats(shopId: string) {
  await ensureTables();
  const rows = await prisma.$queryRaw<Array<{ totalBalance: Prisma.Decimal; todayCommission: Prisma.Decimal; todayDeposits: Prisma.Decimal; todayWithdrawals: Prisma.Decimal; todayOperations: bigint }>>`
    SELECT
      COALESCE((SELECT SUM(w."currentBalance") FROM "FinancialWallet" w WHERE w."shopId" = ${shopId}::uuid AND w."deletedAt" IS NULL AND w."isActive" = TRUE), 0) AS "totalBalance",
      COALESCE(SUM(t."commission") FILTER (WHERE t."status" = 'ACTIVE'), 0) AS "todayCommission",
      COALESCE(SUM(t."amount") FILTER (WHERE t."status" = 'ACTIVE' AND t."operationType" = 'CUSTOMER_DEPOSIT'), 0) AS "todayDeposits",
      COALESCE(SUM(t."amount") FILTER (WHERE t."status" = 'ACTIVE' AND t."operationType" = 'CUSTOMER_WITHDRAWAL'), 0) AS "todayWithdrawals",
      COUNT(*) FILTER (WHERE t."status" = 'ACTIVE' AND t."operationType" IN ('CUSTOMER_DEPOSIT', 'CUSTOMER_WITHDRAWAL')) AS "todayOperations"
    FROM "FinancialTransfer" t
    WHERE t."shopId" = ${shopId}::uuid AND t."deletedAt" IS NULL AND t."createdAt" >= date_trunc('day', NOW()) AND t."createdAt" < date_trunc('day', NOW()) + interval '1 day'
  `;
  const row = rows[0];
  return { totalBalance: Number(row?.totalBalance ?? 0), todayCommission: Number(row?.todayCommission ?? 0), todayDeposits: Number(row?.todayDeposits ?? 0), todayWithdrawals: Number(row?.todayWithdrawals ?? 0), todayOperations: Number(row?.todayOperations ?? 0) };
}

export async function listTransfers(shopId: string, filters: TransferFilters = {}) {
  await ensureTables();
  const conditions: Prisma.Sql[] = [Prisma.sql`t."shopId" = ${shopId}::uuid`, Prisma.sql`t."deletedAt" IS NULL`];
  if (filters.walletId) conditions.push(Prisma.sql`t."walletId" = ${filters.walletId}::uuid`);
  if (filters.operationType && TRANSFER_TYPES.has(filters.operationType)) conditions.push(Prisma.sql`t."operationType" = ${filters.operationType}`);
  if (filters.from) conditions.push(Prisma.sql`t."createdAt" >= ${filters.from}`);
  if (filters.to) conditions.push(Prisma.sql`t."createdAt" < ${filters.to}`);
  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push(Prisma.sql`(COALESCE(t."customerName", '') ILIKE ${pattern} OR COALESCE(t."customerPhone", '') ILIKE ${pattern} OR t."id"::text ILIKE ${pattern} OR w."name" ILIKE ${pattern})`);
  }
  return prisma.$queryRaw<TransferRow[]>(Prisma.sql`
    SELECT t."id", t."walletId", w."name" AS "walletName", t."customerId", COALESCE(c."name", t."customerName") AS "customerName",
      COALESCE(c."phone", t."customerPhone") AS "customerPhone", t."operationType", t."amount", t."walletAmount", t."commission", t."commissionMode",
      t."isDeferred", t."debtEntryId", t."status", t."notes", t."createdAt", t."voidedAt"
    FROM "FinancialTransfer" t JOIN "FinancialWallet" w ON w."id" = t."walletId"
    LEFT JOIN "Customer" c ON c."id" = t."customerId" AND c."deletedAt" IS NULL
    WHERE ${Prisma.join(conditions, " AND ")} ORDER BY t."createdAt" DESC LIMIT 200
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
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "FinancialWallet" WHERE "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND LOWER("name") = LOWER(${name}) LIMIT 1`;
  if (existing[0]) throw new Error("يوجد بالفعل محفظة بهذا الاسم.");
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "FinancialWallet" ("shopId", "name", "currentBalance", "monthlyLimit", "defaultDepositCommission", "defaultWithdrawalCommission")
    VALUES (${shopId}::uuid, ${name}, ${openingBalance}, ${monthlyLimit}, ${depositCommission}, ${withdrawalCommission}) RETURNING "id"
  `;
  return rows[0];
}

function walletMovementAmount(type: FinancialTransferType, amount: Prisma.Decimal, commission: Prisma.Decimal, mode: CommissionMode) {
  if (type === "CUSTOMER_DEPOSIT" && mode === "DEDUCTED") return amount.minus(commission);
  if (type === "CUSTOMER_WITHDRAWAL" && mode === "ADDED") return amount.plus(commission);
  return amount;
}
function balanceDelta(type: FinancialTransferType, walletAmount: Prisma.Decimal) { return type === "CUSTOMER_DEPOSIT" || type === "WALLET_WITHDRAWAL" ? walletAmount.negated() : walletAmount; }
function customerCharge(amount: Prisma.Decimal, commission: Prisma.Decimal, mode: CommissionMode) { return mode === "ADDED" ? amount.plus(commission) : amount; }

async function createLinkedDebt(tx: Prisma.TransactionClient, shopId: string, customerId: string, userId: string | null, amount: Prisma.Decimal, transferId: string) {
  const accounts = await tx.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "DebtLedgerAccount" ("shopId", "customerId", "updatedAt") VALUES (${shopId}::uuid, ${customerId}::uuid, NOW())
    ON CONFLICT ("shopId", "customerId") DO UPDATE SET "updatedAt" = NOW() RETURNING "id"
  `;
  const accountId = accounts[0]?.id;
  if (!accountId) throw new Error("تعذر فتح حساب الدين للعميل.");
  const entries = await tx.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "DebtLedgerEntry" ("shopId", "accountId", "customerId", "type", "amount", "occurredAt", "description", "reference", "createdByUserId")
    VALUES (${shopId}::uuid, ${accountId}::uuid, ${customerId}::uuid, 'DEBT', ${amount}, NOW(), 'تحويل مالي آجل', ${`TRANSFER:${transferId}`}, ${userId}::uuid) RETURNING "id"
  `;
  if (!entries[0]) throw new Error("تعذر تسجيل الدين المرتبط بالتحويل.");
  return entries[0].id;
}

export async function createTransfer(shopId: string, userId: string | null, input: CreateTransferInput) {
  await ensureTables();
  if (!TRANSFER_TYPES.has(input.operationType)) throw new Error("نوع العملية غير صحيح.");
  const amount = decimal(input.amount);
  if (amount.lte(0)) throw new Error("المبلغ يجب أن يكون أكبر من صفر.");
  const isCustomerOperation = input.operationType === "CUSTOMER_DEPOSIT" || input.operationType === "CUSTOMER_WITHDRAWAL";
  const commissionMode: CommissionMode = isCustomerOperation && input.commissionMode && COMMISSION_MODES.has(input.commissionMode) ? input.commissionMode : isCustomerOperation ? "ADDED" : "NONE";
  if (input.isDeferred && input.operationType !== "CUSTOMER_DEPOSIT") throw new Error("الآجل متاح لعمليات الإيداع للعميل فقط.");

  return prisma.$transaction(async (tx) => {
    const wallets = await tx.$queryRaw<Array<{ id: string; currentBalance: Prisma.Decimal; defaultDepositCommission: Prisma.Decimal; defaultWithdrawalCommission: Prisma.Decimal }>>`
      SELECT "id", "currentBalance", "defaultDepositCommission", "defaultWithdrawalCommission" FROM "FinancialWallet"
      WHERE "id" = ${input.walletId}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "isActive" = TRUE FOR UPDATE
    `;
    const wallet = wallets[0];
    if (!wallet) throw new Error("المحفظة غير موجودة.");
    let customerId = input.customerId?.trim() || null;
    let customerName = nullableText(input.customerName);
    let customerPhone = normalizePhone(input.customerPhone);
    if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, shopId, deletedAt: null }, select: { id: true, name: true, phone: true } });
      if (!customer) throw new Error("العميل المحدد غير موجود.");
      customerId = customer.id; customerName = customerName || customer.name; customerPhone = customerPhone || normalizePhone(customer.phone);
    }
    if (input.isDeferred && !customerId) throw new Error("العملية الآجلة تتطلب اختيار عميل مسجل.");

    let commission = new Prisma.Decimal(0);
    if (isCustomerOperation && commissionMode !== "NONE") {
      if (input.commission?.trim()) commission = decimal(input.commission);
      else {
        const rate = input.operationType === "CUSTOMER_DEPOSIT" ? wallet.defaultDepositCommission : wallet.defaultWithdrawalCommission;
        commission = amount.mul(rate).div(100);
      }
    }
    if (commission.lt(0)) throw new Error("العمولة لا يمكن أن تكون سالبة.");
    const walletAmount = walletMovementAmount(input.operationType, amount, commission, commissionMode);
    if (walletAmount.lte(0)) throw new Error("العمولة المخصومة لا يمكن أن تساوي أو تتجاوز مبلغ العملية.");
    const newBalance = decimal(wallet.currentBalance).plus(balanceDelta(input.operationType, walletAmount));
    if (newBalance.lt(0)) throw new Error("رصيد المحفظة غير كافٍ لتنفيذ العملية.");
    await tx.$executeRaw`UPDATE "FinancialWallet" SET "currentBalance" = ${newBalance}, "updatedAt" = NOW() WHERE "id" = ${wallet.id}::uuid AND "shopId" = ${shopId}::uuid`;
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "FinancialTransfer" ("shopId", "walletId", "customerId", "createdByUserId", "operationType", "amount", "walletAmount", "commission", "commissionMode", "isDeferred", "customerName", "customerPhone", "notes")
      VALUES (${shopId}::uuid, ${wallet.id}::uuid, ${customerId}::uuid, ${userId}::uuid, ${input.operationType}, ${amount}, ${walletAmount}, ${commission}, ${commissionMode}, ${Boolean(input.isDeferred)}, ${customerName}, ${customerPhone}, ${nullableText(input.notes)}) RETURNING "id"
    `;
    const transfer = rows[0];
    if (!transfer) throw new Error("تعذر تسجيل العملية.");
    if (input.isDeferred && customerId) {
      const debtEntryId = await createLinkedDebt(tx, shopId, customerId, userId, customerCharge(amount, commission, commissionMode), transfer.id);
      await tx.$executeRaw`UPDATE "FinancialTransfer" SET "debtEntryId" = ${debtEntryId}::uuid, "updatedAt" = NOW() WHERE "id" = ${transfer.id}::uuid AND "shopId" = ${shopId}::uuid`;
    }
    return transfer;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
}

export async function voidTransfer(shopId: string, id: string, userId: string | null) {
  await ensureTables();
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; walletId: string; customerId: string | null; operationType: FinancialTransferType; walletAmount: Prisma.Decimal; status: "ACTIVE" | "VOID"; debtEntryId: string | null }>>`
      SELECT "id", "walletId", "customerId", "operationType", "walletAmount", "status", "debtEntryId" FROM "FinancialTransfer"
      WHERE "id" = ${id}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL FOR UPDATE
    `;
    const transfer = rows[0];
    if (!transfer) throw new Error("العملية غير موجودة.");
    if (transfer.status === "VOID") throw new Error("العملية ملغاة بالفعل.");
    const walletRows = await tx.$queryRaw<Array<{ id: string; currentBalance: Prisma.Decimal }>>`
      SELECT "id", "currentBalance" FROM "FinancialWallet" WHERE "id" = ${transfer.walletId}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL FOR UPDATE
    `;
    const wallet = walletRows[0];
    if (!wallet) throw new Error("المحفظة المرتبطة غير موجودة.");

    if (transfer.debtEntryId && transfer.customerId) {
      const debtRows = await tx.$queryRaw<Array<{ id: string; amount: Prisma.Decimal; isReversed: boolean }>>`
        SELECT "id", "amount", "isReversed" FROM "DebtLedgerEntry" WHERE "id" = ${transfer.debtEntryId}::uuid AND "shopId" = ${shopId}::uuid AND "customerId" = ${transfer.customerId}::uuid FOR UPDATE
      `;
      const debt = debtRows[0];
      if (debt && !debt.isReversed) {
        const balances = await tx.$queryRaw<Array<{ balance: Prisma.Decimal }>>`
          SELECT COALESCE(SUM(CASE WHEN "isReversed" THEN 0 WHEN "type" IN ('DEBT','OPENING_BALANCE','ADJUSTMENT_DEBIT') THEN "amount" WHEN "type" IN ('PAYMENT','ADJUSTMENT_CREDIT') THEN -"amount" ELSE 0 END), 0) AS "balance"
          FROM "DebtLedgerEntry" WHERE "shopId" = ${shopId}::uuid AND "customerId" = ${transfer.customerId}::uuid
        `;
        if (decimal(balances[0]?.balance ?? 0).plus(new Prisma.Decimal("0.005")).lt(debt.amount)) throw new Error("لا يمكن إلغاء العملية لأن الدين المرتبط بها تم تسديده جزئياً أو كلياً.");
        await tx.$executeRaw`UPDATE "DebtLedgerEntry" SET "isReversed" = TRUE, "updatedAt" = NOW() WHERE "id" = ${debt.id}::uuid AND "shopId" = ${shopId}::uuid`;
      }
    }

    const reversedBalance = decimal(wallet.currentBalance).minus(balanceDelta(transfer.operationType, transfer.walletAmount));
    if (reversedBalance.lt(0)) throw new Error("لا يمكن إلغاء العملية لأن رصيد المحفظة الحالي لا يكفي لعكسها.");
    await tx.$executeRaw`UPDATE "FinancialWallet" SET "currentBalance" = ${reversedBalance}, "updatedAt" = NOW() WHERE "id" = ${wallet.id}::uuid AND "shopId" = ${shopId}::uuid`;
    await tx.$executeRaw`UPDATE "FinancialTransfer" SET "status" = 'VOID', "voidedAt" = NOW(), "voidedByUserId" = ${userId}::uuid, "updatedAt" = NOW() WHERE "id" = ${transfer.id}::uuid AND "shopId" = ${shopId}::uuid`;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
}

export const financialTransferService = { listWallets, getStats, listTransfers, createWallet, createTransfer, voidTransfer };
