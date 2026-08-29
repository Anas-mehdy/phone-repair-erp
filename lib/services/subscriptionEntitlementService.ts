/**
 * Central Subscription Entitlement Service for Massar ERP.
 *
 * Security contract:
 * - shopId comes from verified server-side context, never browser authorization input.
 * - plan/status/timestamps are database-authoritative.
 * - tenant queries are scoped by shopId.
 * - Subscription mutations are Super Admin operations protected by requireSuperAdmin().
 */

import {
  MembershipRole,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EntitlementDenyCode =
  | "SUBSCRIPTION_EXPIRED"
  | "REPAIR_LIMIT_REACHED"
  | "EMPLOYEE_LIMIT_REACHED"
  | "COMPATIBILITY_SEARCH_LIMIT_REACHED";

export type EffectiveStatus =
  | "TRIALING"
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "EXPIRED"
  | "CANCELED";

export type EffectivePlan = "TRIAL_AS_PROFESSIONAL" | "BASIC" | "PROFESSIONAL";

export type SubscriptionSnapshot = {
  shopId: string;
  storedPlan: SubscriptionPlan;
  effectivePlan: EffectivePlan;
  effectiveStatus: EffectiveStatus;
  computedAt: Date;
  trialStartedAt: Date;
  trialEndsAt: Date;
  currentPeriodStartedAt: Date | null;
  currentPeriodEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
};

export type PlanLimits = {
  monthlyRepairOrders: number | null;
  totalSeats: number | null;
  dailyCompatibilitySearches: number | null;
};

export type UsageSnapshot = {
  repairOrdersThisMonth: number;
  activeSeats: number;
  compatibilitySearchesToday: number;
};

export type EntitlementContext = {
  subscription: SubscriptionSnapshot;
  limits: PlanLimits;
  usage: UsageSnapshot;
  isOperationallyActive: boolean;
  canCreateRepairOrder: boolean;
  canAddEmployee: boolean;
  canPerformCompatibilitySearch: boolean;
};

export type EntitlementResult =
  | { allowed: true }
  | {
      allowed: false;
      code: EntitlementDenyCode;
      message: string;
      upgradeUrl: string;
    };

export type RepairOrderCreateCallback<T> = (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
) => Promise<T>;

const UPGRADE_URL = "/subscription";
const REPAIR_ORDER_MONTHLY_LIMIT = 100;

export const PLAN_LIMITS: Record<EffectivePlan, PlanLimits> = {
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
    monthlyRepairOrders: REPAIR_ORDER_MONTHLY_LIMIT,
    totalSeats: 1,
    dailyCompatibilitySearches: 10,
  },
};

export function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcStartOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function utcStartOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function utcMonthLockKey(shopId: string, date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `repair-limit:${shopId}:${date.getUTCFullYear()}-${month}`;
}

export function computeEffectiveStatus(
  storedStatus: SubscriptionStatus,
  trialEndsAt: Date,
  currentPeriodStartedAt: Date | null,
  currentPeriodEndsAt: Date | null,
  gracePeriodEndsAt: Date | null,
  now: Date
): EffectiveStatus {
  switch (storedStatus) {
    case SubscriptionStatus.TRIALING:
      return trialEndsAt.getTime() > now.getTime() ? "TRIALING" : "EXPIRED";

    case SubscriptionStatus.ACTIVE:
      if (currentPeriodStartedAt && currentPeriodStartedAt.getTime() > now.getTime()) {
        return "EXPIRED";
      }
      if (!currentPeriodEndsAt) return "EXPIRED";
      return currentPeriodEndsAt.getTime() > now.getTime() ? "ACTIVE" : "EXPIRED";

    case SubscriptionStatus.GRACE_PERIOD:
      if (!gracePeriodEndsAt) return "EXPIRED";
      return gracePeriodEndsAt.getTime() > now.getTime() ? "GRACE_PERIOD" : "EXPIRED";

    case SubscriptionStatus.CANCELED:
      return "CANCELED";

    case SubscriptionStatus.EXPIRED:
    default:
      return "EXPIRED";
  }
}

export function computeEffectivePlan(
  effectiveStatus: EffectiveStatus,
  storedPlan: SubscriptionPlan
): EffectivePlan {
  if (effectiveStatus === "TRIALING") return "TRIAL_AS_PROFESSIONAL";
  if (effectiveStatus === "ACTIVE" || effectiveStatus === "GRACE_PERIOD") {
    return storedPlan === SubscriptionPlan.BASIC ? "BASIC" : "PROFESSIONAL";
  }
  return storedPlan === SubscriptionPlan.BASIC ? "BASIC" : "PROFESSIONAL";
}

async function getSubscriptionSnapshot(
  shopId: string,
  now: Date
): Promise<SubscriptionSnapshot> {
  const sub = await prisma.subscription.findUnique({
    where: { shopId },
    select: {
      plan: true,
      status: true,
      trialStartedAt: true,
      trialEndsAt: true,
      currentPeriodStartedAt: true,
      currentPeriodEndsAt: true,
      gracePeriodEndsAt: true,
    },
  });

  if (!sub) {
    console.warn(
      `[EntitlementService] No Subscription record found for shopId=${shopId}. Failing closed.`,
    );
    return {
      shopId,
      storedPlan: SubscriptionPlan.PROFESSIONAL,
      effectivePlan: "PROFESSIONAL",
      effectiveStatus: "EXPIRED",
      computedAt: now,
      trialStartedAt: now,
      trialEndsAt: now,
      currentPeriodStartedAt: null,
      currentPeriodEndsAt: null,
      gracePeriodEndsAt: null,
    };
  }

  const effectiveStatus = computeEffectiveStatus(
    sub.status,
    sub.trialEndsAt,
    sub.currentPeriodStartedAt ?? null,
    sub.currentPeriodEndsAt ?? null,
    sub.gracePeriodEndsAt ?? null,
    now,
  );

  return {
    shopId,
    storedPlan: sub.plan,
    effectivePlan: computeEffectivePlan(effectiveStatus, sub.plan),
    effectiveStatus,
    computedAt: now,
    trialStartedAt: sub.trialStartedAt,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodStartedAt: sub.currentPeriodStartedAt ?? null,
    currentPeriodEndsAt: sub.currentPeriodEndsAt ?? null,
    gracePeriodEndsAt: sub.gracePeriodEndsAt ?? null,
  };
}

async function countMonthlyRepairOrders(shopId: string, now: Date): Promise<number> {
  return prisma.repairOrder.count({
    where: {
      shopId,
      createdAt: {
        gte: utcStartOfMonth(now),
        lt: utcStartOfNextMonth(now),
      },
      deletedAt: null,
    },
  });
}

/**
 * Legacy shops can authenticate without an OWNER Membership row. Their legacy
 * owner still occupies the single BASIC seat and must not be reported as zero.
 */
async function countActiveSeats(shopId: string): Promise<number> {
  const [activeMemberships, activeOwnerMembership] = await Promise.all([
    prisma.membership.count({
      where: { shopId, status: "ACTIVE", deletedAt: null },
    }),
    prisma.membership.findFirst({
      where: {
        shopId,
        role: MembershipRole.OWNER,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);

  if (activeOwnerMembership) return activeMemberships;

  const legacyOwner = await prisma.user.findFirst({
    where: {
      shopId,
      role: UserRole.OWNER,
      deletedAt: null,
    },
    select: { id: true },
  });

  return activeMemberships + (legacyOwner ? 1 : 0);
}

async function readCompatibilitySearchesToday(shopId: string, now: Date): Promise<number> {
  const today = toUtcDateOnly(now);
  const row = await prisma.compatibilitySearchUsage.findUnique({
    where: { shopId_usageDate: { shopId, usageDate: today } },
    select: { searchCount: true },
  });
  return row?.searchCount ?? 0;
}

export async function incrementCompatibilitySearch(
  shopId: string,
  now: Date = new Date()
): Promise<number> {
  const today = toUtcDateOnly(now);
  const result = await prisma.$queryRaw<Array<{ searchCount: number }>>`
    INSERT INTO "CompatibilitySearchUsage"
      ("id", "shopId", "usageDate", "searchCount", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid(), ${shopId}::uuid, ${today}::date, 1, NOW(), NOW())
    ON CONFLICT ("shopId", "usageDate")
    DO UPDATE SET
      "searchCount" = "CompatibilitySearchUsage"."searchCount" + 1,
      "updatedAt"   = NOW()
    RETURNING "searchCount"
  `;
  return result[0]?.searchCount ?? 1;
}

export async function incrementCompatibilitySearchEnforced(
  shopId: string,
  limit: number,
  now: Date = new Date()
): Promise<number | null> {
  if (limit <= 0) return null;

  const today = toUtcDateOnly(now);
  const result = await prisma.$queryRaw<Array<{ searchCount: number }>>`
    INSERT INTO "CompatibilitySearchUsage"
      ("id", "shopId", "usageDate", "searchCount", "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid(), ${shopId}::uuid, ${today}::date, 1, NOW(), NOW())
    ON CONFLICT ("shopId", "usageDate")
    DO UPDATE SET
      "searchCount" = "CompatibilitySearchUsage"."searchCount" + 1,
      "updatedAt"   = NOW()
    WHERE "CompatibilitySearchUsage"."searchCount" < ${limit}
    RETURNING "searchCount"
  `;

  return result[0]?.searchCount ?? null;
}

/**
 * Concurrency-safe RepairOrder creation guard.
 *
 * A transaction-scoped PostgreSQL advisory lock serializes creation attempts
 * for the same shop + UTC calendar month. The lock remains held while the
 * callback runs, even if the existing RepairOrder service uses its own Prisma
 * transaction. Therefore a second guarded request cannot perform its COUNT
 * until the first creation has committed and released the lock.
 *
 * This avoids duplicating the large RepairOrder creation workflow or requiring
 * its inventory/customer logic to be rewritten solely for subscription limits.
 */
export async function withRepairOrderLimitGuard<T>(
  shopId: string,
  callback: RepairOrderCreateCallback<T>,
  now: Date = new Date(),
): Promise<
  | { result: T }
  | {
      denied: true;
      code: EntitlementDenyCode;
      message: string;
      upgradeUrl: string;
    }
> {
  const monthStart = utcStartOfMonth(now);
  const nextMonthStart = utcStartOfNextMonth(now);
  const lockKey = utcMonthLockKey(shopId, now);

  const outcome = await prisma.$transaction(
    async (tx) => {
      // A 64-bit hash gives a stable lock key. Hash collisions only cause extra
      // serialization; they cannot allow a limit bypass.
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
      `;

      const sub = await tx.subscription.findUnique({
        where: { shopId },
        select: {
          plan: true,
          status: true,
          trialEndsAt: true,
          currentPeriodStartedAt: true,
          currentPeriodEndsAt: true,
          gracePeriodEndsAt: true,
        },
      });

      if (!sub) {
        return {
          denied: true,
          code: "SUBSCRIPTION_EXPIRED" as EntitlementDenyCode,
          message:
            "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
          upgradeUrl: UPGRADE_URL,
        } as const;
      }

      const effectiveStatus = computeEffectiveStatus(
        sub.status,
        sub.trialEndsAt,
        sub.currentPeriodStartedAt ?? null,
        sub.currentPeriodEndsAt ?? null,
        sub.gracePeriodEndsAt ?? null,
        now,
      );

      const isOperationallyActive =
        effectiveStatus === "TRIALING" ||
        effectiveStatus === "ACTIVE" ||
        effectiveStatus === "GRACE_PERIOD";

      if (!isOperationallyActive) {
        return {
          denied: true,
          code: "SUBSCRIPTION_EXPIRED" as EntitlementDenyCode,
          message:
            "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
          upgradeUrl: UPGRADE_URL,
        } as const;
      }

      const effectivePlan = computeEffectivePlan(effectiveStatus, sub.plan);
      const limit = PLAN_LIMITS[effectivePlan].monthlyRepairOrders;

      if (limit !== null) {
        const count = await tx.repairOrder.count({
          where: {
            shopId,
            createdAt: { gte: monthStart, lt: nextMonthStart },
            deletedAt: null,
          },
        });

        if (count >= limit) {
          return {
            denied: true,
            code: "REPAIR_LIMIT_REACHED" as EntitlementDenyCode,
            message: `استخدمت ${limit} من أصل ${limit} تذكرة لهذا الشهر.`,
            upgradeUrl: UPGRADE_URL,
          } as const;
        }
      }

      const created = await callback(tx);
      return { created } as const;
    },
    { isolationLevel: "ReadCommitted", timeout: 30000 },
  );

  if ("denied" in outcome && outcome.denied) {
    return {
      denied: true,
      code: outcome.code,
      message: outcome.message,
      upgradeUrl: outcome.upgradeUrl,
    };
  }

  return { result: (outcome as { created: T }).created };
}

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

  // BASIC is explicitly owner-only. Existing employees are preserved, but no
  // new employee or reactivation is allowed while BASIC governs entitlements.
  const canAddEmployee = isOperationallyActive && limits.totalSeats === null;

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

export async function checkCanCreateNewOperation(
  shopId: string,
  now: Date = new Date(),
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);
  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  return { allowed: true };
}

export async function checkCanCreateRepairOrder(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);
  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  if (!ctx.canCreateRepairOrder) {
    return {
      allowed: false,
      code: "REPAIR_LIMIT_REACHED",
      message: `استخدمت ${ctx.limits.monthlyRepairOrders!} من أصل ${ctx.limits.monthlyRepairOrders!} تذكرة لهذا الشهر.`,
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
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  if (!ctx.canAddEmployee) {
    return {
      allowed: false,
      code: "EMPLOYEE_LIMIT_REACHED",
      message:
        "الخطة الأساسية مخصصة لمستخدم واحد. الترقية للاحترافية تتيح إضافة الموظفين.",
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
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  if (!ctx.canPerformCompatibilitySearch) {
    return {
      allowed: false,
      code: "COMPATIBILITY_SEARCH_LIMIT_REACHED",
      message:
        "استخدمت عمليات البحث العشر المتاحة اليوم. يمكنك المحاولة غداً أو الترقية للخطة الاحترافية.",
      upgradeUrl: UPGRADE_URL,
    };
  }
  return { allowed: true };
}

export const entitlementService = {
  getEntitlementContext,
  checkCanCreateNewOperation,
  checkCanCreateRepairOrder,
  checkCanAddEmployee,
  checkCanPerformCompatibilitySearch,
  withRepairOrderLimitGuard,
  incrementCompatibilitySearch,
  incrementCompatibilitySearchEnforced,
  toUtcDateOnly,
};
