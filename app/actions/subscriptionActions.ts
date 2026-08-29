"use server";

import { getAuthContext } from "@/lib/auth/context";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";

export type OwnerSubscriptionNotice = {
  effectiveStatus: "EXPIRED" | "CANCELED" | "GRACE_PERIOD";
  graceRemainingText?: string;
} | null;

export async function getOwnerSubscriptionNoticeAction(): Promise<OwnerSubscriptionNotice> {
  try {
    const auth = await getAuthContext({ allowRedirect: false });
    if (!auth || auth.membership.role !== "OWNER") {
      return null;
    }

    const entitlement = await entitlementService.getEntitlementContext(auth.shop.id);
    const effectiveStatus = entitlement.subscription.effectiveStatus;

    if (effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELED") {
      return { effectiveStatus };
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
      const graceRemainingText =
        graceRemainingMs > 0
          ? `${remainingDays} يوم و${remainingHours} ساعة`
          : "انتهت المهلة";

      return {
        effectiveStatus: "GRACE_PERIOD",
        graceRemainingText,
      };
    }

    return null;
  } catch {
    return null;
  }
}
