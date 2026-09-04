import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getShopTimeZone } from "@/lib/shop-timezone";
import { dayUtcBoundsForTimeZone } from "@/lib/timezone";

export type ElectronicServiceProviderRow = {
  id: string;
  shopId: string;
  name: string;
  typeLabel: string | null;
  currencyCode: string;
  currentBalance: Prisma.Decimal;
  openingBalance: Prisma.Decimal;
  isActive: boolean;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMovementAt: Date | null;
  todayMovementCount: number;
};

export type ElectronicServiceProviderMovementRow = {
  id: string;
  providerId: string;
  type: "OPENING_BALANCE" | "TOP_UP" | "MANUAL_DEDUCTION" | "ADJUSTMENT" | "SERVICE_DEBIT" | "REVERSAL";
  direction: "IN" | "OUT";
  amount: Prisma.Decimal;
  balanceBefore: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  description: string | null;
  reference: string | null;
  sourceType: string;
  sourceId: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: Date;
};

export type ElectronicServiceProviderOverview = {
  providers: ElectronicServiceProviderRow[];
  stats: {
    providerCount: number;
    activeProviderCount: number;
    totalBalance: number;
    todayIn: number;
    todayOut: number;
    todayMovementCount: number;
  };
};

type QueryClient = Pick<Prisma.TransactionClient, "$queryRaw">;
type UtcBounds = { start: Date; end: Date };

type ProviderLockRow = {
  id: string;
  currentBalance: Prisma.Decimal;
  isActive: boolean;
};

function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(String(value).replace(",", "."));
}

function nullableText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function normalizeProviderName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function ensureNonNegative(value: Prisma.Decimal, label: string) {
  if (!value.isFinite() || value.lt(0)) throw new Error(`${label} لا يمكن أن يكون سالباً.`);
}

async function todayBoundsForShop(shopId: string): Promise<UtcBounds> {
  const timeZone = await getShopTimeZone(shopId);
  return dayUtcBoundsForTimeZone(new Date(), timeZone);
}

async function assertProviderNameAvailable(shopId: string, name: string, excludeId?: string, tx: QueryClient = prisma) {
  const excluded = excludeId ? Prisma.sql`AND "id" <> ${excludeId}::uuid` : Prisma.sql``;
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "ElectronicServiceProvider"
    WHERE "shopId" = ${shopId}::uuid
      AND lower(trim("name")) = lower(trim(${name}))
      ${excluded}
    LIMIT 1
  `);
  if (rows[0]) throw new Error("يوجد مزود خدمة بهذا الاسم مسبقاً في المتجر.");
}

async function getProviderBase(shopId: string, providerId: string, today: UtcBounds) {
  const rows = await prisma.$queryRaw<ElectronicServiceProviderRow[]>`
    SELECT p."id", p."shopId", p."name", p."typeLabel", p."currencyCode",
      p."currentBalance", p."openingBalance", p."isActive", p."notes",
      p."createdByUserId", p."createdAt", p."updatedAt",
      (SELECT MAX(m."createdAt") FROM "ElectronicServiceProviderMovement" m WHERE m."shopId" = p."shopId" AND m."providerId" = p."id") AS "lastMovementAt",
      (SELECT COUNT(*)::int FROM "ElectronicServiceProviderMovement" m
        WHERE m."shopId" = p."shopId" AND m."providerId" = p."id"
          AND m."createdAt" >= ${today.start} AND m."createdAt" < ${today.end}) AS "todayMovementCount"
    FROM "ElectronicServiceProvider" p
    WHERE p."shopId" = ${shopId}::uuid AND p."id" = ${providerId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export const electronicServiceProviderService = {
  async getOverview(shopId: string, filters: { q?: string; status?: "ACTIVE" | "INACTIVE" } = {}): Promise<ElectronicServiceProviderOverview> {
    const q = filters.q?.trim() || null;
    const searchFilter = q ? Prisma.sql`AND (p."name" ILIKE ${`%${q}%`} OR COALESCE(p."typeLabel", '') ILIKE ${`%${q}%`})` : Prisma.sql``;
    const statusFilter = filters.status === "ACTIVE" ? Prisma.sql`AND p."isActive" = true` : filters.status === "INACTIVE" ? Prisma.sql`AND p."isActive" = false` : Prisma.sql``;
    const today = await todayBoundsForShop(shopId);

    const [providers, statsRows, todayRows] = await Promise.all([
      prisma.$queryRaw<ElectronicServiceProviderRow[]>(Prisma.sql`
        SELECT p."id", p."shopId", p."name", p."typeLabel", p."currencyCode",
          p."currentBalance", p."openingBalance", p."isActive", p."notes",
          p."createdByUserId", p."createdAt", p."updatedAt",
          (SELECT MAX(m."createdAt") FROM "ElectronicServiceProviderMovement" m WHERE m."shopId" = p."shopId" AND m."providerId" = p."id") AS "lastMovementAt",
          (SELECT COUNT(*)::int FROM "ElectronicServiceProviderMovement" m
            WHERE m."shopId" = p."shopId" AND m."providerId" = p."id"
              AND m."createdAt" >= ${today.start} AND m."createdAt" < ${today.end}) AS "todayMovementCount"
        FROM "ElectronicServiceProvider" p
        WHERE p."shopId" = ${shopId}::uuid ${searchFilter} ${statusFilter}
        ORDER BY p."isActive" DESC, lower(p."name") ASC
      `),
      prisma.$queryRaw<Array<{ providerCount: number; activeProviderCount: number; totalBalance: Prisma.Decimal }>>`
        SELECT COUNT(*)::int AS "providerCount", COUNT(*) FILTER (WHERE "isActive" = true)::int AS "activeProviderCount", COALESCE(SUM("currentBalance"), 0) AS "totalBalance"
        FROM "ElectronicServiceProvider" WHERE "shopId" = ${shopId}::uuid
      `,
      prisma.$queryRaw<Array<{ todayIn: Prisma.Decimal; todayOut: Prisma.Decimal; todayMovementCount: number }>>`
        SELECT COALESCE(SUM("amount") FILTER (WHERE "direction" = 'IN'), 0) AS "todayIn", COALESCE(SUM("amount") FILTER (WHERE "direction" = 'OUT'), 0) AS "todayOut", COUNT(*)::int AS "todayMovementCount"
        FROM "ElectronicServiceProviderMovement"
        WHERE "shopId" = ${shopId}::uuid AND "createdAt" >= ${today.start} AND "createdAt" < ${today.end}
      `,
    ]);

    const stats = statsRows[0];
    const todayStats = todayRows[0];
    return {
      providers,
      stats: {
        providerCount: stats?.providerCount ?? 0,
        activeProviderCount: stats?.activeProviderCount ?? 0,
        totalBalance: Number(stats?.totalBalance ?? 0),
        todayIn: Number(todayStats?.todayIn ?? 0),
        todayOut: Number(todayStats?.todayOut ?? 0),
        todayMovementCount: todayStats?.todayMovementCount ?? 0,
      },
    };
  },

  async getProvider(shopId: string, providerId: string, movementLimit = 150) {
    const today = await todayBoundsForShop(shopId);
    const provider = await getProviderBase(shopId, providerId, today);
    if (!provider) return null;
    const [movements, todayRows] = await Promise.all([
      prisma.$queryRaw<ElectronicServiceProviderMovementRow[]>`
        SELECT m."id", m."providerId", m."type", m."direction", m."amount", m."balanceBefore", m."balanceAfter", m."description", m."reference", m."sourceType", m."sourceId", m."createdByUserId", u."name" AS "createdByName", m."createdAt"
        FROM "ElectronicServiceProviderMovement" m
        LEFT JOIN "User" u ON u."id" = m."createdByUserId"
        WHERE m."shopId" = ${shopId}::uuid AND m."providerId" = ${providerId}::uuid
        ORDER BY m."createdAt" DESC LIMIT ${Math.max(1, Math.min(movementLimit, 300))}
      `,
      prisma.$queryRaw<Array<{ todayIn: Prisma.Decimal; todayOut: Prisma.Decimal; todayMovementCount: number }>>`
        SELECT COALESCE(SUM("amount") FILTER (WHERE "direction" = 'IN'), 0) AS "todayIn", COALESCE(SUM("amount") FILTER (WHERE "direction" = 'OUT'), 0) AS "todayOut", COUNT(*)::int AS "todayMovementCount"
        FROM "ElectronicServiceProviderMovement"
        WHERE "shopId" = ${shopId}::uuid AND "providerId" = ${providerId}::uuid
          AND "createdAt" >= ${today.start} AND "createdAt" < ${today.end}
      `,
    ]);
    return { provider, movements, today: { in: Number(todayRows[0]?.todayIn ?? 0), out: Number(todayRows[0]?.todayOut ?? 0), count: todayRows[0]?.todayMovementCount ?? 0 } };
  },

  async createProvider(shopId: string, userId: string, input: { name: string; typeLabel?: string | null; currencyCode: string; openingBalance: string; notes?: string | null }) {
    const name = normalizeProviderName(input.name);
    if (!name) throw new Error("اسم مزود الخدمة مطلوب.");
    const openingBalance = decimal(input.openingBalance);
    ensureNonNegative(openingBalance, "الرصيد الافتتاحي");

    return prisma.$transaction(async (tx) => {
      await assertProviderNameAvailable(shopId, name, undefined, tx);
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "ElectronicServiceProvider" ("shopId", "name", "typeLabel", "currencyCode", "currentBalance", "openingBalance", "isActive", "notes", "createdByUserId", "createdAt", "updatedAt")
        VALUES (${shopId}::uuid, ${name}, ${nullableText(input.typeLabel)}, ${input.currencyCode}, ${openingBalance}, ${openingBalance}, true, ${nullableText(input.notes)}, ${userId}::uuid, NOW(), NOW())
        RETURNING "id"
      `;
      const provider = rows[0];
      if (!provider) throw new Error("تعذر إنشاء مزود الخدمة.");
      if (openingBalance.gt(0)) {
        await tx.$executeRaw`
          INSERT INTO "ElectronicServiceProviderMovement" ("shopId", "providerId", "createdByUserId", "type", "direction", "amount", "balanceBefore", "balanceAfter", "description", "sourceType", "createdAt")
          VALUES (${shopId}::uuid, ${provider.id}::uuid, ${userId}::uuid, 'OPENING_BALANCE', 'IN', ${openingBalance}, 0, ${openingBalance}, 'الرصيد الافتتاحي للمزود', 'MANUAL', NOW())
        `;
      }
      return provider.id;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
  },

  async updateProvider(shopId: string, providerId: string, input: { name: string; typeLabel?: string | null; notes?: string | null }) {
    const name = normalizeProviderName(input.name);
    if (!name) throw new Error("اسم مزود الخدمة مطلوب.");
    return prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ElectronicServiceProvider" WHERE "shopId" = ${shopId}::uuid AND "id" = ${providerId}::uuid LIMIT 1 FOR UPDATE`;
      if (!existing[0]) throw new Error("مزود الخدمة غير موجود.");
      await assertProviderNameAvailable(shopId, name, providerId, tx);
      await tx.$executeRaw`UPDATE "ElectronicServiceProvider" SET "name" = ${name}, "typeLabel" = ${nullableText(input.typeLabel)}, "notes" = ${nullableText(input.notes)}, "updatedAt" = NOW() WHERE "shopId" = ${shopId}::uuid AND "id" = ${providerId}::uuid`;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
  },

  async setProviderActive(shopId: string, providerId: string, isActive: boolean) {
    const changed = await prisma.$executeRaw`UPDATE "ElectronicServiceProvider" SET "isActive" = ${isActive}, "updatedAt" = NOW() WHERE "shopId" = ${shopId}::uuid AND "id" = ${providerId}::uuid`;
    if (changed === 0) throw new Error("مزود الخدمة غير موجود.");
  },

  async recordBalanceMovement(shopId: string, userId: string, providerId: string, input: { mode: "TOP_UP" | "DEDUCT" | "ADJUST"; value: string; description?: string | null; reference?: string | null }) {
    const value = decimal(input.value);
    ensureNonNegative(value, input.mode === "ADJUST" ? "الرصيد الفعلي" : "المبلغ");
    if (input.mode !== "ADJUST" && value.lte(0)) throw new Error("المبلغ يجب أن يكون أكبر من صفر.");

    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ProviderLockRow[]>`SELECT "id", "currentBalance", "isActive" FROM "ElectronicServiceProvider" WHERE "shopId" = ${shopId}::uuid AND "id" = ${providerId}::uuid FOR UPDATE`;
      const provider = rows[0];
      if (!provider) throw new Error("مزود الخدمة غير موجود.");

      const before = provider.currentBalance;
      let after = before;
      let amount = value;
      let direction: "IN" | "OUT" = "IN";
      let type: ElectronicServiceProviderMovementRow["type"] = "TOP_UP";
      let fallbackDescription = "إضافة رصيد للمزود";

      if (input.mode === "TOP_UP") {
        after = before.add(value);
      } else if (input.mode === "DEDUCT") {
        after = before.sub(value);
        if (after.lt(0)) throw new Error("رصيد المزود غير كافٍ لتنفيذ هذا الخصم.");
        direction = "OUT";
        type = "MANUAL_DEDUCTION";
        fallbackDescription = "خصم يدوي من رصيد المزود";
      } else {
        after = value;
        const difference = after.sub(before);
        if (difference.eq(0)) throw new Error("الرصيد المدخل مطابق للرصيد الحالي ولا يحتاج تسوية.");
        direction = difference.gt(0) ? "IN" : "OUT";
        amount = difference.abs();
        type = "ADJUSTMENT";
        fallbackDescription = "مطابقة الرصيد الفعلي للمزود";
      }

      ensureNonNegative(after, "الرصيد الناتج");
      await tx.$executeRaw`UPDATE "ElectronicServiceProvider" SET "currentBalance" = ${after}, "updatedAt" = NOW() WHERE "shopId" = ${shopId}::uuid AND "id" = ${providerId}::uuid`;
      await tx.$executeRaw`
        INSERT INTO "ElectronicServiceProviderMovement" ("shopId", "providerId", "createdByUserId", "type", "direction", "amount", "balanceBefore", "balanceAfter", "description", "reference", "sourceType", "createdAt")
        VALUES (${shopId}::uuid, ${providerId}::uuid, ${userId}::uuid, ${type}, ${direction}, ${amount}, ${before}, ${after}, ${nullableText(input.description) ?? fallbackDescription}, ${nullableText(input.reference)}, 'MANUAL', NOW())
      `;
      return { balanceBefore: Number(before), balanceAfter: Number(after) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 });
  },
};