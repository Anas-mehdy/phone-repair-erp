import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ReconciliationReason = "UNRECORDED_TRANSACTION" | "PROVIDER_FEE" | "OPERATOR_ERROR" | "ROUNDING" | "OTHER";

export type ProviderReconciliationRow = {
  id: string;
  providerId: string;
  providerName: string;
  currencyCode: string;
  systemBalance: Prisma.Decimal;
  actualBalance: Prisma.Decimal;
  difference: Prisma.Decimal;
  reasonCode: ReconciliationReason;
  notes: string | null;
  reference: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: Date;
};

const REASONS = new Set<ReconciliationReason>(["UNRECORDED_TRANSACTION", "PROVIDER_FEE", "OPERATOR_ERROR", "ROUNDING", "OTHER"]);

function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(String(value).replace(",", ".")).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
function nullableText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

export async function listReconciliations(shopId: string, providerId?: string, limit = 100) {
  const providerFilter = providerId ? Prisma.sql`AND r."providerId" = ${providerId}::uuid` : Prisma.sql``;
  return prisma.$queryRaw<ProviderReconciliationRow[]>(Prisma.sql`
    SELECT r."id", r."providerId", p."name" AS "providerName", p."currencyCode",
      r."systemBalance", r."actualBalance", r."difference", r."reasonCode", r."notes", r."reference",
      r."createdByUserId", u."name" AS "createdByName", r."createdAt"
    FROM "ElectronicServiceProviderReconciliation" r
    JOIN "ElectronicServiceProvider" p ON p."id" = r."providerId" AND p."shopId" = r."shopId"
    LEFT JOIN "User" u ON u."id" = r."createdByUserId"
    WHERE r."shopId" = ${shopId}::uuid ${providerFilter}
    ORDER BY r."createdAt" DESC
    LIMIT ${Math.max(1, Math.min(limit, 250))}
  `);
}

export async function reconcileProviderBalance(shopId: string, userId: string, input: {
  providerId: string;
  actualBalance: string;
  reasonCode: ReconciliationReason;
  notes?: string | null;
  reference?: string | null;
}) {
  const actual = decimal(input.actualBalance);
  if (!actual.isFinite() || actual.lt(0)) throw new Error("الرصيد الفعلي غير صحيح.");
  if (!REASONS.has(input.reasonCode)) throw new Error("سبب المطابقة غير صالح.");

  return prisma.$transaction(async (tx) => {
    const providers = await tx.$queryRaw<Array<{ id: string; currentBalance: Prisma.Decimal }>>`
      SELECT "id", "currentBalance"
      FROM "ElectronicServiceProvider"
      WHERE "shopId" = ${shopId}::uuid AND "id" = ${input.providerId}::uuid
      FOR UPDATE
    `;
    const provider = providers[0];
    if (!provider) throw new Error("مزود الخدمة غير موجود.");

    const systemBalance = decimal(provider.currentBalance);
    const difference = actual.sub(systemBalance).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (difference.eq(0)) throw new Error("الرصيد الفعلي مطابق لمسار ولا توجد تسوية مطلوبة.");

    const direction = difference.gt(0) ? "IN" : "OUT";
    const amount = difference.abs();
    const reasonLabel: Record<ReconciliationReason, string> = {
      UNRECORDED_TRANSACTION: "عملية غير مسجلة",
      PROVIDER_FEE: "رسوم أو عمولة من المزود",
      OPERATOR_ERROR: "خطأ إدخال أو تشغيل",
      ROUNDING: "فرق تقريب",
      OTHER: "سبب آخر",
    };
    const description = `مطابقة رصيد المزود — ${reasonLabel[input.reasonCode]}`;

    await tx.$executeRaw`
      UPDATE "ElectronicServiceProvider"
      SET "currentBalance" = ${actual}, "updatedAt" = NOW()
      WHERE "shopId" = ${shopId}::uuid AND "id" = ${input.providerId}::uuid
    `;

    const movements = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "ElectronicServiceProviderMovement" (
        "shopId", "providerId", "createdByUserId", "type", "direction", "amount", "balanceBefore", "balanceAfter",
        "description", "reference", "sourceType", "createdAt"
      ) VALUES (
        ${shopId}::uuid, ${input.providerId}::uuid, ${userId}::uuid, 'ADJUSTMENT', ${direction}, ${amount},
        ${systemBalance}, ${actual}, ${description}, ${nullableText(input.reference)}, 'RECONCILIATION', NOW()
      ) RETURNING "id"
    `;
    const movementId = movements[0]?.id;
    if (!movementId) throw new Error("تعذر تسجيل حركة التسوية.");

    const reconciliations = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "ElectronicServiceProviderReconciliation" (
        "shopId", "providerId", "movementId", "systemBalance", "actualBalance", "difference",
        "reasonCode", "notes", "reference", "createdByUserId", "createdAt"
      ) VALUES (
        ${shopId}::uuid, ${input.providerId}::uuid, ${movementId}::uuid, ${systemBalance}, ${actual}, ${difference},
        ${input.reasonCode}, ${nullableText(input.notes)}, ${nullableText(input.reference)}, ${userId}::uuid, NOW()
      ) RETURNING "id"
    `;
    if (!reconciliations[0]) throw new Error("تعذر حفظ سجل المطابقة.");

    return {
      id: reconciliations[0].id,
      systemBalance: Number(systemBalance),
      actualBalance: Number(actual),
      difference: Number(difference),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
}

export const electronicServiceReconciliationService = { listReconciliations, reconcileProviderBalance };
