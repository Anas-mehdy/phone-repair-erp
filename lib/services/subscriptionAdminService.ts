import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { computeEffectiveStatus } from "@/lib/services/subscriptionEntitlementService";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureShopOwnerEvent } from "@/lib/analytics/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ActivateSubscriptionInput = {
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
  extraDays?: number;
  adminNotes?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  grantFoundersOffer?: boolean;
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

/**
 * Calculates the paid period end while preserving any unused trial time.
 * Trial credit is granted only on the first transition from TRIALING to ACTIVE,
 * which prevents the original trial from being credited again on renewals.
 */
export function calculatePaidActivationEnd(
  start: Date,
  billingInterval: SubscriptionBillingInterval,
  extraDays: number,
  currentStatus: SubscriptionStatus,
  trialEndsAt: Date,
): Date {
  const paidPeriodEnd = calculateSubscriptionEnd(start, billingInterval, extraDays);
  const remainingTrialMs =
    currentStatus === SubscriptionStatus.TRIALING
      ? Math.max(0, trialEndsAt.getTime() - start.getTime())
      : 0;

  return new Date(paidPeriodEnd.getTime() + remainingTrialMs);
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

/** Activates the paid plan and credits any trial time still remaining. */
export async function activateSubscription(
  input: ActivateSubscriptionInput,
  now = new Date(),
) {
  const adminSession = await requireSuperAdmin();
  const existingSub = await requireExistingSubscription(input.shopId);

  const currentPeriodStartedAt = new Date(now);
  const currentPeriodEndsAt = calculatePaidActivationEnd(
    currentPeriodStartedAt,
    input.billingInterval,
    input.extraDays ?? 0,
    existingSub.status,
    existingSub.trialEndsAt,
  );

  let foundersOfferEligible = existingSub.foundersOfferEligible;
  let foundersOfferGrantedAt = existingSub.foundersOfferGrantedAt;
  let foundersOfferSixMonthsDiscountPercent =
    existingSub.foundersOfferSixMonthsDiscountPercent;
  let foundersOfferAnnualDiscountPercent =
    existingSub.foundersOfferAnnualDiscountPercent;

  if (existingSub.foundersOfferEligible) {
    // If shop was already granted founders offer, preserve existing frozen values permanently
    foundersOfferEligible = true;
    foundersOfferGrantedAt = existingSub.foundersOfferGrantedAt ?? now;
    foundersOfferSixMonthsDiscountPercent =
      existingSub.foundersOfferSixMonthsDiscountPercent;
    foundersOfferAnnualDiscountPercent =
      existingSub.foundersOfferAnnualDiscountPercent;
  } else if (input.grantFoundersOffer) {
    // Granting new founders offer: read active global offer from DB
    const globalOffer = await prisma.subscriptionOfferSettings.findUnique({
      where: { id: "FOUNDERS_OFFER" },
    });

    if (
      !globalOffer ||
      !globalOffer.isActive ||
      globalOffer.remainingEligible <= 0
    ) {
      throw new Error(
        "عرض المشتركين الأوائل غير متاح حالياً أو اكتمل العدد المخصص.",
      );
    }

    foundersOfferEligible = true;
    foundersOfferGrantedAt = now;
    foundersOfferSixMonthsDiscountPercent =
      globalOffer.sixMonthsDiscountPercent;
    foundersOfferAnnualDiscountPercent = globalOffer.annualDiscountPercent;
  }

  const updatedSubscription = await prisma.subscription.update({
    where: { shopId: input.shopId },
    data: {
      // PROFESSIONAL is retained as the internal enum value for the one
      // commercial comprehensive plan. BASIC is deprecated and never activated.
      plan: SubscriptionPlan.PROFESSIONAL,
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
      foundersOfferEligible,
      foundersOfferGrantedAt,
      foundersOfferSixMonthsDiscountPercent,
      foundersOfferAnnualDiscountPercent,
    },
  });

  await captureShopOwnerEvent({
    event: ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED,
    shopId: input.shopId,
    countryCode: existingSub.shop.countryCode,
    properties: {
      billing_interval: input.billingInterval === SubscriptionBillingInterval.ANNUAL ? "annual" : "six_months",
      activation_type: existingSub.activatedAt ? "renewal" : "first_paid_activation",
      channel: "direct_admin",
      is_lifetime: false,
      founders_offer: Boolean(foundersOfferEligible),
    },
  });

  return updatedSubscription;
}


/** Explicit renewal grace period; never starts automatically and never applies to trials. */
export async function startGracePeriod(
  shopId: string,
  days = 3,
  now = new Date(),
) {
  await requireSuperAdmin();
  const subscription = await requireExistingSubscription(shopId);

  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new Error("مدة مهلة التجديد يجب أن تكون بين يوم واحد و90 يوماً.");
  }

  if (
    !subscription.activatedAt ||
    !subscription.billingInterval ||
    !subscription.currentPeriodStartedAt ||
    !subscription.currentPeriodEndsAt ||
    subscription.status === SubscriptionStatus.TRIALING ||
    subscription.status === SubscriptionStatus.CANCELED
  ) {
    throw new Error("مهلة التجديد متاحة فقط لاشتراك مدفوع سبق تفعيله.");
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

/** Adds days only to an already-active paid subscription. */
export async function grantExtraDays(
  shopId: string,
  extraDays: number,
) {
  await requireSuperAdmin();
  const subscription = await requireExistingSubscription(shopId);

  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 3660) {
    throw new Error("عدد الأيام الإضافية يجب أن يكون بين 1 و3660 يوماً.");
  }

  if (
    subscription.status !== SubscriptionStatus.ACTIVE ||
    !subscription.activatedAt ||
    !subscription.billingInterval ||
    !subscription.currentPeriodStartedAt ||
    !subscription.currentPeriodEndsAt
  ) {
    throw new Error(
      "يمكن إضافة أيام فقط إلى اشتراك مدفوع نشط. استخدم التفعيل أو التجديد للحالات الأخرى.",
    );
  }

  return prisma.subscription.update({
    where: { shopId },
    data: {
      currentPeriodEndsAt: new Date(
        subscription.currentPeriodEndsAt.getTime() + extraDays * DAY_MS,
      ),
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
  calculatePaidActivationEnd,
  addCalendarMonthsUtc,
};
