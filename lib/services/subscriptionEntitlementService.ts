/**
 * Central Subscription Entitlement Service for Massar ERP.
 *
 * Single-plan contract:
 * - Trial and paid subscriptions include all core product features.
 * - Repair orders and compatibility searches are unlimited.
 * - The only product-usage limit is 5 total active seats, including the owner.
 * - EXPIRED/CANCELED subscriptions remain readable but cannot create new operations.
 * - shopId comes from verified server-side context, never browser authorization input.
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

/**
 * Kept for backward-compatible typing while BASIC remains in the PostgreSQL enum.
 * Operationally, all active subscriptions now use the same comprehensive plan.
 */
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

export type RepairOrderCreateCallback<T> = () => Promise<T>;

const SUPPORT_URL = "/support";
export const TOTAL_SEAT_LIMIT = 5;

/**
 * BASIC is retained only as legacy enum compatibility. It no longer represents
 * a different commercial entitlement. All operational plans have the same limits.
 */
export const PLAN_LIMITS: Record<EffectivePlan, PlanLimits> = {
  TRIAL_AS_PROFESSIONAL: {
    monthlyRepairOrders: null,
    totalSeats: TOTAL_SEAT_LIMIT,
    dailyCompatibilitySearches: null,
  },
  PROFESSIONAL: {
    monthlyRepairOrders: null,
    totalSeats: TOTAL_SEAT_LIMIT,
    dailyCompatibilitySearches: null,
  },
  BASIC: {
    monthlyRepairOrders: null,
    totalSeats: TOTAL_SEAT_LIMIT,
    dailyCompatibilitySearches: null,
  },
};

/** Retained for compatibility with existing callers/tests; usage counters are retired. */
export function toUtcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function computeEffectiveStatus(
  storedStatus: SubscriptionStatus,
  trialEndsAt: Date,
  currentPeriodStartedAt: Date | null,
  currentPeriodEndsAt: Date | null,
  gracePeriodEndsAt: Date | null,
  now: Date,
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
  storedPlan: SubscriptionPlan,
): EffectivePlan {
  // BASIC remains in the persisted enum for backward compatibility only.
  // Reading the parameter makes that compatibility contract explicit while
  // mapping every non-trial subscription to the single comprehensive plan.
  void storedPlan;
  return effectiveStatus === "TRIALING" ? "TRIAL_AS_PROFESSIONAL" : "PROFESSIONAL";
}

async function getSubscriptionSnapshot(
  shopId: string,
  now: Date,
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

/**
 * Legacy shops can authenticate without an OWNER Membership row. Their legacy
 * owner still occupies one of the five seats and must not be reported as zero.
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

function isOperationallyActive(status: EffectiveStatus): boolean {
  return status === "TRIALING" || status === "ACTIVE" || status === "GRACE_PERIOD";
}

/**
 * Repair creation no longer has a monthly quota. The wrapper remains so current
 * call sites keep one central subscription-state gate without concurrency locks.
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
  const snapshot = await getSubscriptionSnapshot(shopId, now);

  if (!isOperationallyActive(snapshot.effectiveStatus)) {
    return {
      denied: true,
      code: "SUBSCRIPTION_EXPIRED",
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.",
      upgradeUrl: SUPPORT_URL,
    };
  }

  return { result: await callback() };
}

export async function getEntitlementContext(
  shopId: string,
  now: Date = new Date(),
): Promise<EntitlementContext> {
  const [snapshot, activeSeats] = await Promise.all([
    getSubscriptionSnapshot(shopId, now),
    countActiveSeats(shopId),
  ]);

  const limits = PLAN_LIMITS[snapshot.effectivePlan];
  const operational = isOperationallyActive(snapshot.effectiveStatus);

  return {
    subscription: snapshot,
    limits,
    usage: {
      repairOrdersThisMonth: 0,
      activeSeats,
      compatibilitySearchesToday: 0,
    },
    isOperationallyActive: operational,
    canCreateRepairOrder: operational,
    canAddEmployee:
      operational &&
      (limits.totalSeats === null || activeSeats < limits.totalSeats),
    canPerformCompatibilitySearch: operational,
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
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.",
      upgradeUrl: SUPPORT_URL,
    };
  }
  return { allowed: true };
}

export async function checkCanCreateRepairOrder(
  shopId: string,
  now: Date = new Date(),
): Promise<EntitlementResult> {
  return checkCanCreateNewOperation(shopId, now);
}

export async function checkCanAddEmployee(
  shopId: string,
  now: Date = new Date(),
): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);

  if (!ctx.isOperationallyActive) {
    return {
      allowed: false,
      code: "SUBSCRIPTION_EXPIRED",
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.",
      upgradeUrl: SUPPORT_URL,
    };
  }

  if (!ctx.canAddEmployee) {
    return {
      allowed: false,
      code: "EMPLOYEE_LIMIT_REACHED",
      message:
        "وصلت إلى الحد الأقصى المسموح به وهو 5 مستخدمين للمتجر، شامل مالك المتجر.",
      upgradeUrl: SUPPORT_URL,
    };
  }

  return { allowed: true };
}

export async function checkCanPerformCompatibilitySearch(
  shopId: string,
  now: Date = new Date(),
): Promise<EntitlementResult> {
  return checkCanCreateNewOperation(shopId, now);
}

/**
 * Retired compatibility usage APIs kept temporarily as no-op compatibility
 * shims for scripts outside production request paths. They perform no DB writes.
 */
export async function incrementCompatibilitySearch(): Promise<number> {
  return 0;
}

export async function incrementCompatibilitySearchEnforced(): Promise<number> {
  return 0;
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
