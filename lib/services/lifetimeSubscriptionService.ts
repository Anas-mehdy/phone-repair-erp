import { Prisma, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";

export type LifetimePriceRow = {
  id: string;
  countryCode: string;
  currencyCode: string;
  amount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
};

export type LifetimeSubscriptionRow = {
  id: string;
  shopId: string;
  shopName: string;
  countryCode: string;
  activatedAt: Date;
  activatedById: string | null;
  pricePaid: Prisma.Decimal | null;
  currencyCode: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  adminNotes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

let tablesReady: Promise<void> | null = null;

async function createTables() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(68119725)");
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LifetimeSubscriptionPrice" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "countryCode" VARCHAR(2) NOT NULL UNIQUE,
        "currencyCode" VARCHAR(3) NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LifetimeSubscriptionPrice_countryCode_idx" ON "LifetimeSubscriptionPrice"("countryCode")`);
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LifetimeSubscription" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "shopId" UUID NOT NULL UNIQUE REFERENCES "Shop"("id") ON DELETE CASCADE,
        "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "activatedById" UUID,
        "pricePaid" DECIMAL(12,2),
        "currencyCode" VARCHAR(3),
        "paymentMethod" VARCHAR(50),
        "paymentReference" TEXT,
        "adminNotes" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LifetimeSubscription_isActive_idx" ON "LifetimeSubscription"("isActive")`);
  }, { timeout: 10_000 });
}

export async function ensureTables() {
  if (!tablesReady) {
    tablesReady = createTables().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  await tablesReady;
}

export async function listLifetimePrices() {
  await ensureTables();
  return prisma.$queryRaw<LifetimePriceRow[]>`
    SELECT "id", "countryCode", "currencyCode", "amount", "createdAt", "updatedAt"
    FROM "LifetimeSubscriptionPrice"
    ORDER BY "countryCode" ASC
  `;
}

export async function getLifetimePriceForCountry(countryCode: string) {
  await ensureTables();
  const rows = await prisma.$queryRaw<LifetimePriceRow[]>`
    SELECT "id", "countryCode", "currencyCode", "amount", "createdAt", "updatedAt"
    FROM "LifetimeSubscriptionPrice"
    WHERE "countryCode" IN (${countryCode}, 'ZZ')
    ORDER BY CASE WHEN "countryCode" = ${countryCode} THEN 0 ELSE 1 END
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getActiveLifetimeForShop(shopId: string) {
  await ensureTables();
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    shopId: string;
    activatedAt: Date;
    pricePaid: Prisma.Decimal | null;
    currencyCode: string | null;
  }>>`
    SELECT l."id", l."shopId", l."activatedAt", l."pricePaid", l."currencyCode"
    FROM "LifetimeSubscription" l
    JOIN "Subscription" s ON s."shopId" = l."shopId"
    WHERE l."shopId" = ${shopId}::uuid
      AND l."isActive" = TRUE
      AND s."status" = 'ACTIVE'
      AND s."billingInterval" IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listLifetimeSubscriptions() {
  await requireSuperAdmin();
  await ensureTables();
  return prisma.$queryRaw<LifetimeSubscriptionRow[]>`
    SELECT l."id", l."shopId", sh."name" AS "shopName", sh."countryCode",
      l."activatedAt", l."activatedById", l."pricePaid", l."currencyCode",
      l."paymentMethod", l."paymentReference", l."adminNotes",
      CASE WHEN l."isActive" = TRUE AND s."status" = 'ACTIVE' AND s."billingInterval" IS NULL THEN TRUE ELSE FALSE END AS "isActive",
      l."createdAt", l."updatedAt"
    FROM "LifetimeSubscription" l
    JOIN "Shop" sh ON sh."id" = l."shopId"
    LEFT JOIN "Subscription" s ON s."shopId" = l."shopId"
    WHERE sh."deletedAt" IS NULL
    ORDER BY l."activatedAt" DESC
  `;
}

function nullable(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

export async function activateLifetimeSubscription(input: {
  shopId: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  adminNotes?: string | null;
}, now = new Date()) {
  const admin = await requireSuperAdmin();
  await ensureTables();

  const [shop, offer] = await Promise.all([
    prisma.shop.findFirst({ where: { id: input.shopId, deletedAt: null }, select: { id: true, name: true, countryCode: true } }),
    prisma.subscriptionOfferSettings.findUnique({ where: { id: "FOUNDERS_OFFER" } }),
  ]);
  if (!shop) throw new Error("المتجر غير موجود.");
  if (!offer?.isActive || offer.remainingEligible <= 0) throw new Error("عرض مدى الحياة متوقف حالياً أو اكتمل العدد المخصص.");

  const price = await getLifetimePriceForCountry(shop.countryCode);
  if (!price) throw new Error("سعر مدى الحياة غير محدد لدولة هذا المتجر.");

  await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({ where: { shopId: input.shopId }, select: { id: true } });
    if (!subscription) throw new Error("لا يوجد سجل اشتراك لهذا المتجر.");

    await tx.$executeRaw`
      INSERT INTO "LifetimeSubscription" (
        "shopId", "activatedAt", "activatedById", "pricePaid", "currencyCode",
        "paymentMethod", "paymentReference", "adminNotes", "isActive", "updatedAt"
      ) VALUES (
        ${input.shopId}::uuid, ${now}, ${admin.userId}::uuid, ${price.amount}, ${price.currencyCode},
        ${nullable(input.paymentMethod)}, ${nullable(input.paymentReference)}, ${nullable(input.adminNotes)}, TRUE, NOW()
      )
      ON CONFLICT ("shopId") DO UPDATE SET
        "activatedAt" = EXCLUDED."activatedAt",
        "activatedById" = EXCLUDED."activatedById",
        "pricePaid" = EXCLUDED."pricePaid",
        "currencyCode" = EXCLUDED."currencyCode",
        "paymentMethod" = EXCLUDED."paymentMethod",
        "paymentReference" = EXCLUDED."paymentReference",
        "adminNotes" = EXCLUDED."adminNotes",
        "isActive" = TRUE,
        "updatedAt" = NOW()
    `;

    await tx.subscription.update({
      where: { shopId: input.shopId },
      data: {
        plan: SubscriptionPlan.PROFESSIONAL,
        status: SubscriptionStatus.ACTIVE,
        billingInterval: null,
        currentPeriodStartedAt: now,
        currentPeriodEndsAt: null,
        activatedAt: now,
        activatedById: admin.userId,
        canceledAt: null,
        gracePeriodEndsAt: null,
        paymentMethod: nullable(input.paymentMethod),
        paymentReference: nullable(input.paymentReference),
        adminNotes: nullable(input.adminNotes),
      },
    });
  }, { timeout: 10_000 });

  return getActiveLifetimeForShop(input.shopId);
}

export const lifetimeSubscriptionService = {
  ensureTables,
  listLifetimePrices,
  getLifetimePriceForCountry,
  getActiveLifetimeForShop,
  listLifetimeSubscriptions,
  activateLifetimeSubscription,
};
