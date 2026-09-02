import { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildSourceDebtReference,
  parseSourceDebtReference,
  type SourceDebtType,
} from "@/lib/debt-source-reference";

function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(String(value).replace(",", "."));
}

async function ensureAccountTx(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
) {
  const customer = await tx.customer.findFirst({
    where: { id: customerId, shopId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) throw new Error("العميل المرتبط بالدين غير موجود في هذا المتجر.");

  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "DebtLedgerAccount" ("shopId", "customerId", "updatedAt")
    VALUES (${shopId}::uuid, ${customerId}::uuid, NOW())
    ON CONFLICT ("shopId", "customerId")
    DO UPDATE SET "updatedAt" = NOW()
    RETURNING "id"
  `;
  if (!rows[0]) throw new Error("تعذر فتح دفتر دين العميل.");
  return rows[0].id;
}

export async function createSourceDebtTx(
  tx: Prisma.TransactionClient,
  input: {
    shopId: string;
    customerId: string;
    createdByUserId: string | null;
    amount: string | number | Prisma.Decimal;
    sourceType: SourceDebtType;
    sourceId: string;
    sourceReference?: string | null;
    description: string;
  },
) {
  const amount = decimal(input.amount);
  if (amount.lte(0)) throw new Error("قيمة الدين يجب أن تكون أكبر من صفر.");

  const accountId = await ensureAccountTx(tx, input.shopId, input.customerId);
  const reference = buildSourceDebtReference(input.sourceType, input.sourceId, input.sourceReference);

  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "DebtLedgerEntry" (
      "shopId", "accountId", "customerId", "type", "amount",
      "occurredAt", "description", "reference", "createdByUserId"
    ) VALUES (
      ${input.shopId}::uuid,
      ${accountId}::uuid,
      ${input.customerId}::uuid,
      'DEBT',
      ${amount},
      NOW(),
      ${input.description},
      ${reference},
      ${input.createdByUserId}::uuid
    )
    RETURNING "id"
  `;
  if (!rows[0]) throw new Error("تعذر إضافة الدين إلى دفتر العميل.");
  return rows[0].id;
}

type LedgerAllocationRow = {
  id: string;
  type: "DEBT" | "PAYMENT" | "OPENING_BALANCE" | "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT";
  amount: Prisma.Decimal;
  reference: string | null;
  isReversed: boolean;
};

async function allocationRowsTx(tx: Prisma.TransactionClient, shopId: string, customerId: string) {
  return tx.$queryRaw<LedgerAllocationRow[]>`
    SELECT "id", "type", "amount", "reference", "isReversed"
    FROM "DebtLedgerEntry"
    WHERE "shopId" = ${shopId}::uuid
      AND "customerId" = ${customerId}::uuid
    ORDER BY "occurredAt" ASC, "createdAt" ASC
    FOR UPDATE
  `;
}

function remainingDebitMap(rows: LedgerAllocationRow[]) {
  const remaining = new Map<string, Prisma.Decimal>();
  const queue: Array<{ id: string; remaining: Prisma.Decimal }> = [];

  for (const row of rows) {
    if (row.isReversed) continue;
    const amount = decimal(row.amount);
    if (row.type === "DEBT" || row.type === "OPENING_BALANCE" || row.type === "ADJUSTMENT_DEBIT") {
      const item = { id: row.id, remaining: amount };
      queue.push(item);
      remaining.set(row.id, item.remaining);
      continue;
    }

    let credit = amount;
    for (const debit of queue) {
      if (credit.lte(0)) break;
      if (debit.remaining.lte(0)) continue;
      const applied = debit.remaining.lte(credit) ? debit.remaining : credit;
      debit.remaining = debit.remaining.sub(applied);
      credit = credit.sub(applied);
      remaining.set(debit.id, debit.remaining);
    }
  }

  return remaining;
}

export async function reverseSourceDebtTx(
  tx: Prisma.TransactionClient,
  input: {
    shopId: string;
    sourceType: SourceDebtType;
    sourceId: string;
  },
) {
  const token = `[SOURCE-DEBT:${input.sourceType}:${input.sourceId}]%`;
  const entries = await tx.$queryRaw<Array<{
    id: string;
    customerId: string;
    amount: Prisma.Decimal;
    isReversed: boolean;
  }>>`
    SELECT "id", "customerId", "amount", "isReversed"
    FROM "DebtLedgerEntry"
    WHERE "shopId" = ${input.shopId}::uuid
      AND "type" = 'DEBT'
      AND "reference" LIKE ${token}
    ORDER BY "createdAt" ASC
    LIMIT 1
    FOR UPDATE
  `;
  const entry = entries[0];
  if (!entry || entry.isReversed) return false;

  const ledgerRows = await allocationRowsTx(tx, input.shopId, entry.customerId);
  const remaining = remainingDebitMap(ledgerRows).get(entry.id) ?? new Prisma.Decimal(0);
  if (remaining.lt(entry.amount.sub(new Prisma.Decimal("0.005")))) {
    throw new Error("لا يمكن إلغاء العملية لأن جزءاً من هذا الدين تم تحصيله بالفعل. عالج تحصيلات العميل أولاً ثم أعد المحاولة.");
  }

  await tx.$executeRaw`
    UPDATE "DebtLedgerEntry"
    SET "isReversed" = TRUE, "updatedAt" = NOW()
    WHERE "id" = ${entry.id}::uuid AND "shopId" = ${input.shopId}::uuid
  `;
  return true;
}

export async function syncSoftwareDebtInvoicesTx(
  tx: Prisma.TransactionClient,
  shopId: string,
  customerId: string,
) {
  const rows = await allocationRowsTx(tx, shopId, customerId);
  const remaining = remainingDebitMap(rows);

  for (const row of rows) {
    if (row.isReversed || row.type !== "DEBT") continue;
    const source = parseSourceDebtReference(row.reference);
    if (!source || source.sourceType !== "SOFTWARE_SERVICE") continue;

    const sales = await tx.$queryRaw<Array<{ invoiceId: string }>>`
      SELECT "invoiceId"
      FROM "SoftwareServiceSale"
      WHERE "id" = ${source.sourceId}::uuid
        AND "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
      LIMIT 1
    `;
    const invoiceId = sales[0]?.invoiceId;
    if (!invoiceId) continue;

    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, shopId, deletedAt: null, status: { not: InvoiceStatus.VOID } },
      select: { id: true, total: true },
    });
    if (!invoice) continue;

    const candidateBalance = remaining.get(row.id) ?? row.amount;
    const balanceDue = candidateBalance.lte(invoice.total) ? candidateBalance : invoice.total;
    const amountPaid = invoice.total.sub(balanceDue);
    const status = balanceDue.lte(0)
      ? InvoiceStatus.PAID
      : amountPaid.gt(0)
        ? InvoiceStatus.PARTIALLY_PAID
        : InvoiceStatus.UNPAID;

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid,
        balanceDue,
        status,
        paidAt: status === InvoiceStatus.PAID ? new Date() : null,
        version: { increment: 1 },
      },
    });
  }
}

export async function syncSoftwareDebtInvoices(shopId: string, customerId: string) {
  return prisma.$transaction(
    (tx) => syncSoftwareDebtInvoicesTx(tx, shopId, customerId),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 },
  );
}

export const sourceDebtService = {
  createSourceDebtTx,
  reverseSourceDebtTx,
  syncSoftwareDebtInvoicesTx,
  syncSoftwareDebtInvoices,
};
