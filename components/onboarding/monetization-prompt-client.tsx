"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Crown } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import {
  monetizationAnalyticsProperties,
  type MonetizationState,
} from "@/lib/monetization/onboarding";

function content(state: MonetizationState) {
  if (state.stage === "HABIT") {
    return {
      eyebrow: "صار عندك استخدام حقيقي",
      title: "مسار دخل فعلياً بروتين شغلك",
      description: "استخدمته على عمليات حقيقية وفي أكثر من يوم. هلق صار منطقي تشوف خيارات الاشتراك وتقرر على تجربة فعلية، مو على وعود.",
      action: "شوف خيارات الاشتراك",
      Icon: CheckCircle2,
      tone: "emerald",
    } as const;
  }
  if (state.stage === "TRIAL_ENDING") {
    return {
      eyebrow: "الفترة التجريبية قربت تخلص",
      title: state.remainingTrialHours <= 24 ? "بقي أقل من يوم على التجربة" : `بقي تقريباً ${state.remainingTrialHours} ساعة`,
      description: "بياناتك وسجلاتك محفوظة. إذا صار مسار مناسب لشغلك، اختار الخطة قبل انتهاء الفترة حتى تكمل بدون انقطاع.",
      action: "اختار الاشتراك",
      Icon: Clock3,
      tone: "amber",
    } as const;
  }
  return {
    eyebrow: "انتهت الفترة التجريبية",
    title: "شغلك ما زال محفوظاً على مسار",
    description: "تقدر تراجع بياناتك، وللعودة لتسجيل عمليات جديدة اختار الاشتراك المناسب لمتجرك.",
    action: "عرض خيارات الاشتراك",
    Icon: Crown,
    tone: "rose",
  } as const;
}

export function MonetizationPromptClient({ storageScope, state }: { storageScope: string; state: MonetizationState }) {
  const meta = content(state);
  const analytics = monetizationAnalyticsProperties(state);

  useEffect(() => {
    try {
      const key = `masar:monetization:v${state.flowVersion}:${storageScope}:dashboard:${state.stage}:viewed`;
      if (window.localStorage.getItem(key)) return;
      captureClientEvent(ANALYTICS_EVENTS.MONETIZATION_PROMPT_VIEWED, {
        ...analytics,
        placement: "dashboard",
      });
      window.localStorage.setItem(key, "1");
    } catch {
      // Analytics must not affect the prompt.
    }
  }, [analytics, state.flowVersion, state.stage, storageScope]);

  function trackClick() {
    captureClientEvent(ANALYTICS_EVENTS.MONETIZATION_PROMPT_CLICKED, {
      ...analytics,
      placement: "dashboard",
      destination: "subscription",
    });
  }

  const styles = meta.tone === "emerald"
    ? "border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-teal-50/70 dark:border-emerald-900/70 dark:from-emerald-950/20 dark:via-slate-950 dark:to-teal-950/20"
    : meta.tone === "amber"
      ? "border-amber-200 bg-gradient-to-l from-amber-50 via-white to-orange-50/70 dark:border-amber-900/70 dark:from-amber-950/20 dark:via-slate-950 dark:to-orange-950/20"
      : "border-rose-200 bg-gradient-to-l from-rose-50 via-white to-orange-50/60 dark:border-rose-900/70 dark:from-rose-950/20 dark:via-slate-950 dark:to-orange-950/15";

  return (
    <section className={`overflow-hidden rounded-[24px] border px-5 py-4 shadow-sm ${styles}`} aria-label="خيارات الاشتراك بعد تجربة مسار">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950"><meta.Icon className="h-5 w-5" /></span>
          <div>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400">{meta.eyebrow}</p>
            <h2 className="mt-1 text-[16px] font-black text-slate-950 dark:text-slate-50">{meta.title}</h2>
            <p className="mt-1 max-w-2xl text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{meta.description}</p>
          </div>
        </div>
        <Link onClick={trackClick} href={state.subscriptionHref} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[11px] font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
          {meta.action}<ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
