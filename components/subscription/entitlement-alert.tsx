import React from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntitlementDenyCode } from "@/lib/services/subscriptionEntitlementService";

export type EntitlementAlertProps = {
  code: EntitlementDenyCode;
  customMessage?: string;
  className?: string;
  showButton?: boolean;
};

const ENTITLEMENT_MESSAGES: Record<
  EntitlementDenyCode,
  {
    title: string;
    message: string;
    icon: typeof AlertCircle;
    tone: "rose" | "amber";
  }
> = {
  REPAIR_LIMIT_REACHED: {
    title: "تم بلوغ الحد الأقصى لتذاكر الصيانة",
    message: "استخدمت 100 من أصل 100 تذكرة لهذا الشهر.",
    icon: AlertCircle,
    tone: "rose",
  },
  COMPATIBILITY_SEARCH_LIMIT_REACHED: {
    title: "تم بلوغ حد البحث اليومي",
    message:
      "استخدمت عمليات البحث العشر المتاحة اليوم. يمكنك المحاولة غداً أو الترقية للخطة الاحترافية.",
    icon: AlertCircle,
    tone: "amber",
  },
  EMPLOYEE_LIMIT_REACHED: {
    title: "حد المستخدمين في الخطة الحالية",
    message:
      "الخطة الأساسية مخصصة لمستخدم واحد. الترقية للاحترافية تتيح إضافة الموظفين.",
    icon: AlertTriangle,
    tone: "amber",
  },
  SUBSCRIPTION_EXPIRED: {
    title: "انتهت فترة الاشتراك",
    message: "انتهت الفترة التجريبية. اختر الخطة المناسبة لمتابعة إنشاء عمليات جديدة.",
    icon: ShieldAlert,
    tone: "rose",
  },
};

/**
 * Reusable UI Banner for structured Entitlement Limits & Expirations.
 * Renders user-friendly messages and direct action buttons to upgrade.
 */
export function EntitlementAlert({
  code,
  customMessage,
  className = "",
  showButton = true,
}: EntitlementAlertProps) {
  const meta = ENTITLEMENT_MESSAGES[code] || ENTITLEMENT_MESSAGES.SUBSCRIPTION_EXPIRED;
  const Icon = meta.icon;
  const isRose = meta.tone === "rose";

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all shadow-sm ${
        isRose
          ? "border-rose-200/90 bg-gradient-to-r from-rose-50 via-rose-50/70 to-orange-50/50 text-rose-950"
          : "border-amber-200/90 bg-gradient-to-r from-amber-50 via-amber-50/70 to-yellow-50/50 text-amber-950"
      } ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              isRose ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="space-y-0.5">
            <h4 className="text-sm font-black text-slate-900">{meta.title}</h4>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              {customMessage || meta.message}
            </p>
          </div>
        </div>

        {showButton && (
          <div className="shrink-0 sm:self-center pr-12 sm:pr-0">
            <Button
              asChild
              size="sm"
              className={`rounded-xl text-xs font-black shadow-xs ${
                isRose
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-teal-700 hover:bg-teal-800 text-white"
              }`}
            >
              <Link href="/subscription">
                <Sparkles className="ml-1.5 h-3.5 w-3.5" />
                عرض الخطة الاحترافية
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Banner shown on the subscription page or global view when subscription is EXPIRED.
 */
export function SubscriptionExpiredBanner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-rose-300 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 text-rose-950 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-xs">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-rose-950 sm:text-base">
              انتهت فترة استخدامك في مسار
            </h3>
            <p className="text-xs font-semibold leading-relaxed text-slate-700 sm:text-sm">
              انتهت فترة استخدامك. بياناتك محفوظة بالكامل، اختر خطة لمتابعة إنشاء عمليات جديدة.
            </p>
          </div>
        </div>

        <Button
          asChild
          className="shrink-0 rounded-xl bg-rose-600 text-xs font-black text-white hover:bg-rose-700 shadow-sm sm:self-center"
        >
          <a href="#plans-section">
            <Sparkles className="ml-1.5 h-4 w-4" />
            اختر خطتك الآن
          </a>
        </Button>
      </div>
    </div>
  );
}

/**
 * Banner shown during the GRACE_PERIOD window to warn about imminent expiration.
 */
export function SubscriptionGracePeriodBanner({
  remainingDays,
  className = "",
}: {
  remainingDays?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-4 sm:p-5 text-amber-950 shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
            <Clock className="h-5 w-5" />
          </span>
          <div className="space-y-0.5">
            <h4 className="text-sm font-black text-slate-900">
              مهلة تجديد الاشتراك نشطة
            </h4>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              اشتراك متجرك في مهلة التجديد
              {remainingDays !== undefined ? ` (متبقي ${remainingDays} يوم)` : ""}
              . يرجى اختيار خطة وتجديد الاشتراك للاستمرار في استخدام جميع مزايا النظام دون انقطاع.
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs sm:self-center"
        >
          <a href="#plans-section">
            تجديد الاشتراك
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
