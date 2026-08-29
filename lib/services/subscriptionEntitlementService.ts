/**
 * Central Subscription Entitlement Service for Massar ERP.
 *
 * Single Comprehensive Plan Architecture:
 * - All active subscriptions (Trial, Paid, Grace Period) operate with full access.
 * - Repair Orders: Unlimited.
 * - Compatibility Searches: Unlimited.
 * - Sales / Invoices / Installments: Unlimited.
 * - Total Seats Limit: 5 users total (including shop OWNER).
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
  | "EMPLOYEE_LIMIT_REACHED";

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
export const TOTAL_SEAT_LIMIT = 5;

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
  storedPlan?: SubscriptionPlan,
): EffectivePlan {
  // BASIC remains in the persisted enum for backward compatibility only.
  void storedPlan;
  return effectiveStatus === "TRIALING" ? "TRIAL_AS_PROFESSIONAL" : "PROFESSIONAL";
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
 * Counts total active seats including active memberships, pending unexpired invitations,
 * and legacy OWNER users if no active OWNER membership exists.
 */
async function countActiveSeats(shopId: string): Promise<number> {
  const [activeMemberships, activeOwnerMembership, pendingInvitesCount] = await Promise.all([
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
    prisma.shopInvitation.count({
      where: {
        shopId,
        status: "PENDING",
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  let baseActiveSeats = activeMemberships;
  if (!activeOwnerMembership) {
    const legacyOwner = await prisma.user.findFirst({
      where: {
        shopId,
        role: UserRole.OWNER,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (legacyOwner) {
      baseActiveSeats += 1;
    }
  }

  return baseActiveSeats + pendingInvitesCount;
}

/**
 * Concurrency-safe RepairOrder creation guard.
 * Verifies subscription operational status before delegating to creation callback.
 * Repair orders are unlimited for all operationally active subscriptions.
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
  const sub = await prisma.subscription.findUnique({
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
      code: "SUBSCRIPTION_EXPIRED",
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
      upgradeUrl: UPGRADE_URL,
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

  const isOperationallyActive =
    effectiveStatus === "TRIALING" ||
    effectiveStatus === "ACTIVE" ||
    effectiveStatus === "GRACE_PERIOD";

  if (!isOperationallyActive) {
    return {
      denied: true,
      code: "SUBSCRIPTION_EXPIRED",
      message:
        "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.",
      upgradeUrl: UPGRADE_URL,
    };
  }

  const created = await callback(prisma);
  return { result: created };
}

export async function getEntitlementContext(
  shopId: string,
  now: Date = new Date()
): Promise<EntitlementContext> {
  const [snapshot, repairOrdersThisMonth, activeSeats] = await Promise.all([
    getSubscriptionSnapshot(shopId, now),
    countMonthlyRepairOrders(shopId, now),
    countActiveSeats(shopId),
  ]);

  const limits = PLAN_LIMITS[snapshot.effectivePlan];
  const isOperationallyActive =
    snapshot.effectiveStatus === "TRIALING" ||
    snapshot.effectiveStatus === "ACTIVE" ||
    snapshot.effectiveStatus === "GRACE_PERIOD";

  const canCreateRepairOrder = isOperationallyActive;
  const canAddEmployee = isOperationallyActive && activeSeats < TOTAL_SEAT_LIMIT;
  const canPerformCompatibilitySearch = isOperationallyActive;

  return {
    subscription: snapshot,
    limits,
    usage: { repairOrdersThisMonth, activeSeats, compatibilitySearchesToday: 0 },
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
        "وصلت إلى الحد الأقصى المسموح به وهو 5 مستخدمين للمتجر، شامل مالك المتجر.",
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
  return { allowed: true };
}

export const entitlementService = {
  getEntitlementContext,
  checkCanCreateNewOperation,
  checkCanCreateRepairOrder,
  checkCanAddEmployee,
  checkCanPerformCompatibilitySearch,
  withRepairOrderLimitGuard,
};
