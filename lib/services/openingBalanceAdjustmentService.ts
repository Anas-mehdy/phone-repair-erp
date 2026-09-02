import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cashDrawerService } from "@/lib/services/cashDrawerService";

function decimal(value: string | number | Prisma.Decimal | null | undefined) {
  return new Prisma.Decimal(String(value ?? 0).replace(",", "."));
}

function nullableText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

export async function updateOpeningBalance(
  shopId: string,
  userId: string | null,
  value: string,
  notes?: string,
) {
  const nextOpeningBalance = decimal(value);
  if (nextOpeningBalance.lt(0)) {
    throw new Error("الرصيد الافتتاحي لا يمكن أن يكون سالباً.");
  }

  // Ensure the runtime drawer tables and the shop drawer exist before locking it.
  await cashDrawerService.getSnapshot(shopId, 1);

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      id: string;
      currentBalance: Prisma.Decimal;
      openingBalance: Prisma.Decimal;
      openingBalanceSetAt: Date | null;
    }>>`
      SELECT "id", "currentBalance", "openingBalance", "openingBalanceSetAt"
      FROM "CashDrawer"
      WHERE "shopId" = ${shopId}::uuid
      FOR UPDATE
    `;

    const drawer = rows[0];
    if (!drawer) throw new Error("الدرج النقدي غير موجود.");
    if (!drawer.openingBalanceSetAt) throw new Error("لم يتم تسجيل رصيد افتتاحي للدرج بعد.");

    const difference = nextOpeningBalance.sub(drawer.openingBalance);
    const nextCurrentBalance = drawer.currentBalance.add(difference);

    if (nextCurrentBalance.lt(0)) {
      throw new Error("لا يمكن تخفيض الرصيد الافتتاحي لهذه القيمة لأن ذلك سيجعل رصيد الدرج الحالي سالباً.");
    }

    await tx.$executeRaw`
      UPDATE "CashDrawer"
      SET "openingBalance" = ${nextOpeningBalance},
          "currentBalance" = ${nextCurrentBalance},
          "updatedAt" = NOW()
      WHERE "id" = ${drawer.id}::uuid AND "shopId" = ${shopId}::uuid
    `;

    const openingMovements = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "CashDrawerMovement"
      WHERE "shopId" = ${shopId}::uuid
        AND "drawerId" = ${drawer.id}::uuid
        AND "type" = 'OPENING_BALANCE'
        AND "status" = 'ACTIVE'
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE
    `;

    const description = nullableText(notes) || "الرصيد الافتتاحي للدرج — تم تعديله";
    const openingMovement = openingMovements[0];

    if (openingMovement) {
      await tx.$executeRaw`
        UPDATE "CashDrawerMovement"
        SET "amount" = ${nextOpeningBalance},
            "description" = ${description},
            "sourceReference" = 'الرصيد الافتتاحي'
        WHERE "id" = ${openingMovement.id}::uuid AND "shopId" = ${shopId}::uuid
      `;
    } else if (nextOpeningBalance.gt(0)) {
      await tx.$executeRaw`
        INSERT INTO "CashDrawerMovement" (
          "shopId", "drawerId", "createdByUserId", "type", "direction", "amount",
          "description", "sourceType", "sourceReference"
        ) VALUES (
          ${shopId}::uuid, ${drawer.id}::uuid, ${userId}::uuid, 'OPENING_BALANCE', 'IN',
          ${nextOpeningBalance}, ${description}, 'MANUAL', 'الرصيد الافتتاحي'
        )
      `;
    }

    return {
      previousOpeningBalance: Number(drawer.openingBalance),
      openingBalance: Number(nextOpeningBalance),
      currentBalance: Number(nextCurrentBalance),
      difference: Number(difference),
    };
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 10_000,
  });
}

export const openingBalanceAdjustmentService = { updateOpeningBalance };
