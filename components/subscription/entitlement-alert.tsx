import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, Clock, Headphones, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntitlementDenyCode } from "@/lib/services/subscriptionEntitlementService";

export type EntitlementAlertProps = {
  code: EntitlementDenyCode;
  customMessage?: string;
  className?: string;
  showButton?: boolean;
  actionHref?: string;
  actionLabel?: string;
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
  EMPLOYEE_LIMIT_REACHED: {
    title: "تم بلوغ الحد الأقصى للمستخدمين",
    message:
      "وصلت إلى الحد الأقصى المسموح به وهو 5 مستخدمين للمتجر، شامل مالك المتجر.",
    icon: AlertTriangle,
    tone: "amber",
  },
  SUBSCRIPTION_EXPIRED: {
    title: "انتهت فترة الاشتراك",
    message:
      "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك.",
    icon: ShieldAlert,
    tone: "rose",
  },
};


/**
 * Reusable UI Banner for structured Entitlement Limits & Expirations.
 * Renders user-friendly messages and direct action buttons to upgrade or contact support.
 */
export function EntitlementAlert({
  code,
  customMessage,
  className = "",
  showButton = true,
  actionHref = "/support",
  actionLabel = "تواصل مع الدعم",
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
              <Link href={actionHref}>
                <Headphones className="ml-1.5 h-3.5 w-3.5" />
                {actionLabel}
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
  message,
  actionHref = "/support",
  actionLabel = "تواصل مع الدعم لتجديد الاشتراك",
  className = "",
}: {
  message?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  const displayMessage =
    message ||
    "انتهت فترة استخدامك. بياناتك محفوظة بالكامل، ويمكنك الاطلاع على بياناتك الحالية. تواصل مع الدعم لتجديد الاشتراك.";

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
              {displayMessage}
            </p>
          </div>
        </div>

        <Button
          asChild
          className="shrink-0 rounded-xl bg-rose-600 text-xs font-black text-white hover:bg-rose-700 shadow-sm sm:self-center"
        >
          <Link href={actionHref}>
            <Headphones className="ml-1.5 h-4 w-4" />
            {actionLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Banner shown during the GRACE_PERIOD window to warn about imminent expiration.
 */
export function SubscriptionGracePeriodBanner({
  remainingText,
  remainingDays,
  actionHref = "/support",
  actionLabel = "تواصل مع الدعم للتجديد",
  className = "",
}: {
  remainingText?: string;
  remainingDays?: number;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  const timeText =
    remainingText || (remainingDays !== undefined ? `${remainingDays} يوم` : "");

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
              اشتراكك ضمن مهلة التجديد
              {timeText ? ` (متبقي ${timeText})` : ""}
              . يرجى التواصل مع الدعم لتجنب توقف إنشاء العمليات الجديدة.
            </p>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs sm:self-center"
        >
          <Link href={actionHref}>
            <Headphones className="ml-1.5 h-3.5 w-3.5" />
            {actionLabel}
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
