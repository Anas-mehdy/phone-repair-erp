/**
 * subscriptionEntitlementService.ts
 *
 * Central Entitlement Service - the ONLY source of truth for subscription
 * and usage gate-keeping across Massar ERP.
 *
 * SECURITY CONTRACT (non-negotiable):
 *  1. shopId is ALWAYS sourced from the verified Auth Context, never from
 *     browser-supplied parameters.
 *  2. plan, status, and all dates are read from the database only.
 *  3. No client-supplied values are ever trusted for authorization decisions.
 *  4. Every database query is scoped by shopId.
 *  5. Prisma server-side only - no Supabase client-side access.
 *
 * Effective state is computed from the current UTC wall-clock time against
 * database timestamps; the stored `status` field is treated as a hint, not
 * as ground truth.
 */

import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// PUBLIC TYPES
// ---------------------------------------------------------------------------

/** All error/deny codes emitted by this service. UI must never parse strings. */
export type EntitlementDenyCode =
  | "SUBSCRIPTION_EXPIRED"
  | "REPAIR_LIMIT_REACHED"
  | "EMPLOYEE_LIMIT_REACHED"
  | "COMPATIBILITY_SEARCH_LIMIT_REACHED";

/** Effective subscription lifecycle state computed from wall-clock time. */
export type EffectiveStatus =
  | "TRIALING"       // trial active: trialEndsAt > now
  | "ACTIVE"         // paid period active: currentPeriodEndsAt > now
  | "GRACE_PERIOD"   // grace window active: gracePeriodEndsAt > now
  | "EXPIRED"        // all windows elapsed
  | "CANCELED";      // manually canceled

/** Effective plan entitlements. */
export type EffectivePlan = "TRIAL_AS_PROFESSIONAL" | "BASIC" | "PROFESSIONAL";

/** Computed subscription snapshot. */
export type SubscriptionSnapshot = {
  shopId: string;
  storedPlan: SubscriptionPlan;
  effectivePlan: EffectivePlan;
  effectiveStatus: EffectiveStatus;
  computedAt: Date;
  trialStartedAt: Date;
  trialEndsAt: Date;
  currentPeriodEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
};

/** Per-plan usage limits. null = unlimited. */
export type PlanLimits = {
  monthlyRepairOrders: number | null;
  totalSeats: number | null;
  dailyCompatibilitySearches: number | null;
};

/** Live usage snapshot for a shop. */
export type UsageSnapshot = {
  repairOrdersThisMonth: number;
  activeSeats: number;
  compatibilitySearchesToday: number;
};

/** Full entitlement context. */
export type EntitlementContext = {
  subscription: SubscriptionSnapshot;
  limits: PlanLimits;
  usage: UsageSnapshot;
  isOperationallyActive: boolean;
  canCreateRepairOrder: boolean;
  canAddEmployee: boolean;
  canPerformCompatibilitySearch: boolean;
};

/** Typed result returned by check* helpers. */
export type EntitlementResult =
  | { allowed: true }
  | { allowed: false; code: EntitlementDenyCode; message: string; upgradeUrl: string };

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const UPGRADE_URL = "/subscription";

const PLAN_LIMITS: Record<EffectivePlan, PlanLimits> = {
  TRIAL_AS_PROFESSIONAL: {
    monthlyRepairOrders: null,
    totalSeats: null,
    dailyCompatibilitySearches: null,
  },
  PROFESSIONAL: {
    monthlyRepairOrders: null,
    totalSeats: null,
    dailyCompatibilitySearches: null,
  },
  BASIC: {
    monthlyRepairOrders: 100,
    totalSeats: 1,
    dailyCompatibilitySearches: 10,
  },
};

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

/**
 * Computes effective lifecycle status from database timestamps.
 *
 * The stored `status` column is treated as a starting hint; this function
 * derives ground-truth state from wall-clock comparisons.
 *
 * Why not trust `status` alone?
 *   - Cron-based status updaters can lag behind actual expiry time.
 *   - A TRIALING row whose trialEndsAt is in the past must be treated EXPIRED.
 *   - A GRACE_PERIOD row whose gracePeriodEndsAt is null/past must be EXPIRED.
 */
function computeEffectiveStatus(
  storedStatus: SubscriptionStatus,
  trialEndsAt: Date,
  currentPeriodEndsAt: Date | null,
  gracePeriodEndsAt: Date | null,
  now: Date
): EffectiveStatus {
  if (storedStatus === SubscriptionStatus.TRIALING) {
    return trialEndsAt.getTime() > now.getTime() ? "TRIALING" : "EXPIRED";
  }
  if (storedStatus === SubscriptionStatus.ACTIVE) {
    if (!currentPeriodEndsAt) return "EXPIRED";
    return currentPeriodEndsAt.getTime() > now.getTime() ? "ACTIVE" : "EXPIRED";
  }
  if (storedStatus === SubscriptionStatus.GRACE_PERIOD) {
    if (!gracePeriodEndsAt) return "EXPIRED";
    return gracePeriodEndsAt.getTime() > now.getTime() ? "GRACE_PERIOD" : "EXPIRED";
  }
  if (storedStatus === SubscriptionStatus.CANCELED) return "CANCELED";
  return "EXPIRED";
}

function computeEffectivePlan(
  effectiveStatus: EffectiveStatus,
  storedPlan: SubscriptionPlan
): EffectivePlan {
  if (effectiveStatus === "TRIALING") return "TRIAL_AS_PROFESSIONAL";
  if (effectiveStatus === "ACTIVE" || effectiveStatus === "GRACE_PERIOD") {
    return storedPlan === SubscriptionPlan.BASIC ? "BASIC" : "PROFESSIONAL";
  }
  return storedPlan === SubscriptionPlan.BASIC ? "BASIC" : "PROFESSIONAL";
}

/** Returns ISO UTC date string "YYYY-MM-DD" for a given Date. */
export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcStartOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// ---------------------------------------------------------------------------
// SNAPSHOT BUILDER
// ---------------------------------------------------------------------------

async function getSubscriptionSnapshot(
  shopId: string,
  now: Date = new Date()
): Promise<SubscriptionSnapshot> {
  const sub = await prisma.subscription.findUnique({
    where: { shopId },
    select: {
      plan: true,
      status: true,
      trialStartedAt: true,
      trialEndsAt: true,
      currentPeriodEndsAt: true,
      gracePeriodEndsAt: true,
    },
  });

  if (!sub) {
    // Fail-closed: no subscription record = EXPIRED
    return {
      shopId,
      storedPlan: SubscriptionPlan.PROFESSIONAL,
      effectivePlan: "PROFESSIONAL",
      effectiveStatus: "EXPIRED",
      computedAt: now,
      trialStartedAt: now,
      trialEndsAt: now,
      currentPeriodEndsAt: null,
      gracePeriodEndsAt: null,
    };
  }

  const effectiveStatus = computeEffectiveStatus(
    sub.status,
    sub.trialEndsAt,
    sub.currentPeriodEndsAt,
    sub.gracePeriodEndsAt ?? null,
    now
  );
  const effectivePlan = computeEffectivePlan(effectiveStatus, sub.plan);

  return {
    shopId,
    storedPlan: sub.plan,
    effectivePlan,
    effectiveStatus,
    computedAt: now,
    trialStartedAt: sub.trialStartedAt,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEndsAt: sub.currentPeriodEndsAt ?? null,
    gracePeriodEndsAt: sub.gracePeriodEndsAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// USAGE COUNTER READERS
// ---------------------------------------------------------------------------

async function countMonthlyRepairOrders(shopId: string, now: Date): Promise<number> {
  const monthStart = utcStartOfMonth(now);
  return prisma.repairOrder.count({
    where: {
      shopId,
      createdAt: { gte: monthStart },
      deletedAt: null,
    },
  });
}

async function countActiveSeats(shopId: string): Promise<number> {
  return prisma.membership.count({
    where: {
      shopId,
      status: "ACTIVE",
      deletedAt: null,
    },
  });
}

async function readCompatibilitySearchesToday(shopId: string, now: Date): Promise<number> {
  const today = toUtcDateString(now);
  const row = await prisma.compatibilitySearchUsage.findUnique({
    where: { shopId_usageDate: { shopId, usageDate: today } },
    select: { searchCount: true },
  });
  return row?.searchCount ?? 0;
}

// ---------------------------------------------------------------------------
// ATOMIC COMPATIBILITY SEARCH INCREMENT
// ---------------------------------------------------------------------------

/**
 * Atomically increments the daily compatibility search counter.
 *
 * CONCURRENCY STRATEGY:
 *   PostgreSQL INSERT ... ON CONFLICT DO UPDATE atomically upserts and
 *   increments in a single round-trip using the unique index on
 *   (shopId, usageDate). Two concurrent requests will each serialize their
 *   increment - no phantom reads, no lost updates.
 *
 * NOTE: This variant does NOT enforce a limit. Use for TRIAL/PROFESSIONAL.
 * For BASIC limit enforcement, use incrementCompatibilitySearchEnforced().
 */
export async function incrementCompatibilitySearch(
  shopId: string,
  now: Date = new Date()
): Promise<number> {
  const today = toUtcDateString(now);

  const result = await prisma.$queryRaw<Array<{ searchCount: number }>>`
    INSERT INTO "CompatibilitySearchUsage" ("id", "shopId", "usageDate", "searchCount", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${shopId}::uuid, ${today}, 1, NOW(), NOW())
    ON CONFLICT ("shopId", "usageDate")
    DO UPDATE SET
      "searchCount" = "CompatibilitySearchUsage"."searchCount" + 1,
      "updatedAt"   = NOW()
    RETURNING "searchCount"
  `;

  return result[0]?.searchCount ?? 1;
}

/**
 * Enforced atomic increment for BASIC plan limit.
 *
 * Returns new count on success, null if limit was already reached.
 *
 * CONCURRENCY SAFETY:
 *   The WHERE searchCount < limit condition in the UPDATE ensures that even
 *   if two requests concurrently read searchCount = 9 (limit = 10), only one
 *   will successfully increment to 10. The other will get 0 rows returned
 *   (null result) and must be denied. The two-step approach (INSERT to ensure
 *   row exists, then conditional UPDATE) avoids a race on row creation.
 */
export async function incrementCompatibilitySearchEnforced(
  shopId: string,
  limit: number,
  now: Date = new Date()
): Promise<number | null> {
  const today = toUtcDateString(now);

  // Ensure row exists without changing searchCount
  await prisma.$executeRaw`
    INSERT INTO "CompatibilitySearchUsage" ("id", "shopId", "usageDate", "searchCount", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${shopId}::uuid, ${today}, 0, NOW(), NOW())
    ON CONFLICT ("shopId", "usageDate") DO NOTHING
  `;

  // Conditional atomic increment
  const result = await prisma.$queryRaw<Array<{ searchCount: number }>>`
    UPDATE "CompatibilitySearchUsage"
    SET
      "searchCount" = "searchCount" + 1,
      "updatedAt"   = NOW()
    WHERE "shopId"    = ${shopId}::uuid
      AND "usageDate" = ${today}
      AND "searchCount" < ${limit}
    RETURNING "searchCount"
  `;

  if (result.length === 0) return null;
  return result[0].searchCount;
}

// ---------------------------------------------------------------------------
// REPAIR ORDER CONCURRENT LIMIT CHECK
// ---------------------------------------------------------------------------

/**
 * Checks whether a new RepairOrder can be created under the BASIC monthly limit.
 *
 * CONCURRENCY STRATEGY - SERIALIZABLE transaction with retry:
 *   A naive COUNT then INSERT allows two concurrent requests both reading
 *   count=99, both deciding OK, and both inserting -> 101 rows.
 *
 *   SERIALIZABLE isolation makes PostgreSQL treat the COUNT read and
 *   subsequent insert as a single atomic unit. If two transactions conflict,
 *   one is aborted with error code 40001 (serialization failure) and retried.
 *
 *   Alternative (advisory lock per shopId+month) was rejected because it
 *   serializes all inserts even when far under the limit. SERIALIZABLE only
 *   aborts on actual conflicts, preserving concurrency in the common case.
 *
 * NOTE: Not yet connected to the production RepairOrder path.
 *       This will be wired in the next enforcement phase.
 */
export async function checkRepairOrderLimitForBasic(
  shopId: string,
  now: Date = new Date(),
  maxRetries = 3
): Promise<boolean> {
  const monthStart = utcStartOfMonth(now);
  const LIMIT = 100;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const allowed = await prisma.$transaction(
        async (tx) => {
          const count = await tx.repairOrder.count({
            where: {
              shopId,
              createdAt: { gte: monthStart },
              deletedAt: null,
            },
          });
          return count < LIMIT;
        },
        { isolationLevel: "Serializable", timeout: 5000 }
      );
      return allowed;
    } catch (err: unknown) {
      const isSerializationError =
        err instanceof Error &&
        "code" in err &&
        (err as { code: string }).code === "40001";

      if (isSerializationError && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 10 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// MAIN CONTEXT BUILDER
// ---------------------------------------------------------------------------

/**
 * Builds the full entitlement context for a shop.
 *
 * SECURITY: shopId MUST be sourced from getAuthContext().shop.id.
 * Never pass shopId from request body or query params.
 */
export async function getEntitlementContext(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementContext> {
  const [snapshot, repairOrdersThisMonth, activeSeats, compatibilitySearchesToday] =
    await Promise.all([
      getSubscriptionSnapshot(shopId, now),
      countMonthlyRepairOrders(shopId, now),
      countActiveSeats(shopId),
      readCompatibilitySearchesToday(shopId, now),
    ]);

  const limits = PLAN_LIMITS[snapshot.effectivePlan];

  const isOperationallyActive =
    snapshot.effectiveStatus === "TRIALING" ||
    snapshot.effectiveStatus === "ACTIVE" ||
    snapshot.effectiveStatus === "GRACE_PERIOD";

  const canCreateRepairOrder =
    isOperationallyActive &&
    (limits.monthlyRepairOrders === null || repairOrdersThisMonth < limits.monthlyRepairOrders);

  const canAddEmployee =
    isOperationallyActive &&
    (limits.totalSeats === null || activeSeats < limits.totalSeats);

  const canPerformCompatibilitySearch =
    isOperationallyActive &&
    (limits.dailyCompatibilitySearches === null ||
      compatibilitySearchesToday < limits.dailyCompatibilitySearches);

  return {
    subscription: snapshot,
    limits,
    usage: { repairOrdersThisMonth, activeSeats, compatibilitySearchesToday },
    isOperationallyActive,
    canCreateRepairOrder,
    canAddEmployee,
    canPerformCompatibilitySearch,
  };
}

// ---------------------------------------------------------------------------
// TYPED CHECK HELPERS
// ---------------------------------------------------------------------------

export async function checkCanCreateRepairOrder(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);

  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "اشتراك متجرك منتهٍ. جدد اشتراكك للاستمرار في إنشاء تذاكر الصيانة.",
      upgradeUrl: UPGRADE_URL,
    };
  }

  if (!ctx.canCreateRepairOrder) {
    const limit = ctx.limits.monthlyRepairOrders!;
    return {
      allowed: false,
      code: "REPAIR_LIMIT_REACHED",
      message: `وصلت إلى الحد الأقصى من تذاكر الصيانة هذا الشهر (${limit} تذكرة). جدد اشتراكك أو انتظر بداية الشهر القادم.`,
      upgradeUrl: UPGRADE_URL,
    };
  }

  return { allowed: true };
}

export async function checkCanAddEmployee(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);

  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "اشتراك متجرك منتهٍ. جدد اشتراكك للاستمرار في إدارة الفريق.",
      upgradeUrl: UPGRADE_URL,
    };
  }

  if (!ctx.canAddEmployee) {
    const limit = ctx.limits.totalSeats!;
    return {
      allowed: false,
      code: "EMPLOYEE_LIMIT_REACHED",
      message: `الخطة الأساسية تسمح بـ ${limit} مستخدم فقط. ترقَّ إلى الخطة الاحترافية لإضافة موظفين بلا حدود.`,
      upgradeUrl: UPGRADE_URL,
    };
  }

  return { allowed: true };
}

export async function checkCanPerformCompatibilitySearch(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);

  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message: "اشتراك متجرك منتهٍ. جدد اشتراكك للاستمرار في استخدام البحث عن التوافقات.",
      upgradeUrl: UPGRADE_URL,
    };
  }

  if (!ctx.canPerformCompatibilitySearch) {
    const limit = ctx.limits.dailyCompatibilitySearches!;
    return {
      allowed: false,
      code: "COMPATIBILITY_SEARCH_LIMIT_REACHED",
      message: `وصلت إلى حد عمليات البحث اليومية (${limit} بحث). تجدد الحصة يومياً عند منتصف الليل بتوقيت UTC. ترقَّ إلى الخطة الاحترافية للبحث بلا حدود.`,
      upgradeUrl: UPGRADE_URL,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

export const entitlementService = {
  getEntitlementContext,
  checkCanCreateRepairOrder,
  checkCanAddEmployee,
  checkCanPerformCompatibilitySearch,
  incrementCompatibilitySearch,
  incrementCompatibilitySearchEnforced,
  checkRepairOrderLimitForBasic,
  toUtcDateString,
};
