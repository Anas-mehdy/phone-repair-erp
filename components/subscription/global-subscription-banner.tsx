"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getOwnerSubscriptionNoticeAction,
  type OwnerSubscriptionNotice,
} from "@/app/actions/subscriptionActions";
import {
  SubscriptionExpiredBanner,
  SubscriptionGracePeriodBanner,
} from "./entitlement-alert";

export function GlobalSubscriptionBanner() {
  const pathname = usePathname();
  const [notice, setNotice] = useState<OwnerSubscriptionNotice>(null);

  useEffect(() => {
    // Exclude public pages, auth routes, admin, tracking, and receipts
    const isExcluded =
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password" ||
      pathname === "/reset-password" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/track") ||
      pathname.startsWith("/installment-track") ||
      pathname.includes("/print") ||
      pathname.includes("/sticker");

    if (isExcluded) {
      setNotice(null);
      return;
    }

    let isMounted = true;
    getOwnerSubscriptionNoticeAction()
      .then((res) => {
        if (isMounted) setNotice(res);
      })
      .catch(() => {
        if (isMounted) setNotice(null);
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  if (!notice) return null;

  if (notice.effectiveStatus === "EXPIRED" || notice.effectiveStatus === "CANCELED") {
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

  if (notice.effectiveStatus === "GRACE_PERIOD") {
    return (
      <div className="mb-6">
        <SubscriptionGracePeriodBanner
          remainingText={notice.graceRemainingText}
          actionHref="/support"
          actionLabel="تواصل مع الدعم للتجديد"
        />
      </div>
    );
  }

  return null;
}
