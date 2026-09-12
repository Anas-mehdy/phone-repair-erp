import { Prisma, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureShopOwnerEvent } from "@/lib/analytics/server";

export type LifetimeMaintenanceStatus =
  | "LEGACY"
  | "FREE_FIRST_YEAR"
  | "PAID"
  | "DUE_SOON"
  | "OVERDUE";

export type LifetimePriceRow = {
  id: string;
  countryCode: string;
  currencyCode: string;
  amount: Prisma.Decimal;
  annualMaintenanceAmount: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LifetimeMaintenancePaymentRow = {
  id: string;
  lifetimeSubscriptionId: string;
  shopId: string;
  coverageStart: Date;
  coverageEnd: Date;
  amount: Prisma.Decimal;
  currencyCode: string;
  paidAt: Date;
  recordedById: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  adminNotes: string | null;
  createdAt: Date;
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
  annualMaintenanceAmount: Prisma.Decimal | null;
  maintenanceCurrencyCode: string | null;
  maintenanceStartsAt: Date | null;
  maintenancePaidThrough: Date | null;
  maintenancePaymentCount: number;
  lastMaintenancePaidAt: Date | null;
  maintenanceStatus: LifetimeMaintenanceStatus;
  nextMaintenanceDueAt: Date | null;
  maintenanceDaysUntilDue: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  adminNotes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LifetimeMaintenanceAccount = {
  status: LifetimeMaintenanceStatus;
  annualAmount: number | null;
  currencyCode: string | null;
  startsAt: Date | null;
  paidThrough: Date | null;
  nextDueAt: Date | null;
  daysUntilDue: number | null;
  payments: LifetimeMaintenancePaymentRow[];
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
        "annualMaintenanceAmount" DECIMAL(12,2),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await tx.$executeRawUnsafe(`
      ALTER TABLE "LifetimeSubscriptionPrice"
      ADD COLUMN IF NOT EXISTS "annualMaintenanceAmount" DECIMAL(12,2)
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
        "annualMaintenanceAmount" DECIMAL(12,2),
        "maintenanceCurrencyCode" VARCHAR(3),
        "maintenanceStartsAt" TIMESTAMP(3),
        "paymentMethod" VARCHAR(50),
        "paymentReference" TEXT,
        "adminNotes" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await tx.$executeRawUnsafe(`
      ALTER TABLE "LifetimeSubscription"
      ADD COLUMN IF NOT EXISTS "annualMaintenanceAmount" DECIMAL(12,2)
    `);
    await tx.$executeRawUnsafe(`
      ALTER TABLE "LifetimeSubscription"
      ADD COLUMN IF NOT EXISTS "maintenanceCurrencyCode" VARCHAR(3)
    `);
    await tx.$executeRawUnsafe(`
      ALTER TABLE "LifetimeSubscription"
      ADD COLUMN IF NOT EXISTS "maintenanceStartsAt" TIMESTAMP(3)
    `);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LifetimeSubscription_isActive_idx" ON "LifetimeSubscription"("isActive")`);

    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LifetimeMaintenancePayment" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "lifetimeSubscriptionId" UUID NOT NULL REFERENCES "LifetimeSubscription"("id") ON DELETE CASCADE,
        "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "coverageStart" TIMESTAMP(3) NOT NULL,
        "coverageEnd" TIMESTAMP(3) NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "currencyCode" VARCHAR(3) NOT NULL,
        "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "recordedById" UUID,
        "paymentMethod" VARCHAR(50),
        "paymentReference" TEXT,
        "adminNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await tx.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "LifetimeMaintenancePayment_subscription_coverage_key"
      ON "LifetimeMaintenancePayment"("lifetimeSubscriptionId", "coverageStart")
    `);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LifetimeMaintenancePayment_shopId_idx" ON "LifetimeMaintenancePayment"("shopId")`);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LifetimeMaintenancePayment_paidAt_idx" ON "LifetimeMaintenancePayment"("paidAt")`);
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
    SELECT "id", "countryCode", "currencyCode", "amount", "annualMaintenanceAmount", "createdAt", "updatedAt"
    FROM "LifetimeSubscriptionPrice"
    ORDER BY "countryCode" ASC
  `;
}

export async function getLifetimePriceForCountry(countryCode: string) {
  await ensureTables();
  const rows = await prisma.$queryRaw<LifetimePriceRow[]>`
    SELECT "id", "countryCode", "currencyCode", "amount", "annualMaintenanceAmount", "createdAt", "updatedAt"
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
    annualMaintenanceAmount: Prisma.Decimal | null;
    maintenanceCurrencyCode: string | null;
    maintenanceStartsAt: Date | null;
  }>>`
    SELECT l."id", l."shopId", l."activatedAt", l."pricePaid", l."currencyCode",
      l."annualMaintenanceAmount", l."maintenanceCurrencyCode", l."maintenanceStartsAt"
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

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

function resolveMaintenanceState(input: {
  annualMaintenanceAmount: Prisma.Decimal | null;
  maintenanceStartsAt: Date | null;
  paidThrough: Date | null;
  paymentCount: number;
}, now: Date) {
  if (input.annualMaintenanceAmount == null || !input.maintenanceStartsAt) {
    return {
      status: "LEGACY" as const,
      paidThrough: null,
      nextDueAt: null,
      daysUntilDue: null,
    };
  }

  const paidThrough = input.paidThrough && input.paidThrough > input.maintenanceStartsAt
    ? input.paidThrough
    : input.maintenanceStartsAt;
  const remainingDays = daysUntil(paidThrough, now);

  if (paidThrough.getTime() <= now.getTime()) {
    return {
      status: "OVERDUE" as const,
      paidThrough,
      nextDueAt: paidThrough,
      daysUntilDue: remainingDays,
    };
  }

  if (remainingDays <= 30) {
    return {
      status: "DUE_SOON" as const,
      paidThrough,
      nextDueAt: paidThrough,
      daysUntilDue: remainingDays,
    };
  }

  return {
    status: input.paymentCount === 0 ? "FREE_FIRST_YEAR" as const : "PAID" as const,
    paidThrough,
    nextDueAt: paidThrough,
    daysUntilDue: remainingDays,
  };
}

export async function listLifetimeSubscriptions(now = new Date()) {
  await requireSuperAdmin();
  await ensureTables();
  const rows = await prisma.$queryRaw<Array<Omit<LifetimeSubscriptionRow,
    "maintenanceStatus" | "nextMaintenanceDueAt" | "maintenanceDaysUntilDue">>>`
    SELECT l."id", l."shopId", sh."name" AS "shopName", sh."countryCode",
      l."activatedAt", l."activatedById", l."pricePaid", l."currencyCode",
      l."annualMaintenanceAmount", l."maintenanceCurrencyCode", l."maintenanceStartsAt",
      CASE
        WHEN p."paidThrough" IS NULL THEN l."maintenanceStartsAt"
        WHEN l."maintenanceStartsAt" IS NULL THEN p."paidThrough"
        WHEN p."paidThrough" > l."maintenanceStartsAt" THEN p."paidThrough"
        ELSE l."maintenanceStartsAt"
      END AS "maintenancePaidThrough",
      COALESCE(p."paymentCount", 0)::int AS "maintenancePaymentCount",
      p."lastPaidAt" AS "lastMaintenancePaidAt",
      l."paymentMethod", l."paymentReference", l."adminNotes",
      CASE WHEN l."isActive" = TRUE AND s."status" = 'ACTIVE' AND s."billingInterval" IS NULL THEN TRUE ELSE FALSE END AS "isActive",
      l."createdAt", l."updatedAt"
    FROM "LifetimeSubscription" l
    JOIN "Shop" sh ON sh."id" = l."shopId"
    LEFT JOIN "Subscription" s ON s."shopId" = l."shopId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS "paymentCount", MAX(mp."coverageEnd") AS "paidThrough", MAX(mp."paidAt") AS "lastPaidAt"
      FROM "LifetimeMaintenancePayment" mp
      WHERE mp."lifetimeSubscriptionId" = l."id"
    ) p ON TRUE
    WHERE sh."deletedAt" IS NULL
    ORDER BY l."activatedAt" DESC
  `;

  return rows.map((row): LifetimeSubscriptionRow => {
    const state = resolveMaintenanceState({
      annualMaintenanceAmount: row.annualMaintenanceAmount,
      maintenanceStartsAt: row.maintenanceStartsAt,
      paidThrough: row.maintenancePaidThrough,
      paymentCount: row.maintenancePaymentCount,
    }, now);
    return {
      ...row,
      maintenancePaidThrough: state.paidThrough,
      maintenanceStatus: state.status,
      nextMaintenanceDueAt: state.nextDueAt,
      maintenanceDaysUntilDue: state.daysUntilDue,
    };
  });
}

export async function listMaintenancePaymentsForShop(shopId: string) {
  await ensureTables();
  return prisma.$queryRaw<LifetimeMaintenancePaymentRow[]>`
    SELECT "id", "lifetimeSubscriptionId", "shopId", "coverageStart", "coverageEnd",
      "amount", "currencyCode", "paidAt", "recordedById", "paymentMethod",
      "paymentReference", "adminNotes", "createdAt"
    FROM "LifetimeMaintenancePayment"
    WHERE "shopId" = ${shopId}::uuid
    ORDER BY "coverageStart" DESC, "paidAt" DESC
  `;
}

export async function getMaintenanceAccountForShop(shopId: string, now = new Date()): Promise<LifetimeMaintenanceAccount> {
  const lifetime = await getActiveLifetimeForShop(shopId);
  if (!lifetime || lifetime.annualMaintenanceAmount == null || !lifetime.maintenanceStartsAt) {
    return {
      status: "LEGACY",
      annualAmount: lifetime?.annualMaintenanceAmount == null ? null : Number(lifetime.annualMaintenanceAmount),
      currencyCode: lifetime?.maintenanceCurrencyCode ?? lifetime?.currencyCode ?? null,
      startsAt: lifetime?.maintenanceStartsAt ?? null,
      paidThrough: null,
      nextDueAt: null,
      daysUntilDue: null,
      payments: [],
    };
  }

  const payments = await listMaintenancePaymentsForShop(shopId);
  const maxCoverageEnd = payments.reduce<Date | null>((max, payment) => {
    if (!max || payment.coverageEnd > max) return payment.coverageEnd;
    return max;
  }, null);
  const state = resolveMaintenanceState({
    annualMaintenanceAmount: lifetime.annualMaintenanceAmount,
    maintenanceStartsAt: lifetime.maintenanceStartsAt,
    paidThrough: maxCoverageEnd,
    paymentCount: payments.length,
  }, now);

  return {
    status: state.status,
    annualAmount: Number(lifetime.annualMaintenanceAmount),
    currencyCode: lifetime.maintenanceCurrencyCode ?? lifetime.currencyCode,
    startsAt: lifetime.maintenanceStartsAt,
    paidThrough: state.paidThrough,
    nextDueAt: state.nextDueAt,
    daysUntilDue: state.daysUntilDue,
    payments,
  };
}

function nullable(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function addOneYear(value: Date) {
  const next = new Date(value);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

export async function recordAnnualMaintenancePayment(input: {
  shopId: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  adminNotes?: string | null;
}, now = new Date()) {
  const admin = await requireSuperAdmin();
  await ensureTables();

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lifetime-maintenance:${input.shopId}`}))`;

    const rows = await tx.$queryRaw<Array<{
      id: string;
      shopId: string;
      annualMaintenanceAmount: Prisma.Decimal | null;
      maintenanceCurrencyCode: string | null;
      currencyCode: string | null;
      maintenanceStartsAt: Date | null;
    }>>`
      SELECT l."id", l."shopId", l."annualMaintenanceAmount", l."maintenanceCurrencyCode",
        l."currencyCode", l."maintenanceStartsAt"
      FROM "LifetimeSubscription" l
      JOIN "Subscription" s ON s."shopId" = l."shopId"
      WHERE l."shopId" = ${input.shopId}::uuid
        AND l."isActive" = TRUE
        AND s."status" = 'ACTIVE'
        AND s."billingInterval" IS NULL
      LIMIT 1
    `;
    const lifetime = rows[0];
    if (!lifetime) throw new Error("لا يوجد اشتراك مدى الحياة فعال لهذا المتجر.");
    if (lifetime.annualMaintenanceAmount == null || !lifetime.annualMaintenanceAmount.isPositive() || !lifetime.maintenanceStartsAt) {
      throw new Error("هذا الاشتراك لا يملك رسم صيانة سنوي مسجلاً، وغالباً هو من الاشتراكات القديمة.");
    }

    const paidRows = await tx.$queryRaw<Array<{ paidThrough: Date | null }>>`
      SELECT MAX("coverageEnd") AS "paidThrough"
      FROM "LifetimeMaintenancePayment"
      WHERE "lifetimeSubscriptionId" = ${lifetime.id}::uuid
    `;
    const previousPaidThrough = paidRows[0]?.paidThrough ?? null;
    const coverageStart = previousPaidThrough && previousPaidThrough > lifetime.maintenanceStartsAt
      ? previousPaidThrough
      : lifetime.maintenanceStartsAt;
    const coverageEnd = addOneYear(coverageStart);
    const currencyCode = lifetime.maintenanceCurrencyCode ?? lifetime.currencyCode;
    if (!currencyCode) throw new Error("عملة رسم الصيانة السنوي غير محددة.");

    const payments = await tx.$queryRaw<LifetimeMaintenancePaymentRow[]>`
      INSERT INTO "LifetimeMaintenancePayment" (
        "lifetimeSubscriptionId", "shopId", "coverageStart", "coverageEnd",
        "amount", "currencyCode", "paidAt", "recordedById",
        "paymentMethod", "paymentReference", "adminNotes"
      ) VALUES (
        ${lifetime.id}::uuid, ${input.shopId}::uuid, ${coverageStart}, ${coverageEnd},
        ${lifetime.annualMaintenanceAmount}, ${currencyCode}, ${now}, ${admin.userId}::uuid,
        ${nullable(input.paymentMethod)}, ${nullable(input.paymentReference)}, ${nullable(input.adminNotes)}
      )
      RETURNING "id", "lifetimeSubscriptionId", "shopId", "coverageStart", "coverageEnd",
        "amount", "currencyCode", "paidAt", "recordedById", "paymentMethod",
        "paymentReference", "adminNotes", "createdAt"
    `;
    if (!payments[0]) throw new Error("لم يتم إنشاء سجل الدفعة.");
    return { payment: payments[0], coverageStart, coverageEnd };
  }, { timeout: 10_000 });

  return result;
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
  if (price.annualMaintenanceAmount == null || !price.annualMaintenanceAmount.isPositive()) {
    throw new Error("حدد رسم الصيانة والتحديث السنوي لخطة مدى الحياة في هذه الدولة قبل التفعيل.");
  }
  const maintenanceStartsAt = addOneYear(now);

  let wasPreviouslyActivated = false;
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`lifetime-subscription:${input.shopId}`}))`;

    const subscription = await tx.subscription.findUnique({
      where: { shopId: input.shopId },
      select: { id: true, status: true, billingInterval: true },
    });
    if (!subscription) throw new Error("لا يوجد سجل اشتراك لهذا المتجر.");
    wasPreviouslyActivated = subscription.status === SubscriptionStatus.ACTIVE;

    const activeRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT l."id"
      FROM "LifetimeSubscription" l
      WHERE l."shopId" = ${input.shopId}::uuid
        AND l."isActive" = TRUE
        AND ${subscription.status}::text = 'ACTIVE'
        AND ${subscription.billingInterval}::text IS NULL
      LIMIT 1
    `;
    if (activeRows[0]) {
      throw new Error("هذا المتجر مفعل بالفعل باشتراك مدى الحياة.");
    }

    await tx.$executeRaw`
      INSERT INTO "LifetimeSubscription" (
        "shopId", "activatedAt", "activatedById", "pricePaid", "currencyCode",
        "annualMaintenanceAmount", "maintenanceCurrencyCode", "maintenanceStartsAt",
        "paymentMethod", "paymentReference", "adminNotes", "isActive", "updatedAt"
      ) VALUES (
        ${input.shopId}::uuid, ${now}, ${admin.userId}::uuid, ${price.amount}, ${price.currencyCode},
        ${price.annualMaintenanceAmount}, ${price.currencyCode}, ${maintenanceStartsAt},
        ${nullable(input.paymentMethod)}, ${nullable(input.paymentReference)}, ${nullable(input.adminNotes)}, TRUE, NOW()
      )
      ON CONFLICT ("shopId") DO UPDATE SET
        "activatedAt" = EXCLUDED."activatedAt",
        "activatedById" = EXCLUDED."activatedById",
        "pricePaid" = EXCLUDED."pricePaid",
        "currencyCode" = EXCLUDED."currencyCode",
        "annualMaintenanceAmount" = EXCLUDED."annualMaintenanceAmount",
        "maintenanceCurrencyCode" = EXCLUDED."maintenanceCurrencyCode",
        "maintenanceStartsAt" = EXCLUDED."maintenanceStartsAt",
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

  const lifetime = await getActiveLifetimeForShop(input.shopId);
  await captureShopOwnerEvent({
    event: ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED,
    shopId: input.shopId,
    countryCode: shop.countryCode,
    properties: {
      billing_interval: "lifetime",
      activation_type: wasPreviouslyActivated ? "upgrade_to_lifetime" : "first_paid_activation",
      channel: "lifetime",
      is_lifetime: true,
      paid_amount: Number(price.amount),
      annual_maintenance_amount: Number(price.annualMaintenanceAmount),
      annual_maintenance_starts_at: maintenanceStartsAt.toISOString(),
      currency_code: price.currencyCode,
    },
  });
  return lifetime;
}

export const lifetimeSubscriptionService = {
  ensureTables,
  listLifetimePrices,
  getLifetimePriceForCountry,
  getActiveLifetimeForShop,
  listLifetimeSubscriptions,
  listMaintenancePaymentsForShop,
  getMaintenanceAccountForShop,
  recordAnnualMaintenancePayment,
  activateLifetimeSubscription,
};
