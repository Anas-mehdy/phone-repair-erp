import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { COUNTRY_DIAL_CODES } from "@/lib/countries";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

export type EffectiveSubscriptionStatus = SubscriptionStatus;

export type SubscriptionPriceItem = {
  plan: SubscriptionPlan;
  billingInterval: SubscriptionBillingInterval;
  currencyCode: string;
  amount: number;
};

export type SubscriptionOverview = {
  shopName: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  plan: SubscriptionPlan;
  storedStatus: SubscriptionStatus;
  effectiveStatus: EffectiveSubscriptionStatus;
  trialStartedAt: Date;
  trialEndsAt: Date;
  currentPeriodEndsAt: Date | null;
  remainingMilliseconds: number;
  remainingDays: number;
  remainingHours: number;
  trialProgress: number;
  prices: SubscriptionPriceItem[];
};

function resolveEffectiveStatus(
  status: SubscriptionStatus,
  trialEndsAt: Date,
  currentPeriodEndsAt: Date | null,
  now: Date
): SubscriptionStatus {
  if (status === SubscriptionStatus.TRIALING && trialEndsAt.getTime() <= now.getTime()) {
    return SubscriptionStatus.EXPIRED;
  }

  if (
    status === SubscriptionStatus.ACTIVE &&
    currentPeriodEndsAt &&
    currentPeriodEndsAt.getTime() <= now.getTime()
  ) {
    return SubscriptionStatus.EXPIRED;
  }

  return status;
}

export async function getSubscriptionOverview(
  shopId: string,
  now = new Date()
): Promise<SubscriptionOverview> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, deletedAt: null },
    select: {
      name: true,
      countryCode: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          trialStartedAt: true,
          trialEndsAt: true,
          currentPeriodEndsAt: true,
        },
      },
    },
  });

  if (!shop?.subscription) {
    throw new Error("تعذر العثور على اشتراك المتجر.");
  }

  const countryCode = shop.countryCode.toUpperCase();
  const [countryPrices, fallbackPrices] = await Promise.all([
    prisma.subscriptionPrice.findMany({ where: { countryCode } }),
    countryCode === "ZZ"
      ? Promise.resolve([])
      : prisma.subscriptionPrice.findMany({ where: { countryCode: "ZZ" } }),
  ]);
  const resolvedPrices = countryPrices.length === 4 ? countryPrices : fallbackPrices;
  const subscription = shop.subscription;
  const effectiveStatus = resolveEffectiveStatus(
    subscription.status,
    subscription.trialEndsAt,
    subscription.currentPeriodEndsAt,
    now
  );
  const relevantEnd =
    effectiveStatus === SubscriptionStatus.TRIALING
      ? subscription.trialEndsAt
      : subscription.currentPeriodEndsAt;
  const remainingMilliseconds = relevantEnd
    ? Math.max(0, relevantEnd.getTime() - now.getTime())
    : 0;
  const remainingDays = Math.floor(remainingMilliseconds / DAY_MS);
  const remainingHours = Math.floor((remainingMilliseconds % DAY_MS) / (60 * 60 * 1000));
  const trialDuration = Math.max(
    DAY_MS,
    subscription.trialEndsAt.getTime() - subscription.trialStartedAt.getTime()
  );
  const trialElapsed = Math.max(0, now.getTime() - subscription.trialStartedAt.getTime());
  const trialProgress = Math.min(100, Math.max(0, (trialElapsed / trialDuration) * 100));
  const country = COUNTRY_DIAL_CODES.find((item) => item.code === countryCode);

  return {
    shopName: shop.name,
    countryCode,
    countryName: country?.name ?? "دولة أخرى",
    countryFlag: country?.flag ?? "🌍",
    plan: subscription.plan,
    storedStatus: subscription.status,
    effectiveStatus,
    trialStartedAt: subscription.trialStartedAt,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEndsAt: subscription.currentPeriodEndsAt,
    remainingMilliseconds,
    remainingDays,
    remainingHours,
    trialProgress,
    prices: resolvedPrices.map((price) => ({
      plan: price.plan,
      billingInterval: price.billingInterval,
      currencyCode: price.currencyCode,
      amount: Number(price.amount),
    })),
  };
}

export const subscriptionService = { getSubscriptionOverview };
