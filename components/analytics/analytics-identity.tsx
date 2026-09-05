"use client";

import { useEffect } from "react";
import {
  ANALYTICS_IDENTITY_MARKER,
  identifyAnalyticsUser,
  registerAnalyticsContext,
  resetAnalyticsIdentity,
  startAnalyticsSessionRecording,
  stopAnalyticsSessionRecording,
} from "@/lib/analytics/client";

export type AnalyticsIdentityData = {
  userId: string;
  shopId: string;
  countryCode?: string | null;
  currency?: string | null;
  membershipRole?: string | null;
  subscriptionStatus?: string | null;
  isLifetime?: boolean | null;
  trialDaysRemaining?: number | null;
};

export function AnalyticsIdentity({
  identity,
}: {
  identity: AnalyticsIdentityData | null;
}) {
  const userId = identity?.userId ?? null;
  const shopId = identity?.shopId ?? null;
  const countryCode = identity?.countryCode ?? null;
  const currency = identity?.currency ?? null;
  const membershipRole = identity?.membershipRole ?? null;
  const subscriptionStatus = identity?.subscriptionStatus ?? null;
  const isLifetime = identity?.isLifetime ?? null;
  const trialDaysRemaining = identity?.trialDaysRemaining ?? null;

  useEffect(() => {
    if (userId && shopId) {
      const context = {
        shop_id: shopId,
        country_code: countryCode ?? undefined,
        currency: currency ?? undefined,
        membership_role: membershipRole ?? undefined,
        subscription_status: subscriptionStatus ?? undefined,
        is_lifetime: isLifetime ?? undefined,
        trial_days_remaining: trialDaysRemaining ?? undefined,
      };

      identifyAnalyticsUser(userId, context);
      registerAnalyticsContext(context);
      startAnalyticsSessionRecording();
      try {
        sessionStorage.setItem(ANALYTICS_IDENTITY_MARKER, "1");
      } catch {
        // Storage can be blocked; identity and replay still work for this page.
      }
      return;
    }

    try {
      if (sessionStorage.getItem(ANALYTICS_IDENTITY_MARKER) === "1") {
        stopAnalyticsSessionRecording();
        resetAnalyticsIdentity();
        sessionStorage.removeItem(ANALYTICS_IDENTITY_MARKER);
      }
    } catch {
      // If storage is unavailable, explicit logout still resets PostHog.
    }
  }, [
    userId,
    shopId,
    countryCode,
    currency,
    membershipRole,
    subscriptionStatus,
    isLifetime,
    trialDaysRemaining,
  ]);

  return null;
}
