import React from "react";
import { getAuthContext } from "@/lib/auth/context";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";
import {
  SubscriptionExpiredBanner,
  SubscriptionGracePeriodBanner,
} from "./entitlement-alert";

export async function GlobalSubscriptionBanner() {
  try {
    const auth = await getAuthContext({ allowRedirect: false });
    if (!auth || auth.membership.role !== "OWNER") {
      return null;
    }

    const entitlement = await entitlementService.getEntitlementContext(auth.shop.id);
    const effectiveStatus = entitlement.subscription.effectiveStatus;

    if (effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELED") {
      return (
        <div className="mb-6">
          <SubscriptionExpiredBanner
            message="انتهت فترة استخدامك. بياناتك محفوظة بالكامل، ويمكنك الاطلاع على بياناتك الحالية. تواصل مع الدعم لتجديد الاشتراك."
            actionHref="/support"
            actionLabel="تواصل مع الدعم لتجديد الاشتراك"
          />
        </div>
      );
    }

    if (effectiveStatus === "GRACE_PERIOD") {
      const now = new Date();
      const graceEnd = entitlement.subscription.gracePeriodEndsAt;
      const graceRemainingMs = graceEnd
        ? Math.max(0, graceEnd.getTime() - now.getTime())
        : 0;
      const remainingDays = Math.floor(graceRemainingMs / (24 * 60 * 60 * 1000));
      const remainingHours = Math.floor(
        (graceRemainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)
      );
      const remainingText =
        graceRemainingMs > 0
          ? `${remainingDays} يوم و${remainingHours} ساعة`
          : "انتهت المهلة";

      return (
        <div className="mb-6">
          <SubscriptionGracePeriodBanner
            remainingText={remainingText}
            actionHref="/support"
            actionLabel="تواصل مع الدعم للتجديد"
          />
        </div>
      );
    }

    return null;
  } catch {
    // If any auth or DB reading fails, fail safe without breaking UI rendering
    return null;
  }
}
