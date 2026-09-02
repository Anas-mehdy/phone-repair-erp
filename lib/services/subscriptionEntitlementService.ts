/**
 * Central Subscription Entitlement Service for Massar ERP.
 * Lifetime subscriptions are stored separately and are operationally ACTIVE with no expiry date.
 */

import {
  InvitationStatus,
  MembershipRole,
  MembershipStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lifetimeSubscriptionService } from "@/lib/services/lifetimeSubscriptionService";

export type EntitlementDenyCode = "SUBSCRIPTION_EXPIRED" | "EMPLOYEE_LIMIT_REACHED";
export type EffectiveStatus = "TRIALING" | "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "CANCELED";
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
  isLifetime: boolean;
  lifetimeActivatedAt: Date | null;
  lifetimePrice: number | null;
  lifetimeCurrencyCode: string | null;
};

export type PlanLimits = { monthlyRepairOrders: number | null; totalSeats: number | null; dailyCompatibilitySearches: number | null };
export type UsageSnapshot = { repairOrdersThisMonth: number; activeSeats: number; compatibilitySearchesToday: number };
export type EntitlementContext = {
  subscription: SubscriptionSnapshot;
  limits: PlanLimits;
  usage: UsageSnapshot;
  isOperationallyActive: boolean;
  canCreateRepairOrder: boolean;
  canAddEmployee: boolean;
  canPerformCompatibilitySearch: boolean;
};
export type EntitlementResult = { allowed: true } | { allowed: false; code: EntitlementDenyCode; message: string; upgradeUrl: string };
export type RepairOrderCreateCallback<T> = (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>;
export type SeatMutationCallback<T> = (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>;
export type SeatLimitGuardOptions = { acceptingInvitationId?: string; now?: Date };
export type SeatGuardOutcome<T> = { result: T } | { denied: true; code: EntitlementDenyCode; message: string; upgradeUrl: string };

const UPGRADE_URL = "/support";
export const TOTAL_SEAT_LIMIT = 5;
export const PLAN_LIMITS: Record<EffectivePlan, PlanLimits> = {
  TRIAL_AS_PROFESSIONAL: { monthlyRepairOrders: null, totalSeats: TOTAL_SEAT_LIMIT, dailyCompatibilitySearches: null },
  PROFESSIONAL: { monthlyRepairOrders: null, totalSeats: TOTAL_SEAT_LIMIT, dailyCompatibilitySearches: null },
  BASIC: { monthlyRepairOrders: null, totalSeats: TOTAL_SEAT_LIMIT, dailyCompatibilitySearches: null },
};

export function computeEffectiveStatus(
  storedStatus: SubscriptionStatus,
  trialEndsAt: Date,
  currentPeriodStartedAt: Date | null,
  currentPeriodEndsAt: Date | null,
  gracePeriodEndsAt: Date | null,
  now: Date,
  isLifetime = false,
): EffectiveStatus {
  switch (storedStatus) {
    case SubscriptionStatus.TRIALING:
      return trialEndsAt.getTime() > now.getTime() ? "TRIALING" : "EXPIRED";
    case SubscriptionStatus.ACTIVE:
      if (isLifetime) return "ACTIVE";
      if (currentPeriodStartedAt && currentPeriodStartedAt.getTime() > now.getTime()) return "EXPIRED";
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

export function computeEffectivePlan(effectiveStatus: EffectiveStatus, storedPlan?: SubscriptionPlan): EffectivePlan {
  void storedPlan;
  return effectiveStatus === "TRIALING" ? "TRIAL_AS_PROFESSIONAL" : "PROFESSIONAL";
}

async function getSubscriptionSnapshot(shopId: string, now: Date): Promise<SubscriptionSnapshot> {
  const [sub, lifetime] = await Promise.all([
    prisma.subscription.findUnique({
      where: { shopId },
      select: {
        plan: true,
        status: true,
        billingInterval: true,
        trialStartedAt: true,
        trialEndsAt: true,
        currentPeriodStartedAt: true,
        currentPeriodEndsAt: true,
        gracePeriodEndsAt: true,
      },
    }),
    lifetimeSubscriptionService.getActiveLifetimeForShop(shopId),
  ]);

  if (!sub) {
    console.warn(`[EntitlementService] No Subscription record found for shopId=${shopId}. Failing closed.`);
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
      isLifetime: false,
      lifetimeActivatedAt: null,
      lifetimePrice: null,
      lifetimeCurrencyCode: null,
    };
  }

  const isLifetime = Boolean(lifetime && sub.billingInterval === null && sub.status === SubscriptionStatus.ACTIVE);
  const effectiveStatus = computeEffectiveStatus(
    sub.status,
    sub.trialEndsAt,
    sub.currentPeriodStartedAt ?? null,
    sub.currentPeriodEndsAt ?? null,
    sub.gracePeriodEndsAt ?? null,
    now,
    isLifetime,
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
    isLifetime,
    lifetimeActivatedAt: isLifetime ? lifetime?.activatedAt ?? null : null,
    lifetimePrice: isLifetime && lifetime?.pricePaid != null ? Number(lifetime.pricePaid) : null,
    lifetimeCurrencyCode: isLifetime ? lifetime?.currencyCode ?? null : null,
  };
}

async function countActiveSeats(shopId: string): Promise<number> {
  const [activeMemberships, activeOwnerMembership, pendingInvitesCount] = await Promise.all([
    prisma.membership.count({ where: { shopId, status: MembershipStatus.ACTIVE, deletedAt: null } }),
    prisma.membership.findFirst({ where: { shopId, role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE, deletedAt: null }, select: { id: true } }),
    prisma.shopInvitation.count({ where: { shopId, status: InvitationStatus.PENDING, deletedAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  let baseActiveSeats = activeMemberships;
  if (!activeOwnerMembership) {
    const legacyOwner = await prisma.user.findFirst({ where: { shopId, role: UserRole.OWNER, deletedAt: null }, select: { id: true } });
    if (legacyOwner) baseActiveSeats += 1;
  }
  return baseActiveSeats + pendingInvitesCount;
}

export async function withRepairOrderLimitGuard<T>(
  shopId: string,
  callback: RepairOrderCreateCallback<T>,
  now: Date = new Date(),
): Promise<{ result: T } | { denied: true; code: EntitlementDenyCode; message: string; upgradeUrl: string }> {
  const [sub, lifetime] = await Promise.all([
    prisma.subscription.findUnique({
      where: { shopId },
      select: { plan: true, status: true, billingInterval: true, trialEndsAt: true, currentPeriodStartedAt: true, currentPeriodEndsAt: true, gracePeriodEndsAt: true },
    }),
    lifetimeSubscriptionService.getActiveLifetimeForShop(shopId),
  ]);
  if (!sub) return { denied: true, code: "SUBSCRIPTION_EXPIRED", message: "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.", upgradeUrl: UPGRADE_URL };
  const isLifetime = Boolean(lifetime && sub.billingInterval === null && sub.status === SubscriptionStatus.ACTIVE);
  const effectiveStatus = computeEffectiveStatus(sub.status, sub.trialEndsAt, sub.currentPeriodStartedAt ?? null, sub.currentPeriodEndsAt ?? null, sub.gracePeriodEndsAt ?? null, now, isLifetime);
  const active = effectiveStatus === "TRIALING" || effectiveStatus === "ACTIVE" || effectiveStatus === "GRACE_PERIOD";
  if (!active) return { denied: true, code: "SUBSCRIPTION_EXPIRED", message: "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.", upgradeUrl: UPGRADE_URL };
  return { result: await callback(prisma) };
}

export async function withSeatLimitGuard<T>(shopId: string, callback: SeatMutationCallback<T>, options?: SeatLimitGuardOptions): Promise<SeatGuardOutcome<T>> {
  const now = options?.now ?? new Date();
  const lifetime = await lifetimeSubscriptionService.getActiveLifetimeForShop(shopId);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`seat-limit:${shopId}`}))`;
    const sub = await tx.subscription.findUnique({
      where: { shopId },
      select: { plan: true, status: true, billingInterval: true, trialEndsAt: true, currentPeriodStartedAt: true, currentPeriodEndsAt: true, gracePeriodEndsAt: true },
    });
    if (!sub) return { denied: true as const, code: "SUBSCRIPTION_EXPIRED" as const, message: "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.", upgradeUrl: UPGRADE_URL };
    const isLifetime = Boolean(lifetime && sub.billingInterval === null && sub.status === SubscriptionStatus.ACTIVE);
    const effectiveStatus = computeEffectiveStatus(sub.status, sub.trialEndsAt, sub.currentPeriodStartedAt ?? null, sub.currentPeriodEndsAt ?? null, sub.gracePeriodEndsAt ?? null, now, isLifetime);
    const active = effectiveStatus === "TRIALING" || effectiveStatus === "ACTIVE" || effectiveStatus === "GRACE_PERIOD";
    if (!active) return { denied: true as const, code: "SUBSCRIPTION_EXPIRED" as const, message: "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.", upgradeUrl: UPGRADE_URL };

    const [activeMemberships, activeOwnerMembership, pendingInvitesCount] = await Promise.all([
      tx.membership.count({ where: { shopId, status: MembershipStatus.ACTIVE, deletedAt: null } }),
      tx.membership.findFirst({ where: { shopId, role: MembershipRole.OWNER, status: MembershipStatus.ACTIVE, deletedAt: null }, select: { id: true } }),
      tx.shopInvitation.count({
        where: {
          shopId,
          status: InvitationStatus.PENDING,
          deletedAt: null,
          expiresAt: { gt: now },
          ...(options?.acceptingInvitationId ? { id: { not: options.acceptingInvitationId } } : {}),
        },
      }),
    ]);

    let usedSeats = activeMemberships;
    if (!activeOwnerMembership) {
      const legacyOwner = await tx.user.findFirst({ where: { shopId, role: UserRole.OWNER, deletedAt: null }, select: { id: true } });
      if (legacyOwner) usedSeats += 1;
    }
    usedSeats += pendingInvitesCount;
    if (usedSeats >= TOTAL_SEAT_LIMIT) {
      return { denied: true as const, code: "EMPLOYEE_LIMIT_REACHED" as const, message: "وصلت إلى الحد الأقصى المسموح به وهو 5 مستخدمين للمتجر، شامل مالك المتجر.", upgradeUrl: UPGRADE_URL };
    }
    return { result: await callback(tx) };
  });
}

export async function getEntitlementContext(shopId: string, now: Date = new Date()): Promise<EntitlementContext> {
  const [snapshot, activeSeats] = await Promise.all([getSubscriptionSnapshot(shopId, now), countActiveSeats(shopId)]);
  const limits = PLAN_LIMITS[snapshot.effectivePlan];
  const isOperationallyActive = snapshot.effectiveStatus === "TRIALING" || snapshot.effectiveStatus === "ACTIVE" || snapshot.effectiveStatus === "GRACE_PERIOD";
  return {
    subscription: snapshot,
    limits,
    usage: { repairOrdersThisMonth: 0, activeSeats, compatibilitySearchesToday: 0 },
    isOperationallyActive,
    canCreateRepairOrder: isOperationallyActive,
    canAddEmployee: isOperationallyActive && activeSeats < TOTAL_SEAT_LIMIT,
    canPerformCompatibilitySearch: isOperationallyActive,
  };
}

export async function checkCanCreateNewOperation(shopId: string, now: Date = new Date()): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);
  return ctx.isOperationallyActive ? { allowed: true } : { allowed: false, code: "SUBSCRIPTION_EXPIRED", message: "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.", upgradeUrl: UPGRADE_URL };
}
export async function checkCanCreateRepairOrder(shopId: string, now: Date = new Date()): Promise<EntitlementResult> { return checkCanCreateNewOperation(shopId, now); }
export async function checkCanAddEmployee(shopId: string, now: Date = new Date()): Promise<EntitlementResult> {
  const ctx = await getEntitlementContext(shopId, now);
  if (!ctx.isOperationallyActive) return { allowed: false, code: "SUBSCRIPTION_EXPIRED", message: "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.", upgradeUrl: UPGRADE_URL };
  if (!ctx.canAddEmployee) return { allowed: false, code: "EMPLOYEE_LIMIT_REACHED", message: "وصلت إلى الحد الأقصى المسموح به وهو 5 مستخدمين للمتجر، شامل مالك المتجر.", upgradeUrl: UPGRADE_URL };
  return { allowed: true };
}
export async function checkCanPerformCompatibilitySearch(shopId: string, now: Date = new Date()): Promise<EntitlementResult> { return checkCanCreateNewOperation(shopId, now); }

export const entitlementService = {
  getEntitlementContext,
  checkCanCreateNewOperation,
  checkCanCreateRepairOrder,
  checkCanAddEmployee,
  checkCanPerformCompatibilitySearch,
  withRepairOrderLimitGuard,
  withSeatLimitGuard,
};
