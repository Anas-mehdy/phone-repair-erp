import { Prisma } from "@prisma/client";
import { parseSourceDebtReference } from "@/lib/debt-source-reference";
import { prisma } from "@/lib/prisma";

type LedgerRow = {
  id: string;
  customerId: string;
  type: "DEBT" | "PAYMENT" | "OPENING_BALANCE" | "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT";
  amount: Prisma.Decimal;
  occurredAt: Date;
  reference: string | null;
  sourceName: string | null;
  paymentMethod: string | null;
  isReversed: boolean;
};

function inRange(value: Date, start: Date, end: Date) {
  return value >= start && value < end;
}

export async function getDebtReportSummary(shopId: string, start: Date, end: Date) {
  const rows = await prisma.$queryRaw<LedgerRow[]>`
    SELECT "id", "customerId", "type", "amount", "occurredAt", "reference",
      "sourceName", "paymentMethod", "isReversed"
    FROM "DebtLedgerEntry"
    WHERE "shopId" = ${shopId}::uuid
    ORDER BY "customerId" ASC, "occurredAt" ASC, "createdAt" ASC
  `;

  const deferredSaleIds = new Set<string>();
  const remaining = new Map<string, Prisma.Decimal>();
  const sourceDebts = new Map<string, {
    sourceType: "SALE" | "ELECTRONIC_SERVICE";
    sourceId: string;
    occurredAt: Date;
    customerId: string;
  }>();
  const queues = new Map<string, Array<{ id: string; remaining: Prisma.Decimal }>>();
  const payments: Array<{ amount: number; sourceName: string }> = [];

  for (const row of rows) {
    if (row.isReversed) continue;
    const amount = new Prisma.Decimal(row.amount);
    const queue = queues.get(row.customerId) ?? [];
    if (!queues.has(row.customerId)) queues.set(row.customerId, queue);

    if (row.type === "DEBT" || row.type === "OPENING_BALANCE" || row.type === "ADJUSTMENT_DEBIT") {
      const debit = { id: row.id, remaining: amount };
      queue.push(debit);
      remaining.set(row.id, amount);

      const source = row.type === "DEBT" ? parseSourceDebtReference(row.reference) : null;
      if (source?.sourceType === "SALE" || source?.sourceType === "ELECTRONIC_SERVICE") {
        if (source.sourceType === "SALE") deferredSaleIds.add(source.sourceId);
        sourceDebts.set(row.id, {
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          occurredAt: row.occurredAt,
          customerId: row.customerId,
        });
      }
      continue;
    }

    if (row.type === "PAYMENT" && inRange(row.occurredAt, start, end)) {
      payments.push({
        amount: Number(amount),
        sourceName: row.sourceName?.trim() || row.paymentMethod?.trim() || "تحصيل دين",
      });
    }

    let credit = amount;
    for (const debit of queue) {
      if (credit.lte(0)) break;
      if (debit.remaining.lte(0)) continue;
      const applied = debit.remaining.lte(credit) ? debit.remaining : credit;
      debit.remaining = debit.remaining.sub(applied);
      remaining.set(debit.id, debit.remaining);
      credit = credit.sub(applied);
    }
  }

  let saleOutstanding = 0;
  let electronicServiceOutstanding = 0;
  for (const [entryId, source] of sourceDebts) {
    if (!inRange(source.occurredAt, start, end)) continue;
    const outstanding = Number(remaining.get(entryId) ?? 0);
    if (source.sourceType === "SALE") saleOutstanding += outstanding;
    if (source.sourceType === "ELECTRONIC_SERVICE") electronicServiceOutstanding += outstanding;
  }

  return {
    deferredSaleIds: [...deferredSaleIds],
    saleOutstanding: Math.round((saleOutstanding + Number.EPSILON) * 100) / 100,
    electronicServiceOutstanding: Math.round((electronicServiceOutstanding + Number.EPSILON) * 100) / 100,
    payments,
  };
}

export const debtReportService = { getDebtReportSummary };
