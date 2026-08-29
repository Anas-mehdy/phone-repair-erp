import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { computeEffectiveStatus } from "@/lib/services/subscriptionEntitlementService";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ActivateSubscriptionInput = {
  shopId: string;
  plan: SubscriptionPlan;
  billingInterval: SubscriptionBillingInterval;
  extraDays?: number;
  adminNotes?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
};

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Calendar-aware month addition with end-of-month clamping. */
export function addCalendarMonthsUtc(date: Date, months: number): Date {
  const absoluteMonth = date.getUTCMonth() + months;
  const targetYear = date.getUTCFullYear() + Math.floor(absoluteMonth / 12);
  const targetMonth = ((absoluteMonth % 12) + 12) % 12;
  const targetDay = Math.min(date.getUTCDate(), daysInUtcMonth(targetYear, targetMonth));

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function calculateSubscriptionEnd(
  start: Date,
  billingInterval: SubscriptionBillingInterval,
  extraDays = 0,
): Date {
  const baseEnd =
    billingInterval === SubscriptionBillingInterval.ANNUAL
      ? addCalendarMonthsUtc(start, 12)
      : addCalendarMonthsUtc(start, 6);

  if (!Number.isInteger(extraDays) || extraDays < 0 || extraDays > 3660) {
    throw new Error("عدد الأيام الإضافية غير صالح.");
  }

  return new Date(baseEnd.getTime() + extraDays * DAY_MS);
}

function nullableTrimmed(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

async function requireExistingSubscription(shopId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { shopId },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!subscription) {
    throw new Error("لم يتم العثور على اشتراك لهذا المتجر.");
  }

  return subscription;
}

export async function listSubscriptionsForAdmin(now = new Date()) {
  await requireSuperAdmin();

  const subscriptions = await prisma.subscription.findMany({
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          deletedAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return subscriptions.map((subscription) => ({
    ...subscription,
    effectiveStatus: computeEffectiveStatus(
      subscription.status,
      subscription.trialEndsAt,
      subscription.currentPeriodStartedAt,
      subscription.currentPeriodEndsAt,
      subscription.gracePeriodEndsAt,
      now,
    ),
  }));
}

/** Activates a paid subscription without modifying historical trial dates. */
export async function activateSubscription(
  input: ActivateSubscriptionInput,
  now = new Date(),
) {
  const adminSession = await requireSuperAdmin();
  await requireExistingSubscription(input.shopId);

  const currentPeriodStartedAt = new Date(now);
  const currentPeriodEndsAt = calculateSubscriptionEnd(
    currentPeriodStartedAt,
    input.billingInterval,
    input.extraDays ?? 0,
  );

  return prisma.subscription.update({
    where: { shopId: input.shopId },
    data: {
      plan: input.plan,
      status: SubscriptionStatus.ACTIVE,
      billingInterval: input.billingInterval,
      currentPeriodStartedAt,
      currentPeriodEndsAt,
      activatedAt: now,
      activatedById: adminSession.userId,
      canceledAt: null,
      gracePeriodEndsAt: null,
      adminNotes: nullableTrimmed(input.adminNotes),
      paymentReference: nullableTrimmed(input.paymentReference),
      paymentMethod: nullableTrimmed(input.paymentMethod),
    },
  });
}

/** Explicitly starts a grace period. It is never automatic. */
export async function startGracePeriod(
  shopId: string,
  days = 3,
  now = new Date(),
) {
  await requireSuperAdmin();
  await requireExistingSubscription(shopId);

  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error("مدة مهلة التجديد يجب أن تكون بين يوم واحد و90 يوماً.");
  }

  return prisma.subscription.update({
    where: { shopId },
    data: {
      status: SubscriptionStatus.GRACE_PERIOD,
      gracePeriodEndsAt: new Date(now.getTime() + days * DAY_MS),
    },
  });
}

export async function markSubscriptionExpired(shopId: string) {
  await requireSuperAdmin();
  await requireExistingSubscription(shopId);

  return prisma.subscription.update({
    where: { shopId },
    data: {
      status: SubscriptionStatus.EXPIRED,
      gracePeriodEndsAt: null,
    },
  });
}

export async function cancelSubscription(shopId: string, now = new Date()) {
  await requireSuperAdmin();
  await requireExistingSubscription(shopId);

  return prisma.subscription.update({
    where: { shopId },
    data: {
      status: SubscriptionStatus.CANCELED,
      canceledAt: now,
      gracePeriodEndsAt: null,
    },
  });
}

/**
 * Adds days to a paid period without changing trial history. If the paid period
 * has already ended, extension starts from now rather than from the stale end.
 */
export async function grantExtraDays(
  shopId: string,
  extraDays: number,
  now = new Date(),
) {
  await requireSuperAdmin();
  const subscription = await requireExistingSubscription(shopId);

  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 3660) {
    throw new Error("عدد الأيام الإضافية يجب أن يكون بين 1 و3660 يوماً.");
  }

  const base =
    subscription.currentPeriodEndsAt && subscription.currentPeriodEndsAt > now
      ? subscription.currentPeriodEndsAt
      : now;

  return prisma.subscription.update({
    where: { shopId },
    data: {
      currentPeriodEndsAt: new Date(base.getTime() + extraDays * DAY_MS),
    },
  });
}

export const subscriptionAdminService = {
  listSubscriptionsForAdmin,
  activateSubscription,
  startGracePeriod,
  markSubscriptionExpired,
  cancelSubscription,
  grantExtraDays,
  calculateSubscriptionEnd,
  addCalendarMonthsUtc,
};
