/**
 * subscriptionEntitlementService.ts
 *
 * Central Entitlement Service — the ONLY source of truth for subscription
 * and usage gate-keeping across Massar ERP.
 *
 * SECURITY CONTRACT:
 *  1. shopId MUST be sourced from verified server-side context, never browser input.
 *  2. plan, status, and subscription timestamps are database-authoritative.
 *  3. Every tenant query is scoped by shopId.
 *  4. Subscription mutations are Super Admin operations and MUST use requireSuperAdmin().
 *  5. Prisma is used server-side; these tables are not exposed to the client directly.
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
 * Counts active seats while preserving compatibility with legacy shops that
 * still authenticate through User.shopId/User.role and do not yet have an
 * OWNER Membership row. Production contains such shops, so a legacy owner must
 * still count as the one BASIC seat rather than being reported as zero.
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

function isSerializableRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (code === "40001" || code === "P2034") return true;

  const meta = "meta" in error ? (error as { meta?: Record<string, unknown> }).meta : undefined;
  const metaCode = meta?.code ? String(meta.code) : "";
  return metaCode === "40001";
}

/**
 * Runs the entitlement check, monthly COUNT and the real RepairOrder CREATE
 * callback inside one SERIALIZABLE transaction. The callback MUST use the
 * supplied TransactionClient; otherwise the concurrency guarantee is lost.
 */
export async function withRepairOrderLimitGuard<T>(
  shopId: string,
  callback: RepairOrderCreateCallback<T>,
  now: Date = new Date(),
  maxRetries = 4,
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

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      const outcome = await prisma.$transaction(
        async (tx) => {
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
        { isolationLevel: "Serializable", timeout: 15000 },
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
    } catch (error) {
      if (isSerializableRetryableError(error) && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
        continue;
      }
      throw error;
    }
  }

  throw new Error("تعذر إتمام العملية بأمان بعد عدة محاولات متزامنة. حاول مرة أخرى.");
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

  // BASIC is explicitly an owner-only plan. Do not infer permission to add a
  // worker from activeSeats < 1 because legacy shops can have no Membership row
  // for the owner. Existing employees are preserved; only NEW additions are denied.
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

/** Generic guard for creation types that have no BASIC quota beyond subscription activity. */
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
