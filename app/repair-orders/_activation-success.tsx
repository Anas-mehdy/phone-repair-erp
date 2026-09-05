"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Circle, ExternalLink, FileText, Gauge, QrCode, Sparkles } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import {
  EMPTY_REPAIR_ACTIVATION_PROGRESS,
  parseRepairActivationProgress,
  repairActivationCoreStepCount,
  repairActivationIsComplete,
  repairActivationStorageKey,
  repairStatusWasChanged,
  type RepairActivationClientProgress,
} from "@/lib/onboarding/repair-activation";
import { cn } from "@/lib/utils";

function StepState({ done }: { done: boolean }) {
  return done ? (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
      <Check className="h-3.5 w-3.5" />
    </span>
  ) : (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-900">
      <Circle className="h-2.5 w-2.5 fill-current" />
    </span>
  );
}

export function RepairActivationSuccess({
  repairOrderId,
  trackingUrl,
  printHref,
  currentStatus,
}: {
  repairOrderId: string;
  trackingUrl: string;
  printHref: string;
  currentStatus: string;
}) {
  const storageKey = useMemo(() => repairActivationStorageKey(repairOrderId), [repairOrderId]);
  const [progress, setProgress] = useState<RepairActivationClientProgress>(EMPTY_REPAIR_ACTIVATION_PROGRESS);
  const statusChanged = repairStatusWasChanged(currentStatus);
  const coreStepCount = repairActivationCoreStepCount({
    trackingPreviewed: progress.trackingPreviewed,
    statusChanged,
  });
  const complete = repairActivationIsComplete({
    trackingPreviewed: progress.trackingPreviewed,
    statusChanged,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      setProgress(parseRepairActivationProgress(JSON.parse(raw)));
    } catch {
      // Local progress is only a convenience for the checklist. Business truth stays server-side.
    }
  }, [storageKey]);

  function persist(next: RepairActivationClientProgress) {
    setProgress(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Storage may be blocked; the activation action itself still works.
    }
  }

  function markTrackingPreviewed() {
    if (!progress.trackingPreviewed) {
      captureClientEvent(ANALYTICS_EVENTS.REPAIR_TRACKING_PREVIEWED, {
        onboarding_flow: "repairs_first_value",
      });
      persist({ ...progress, trackingPreviewed: true });
    }
  }

  function markReceiptPreviewed() {
    if (!progress.receiptPreviewed) {
      captureClientEvent(ANALYTICS_EVENTS.REPAIR_RECEIPT_PREVIEWED, {
        onboarding_flow: "repairs_first_value",
      });
      persist({ ...progress, receiptPreviewed: true });
    }
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-teal-50/70 shadow-[0_24px_80px_-52px_rgba(5,150,105,0.65)] dark:border-emerald-900/70 dark:from-emerald-950/35 dark:via-slate-900 dark:to-teal-950/25">
      <div className="flex flex-col gap-4 border-b border-emerald-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-emerald-900/50">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">أول قيمة وصلت ✅</p>
            <h2 className="mt-0.5 text-[17px] font-black text-slate-950 dark:text-slate-50">تم تسجيل أول جهاز على مسار</h2>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
              جرّب الآن كيف يرافق مسار الجهاز بعد الاستلام. بقيت خطوتان فقط لتشوف دورة الصيانة الأساسية.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">
          {coreStepCount} / 3
        </span>
      </div>

      <div className="grid gap-3 px-5 py-5 sm:px-6 lg:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-white/85 p-4 dark:border-emerald-900/60 dark:bg-slate-900/70">
          <StepState done />
          <div>
            <p className="text-[12px] font-black text-slate-900 dark:text-slate-100">1. سجل الجهاز</p>
            <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">صار للجهاز تذكرة ورقم وتتبع داخل النظام.</p>
          </div>
        </div>

        <a
          href={trackingUrl}
          target="_blank"
          rel="noreferrer"
          onClick={markTrackingPreviewed}
          className={cn(
            "flex items-start gap-3 rounded-2xl border bg-white/85 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-900/70",
            progress.trackingPreviewed
              ? "border-emerald-300 dark:border-emerald-800"
              : "border-slate-200 hover:border-teal-300 dark:border-slate-700 dark:hover:border-teal-800",
          )}
        >
          <StepState done={progress.trackingPreviewed} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[12px] font-black text-slate-900 dark:text-slate-100">2. شاهد تتبع العميل</p>
              <ExternalLink className="h-3 w-3 text-teal-600" />
            </div>
            <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">افتح نفس الصفحة التي يشاهد منها العميل حالة جهازه.</p>
          </div>
        </a>

        <a
          href="#repair-status"
          className={cn(
            "flex items-start gap-3 rounded-2xl border bg-white/85 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-900/70",
            statusChanged
              ? "border-emerald-300 dark:border-emerald-800"
              : "border-slate-200 hover:border-teal-300 dark:border-slate-700 dark:hover:border-teal-800",
          )}
        >
          <StepState done={statusChanged} />
          <div>
            <p className="text-[12px] font-black text-slate-900 dark:text-slate-100">3. غيّر حالة الجهاز</p>
            <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">جرّب نقله مثلاً إلى «قيد التشخيص» أو «قيد الإصلاح».</p>
          </div>
        </a>
      </div>

      <div className="flex flex-col gap-3 border-t border-emerald-100 bg-white/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-emerald-900/50 dark:bg-slate-950/15">
        <Link
          href={printHref}
          target="_blank"
          onClick={markReceiptPreviewed}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/40"
        >
          {progress.receiptPreviewed ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <QrCode className="h-3.5 w-3.5" />}
          معاينة الإيصال وQR
        </Link>

        {complete ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
              <Gauge className="h-4 w-4" />
              ممتاز — شفت دورة الصيانة الأساسية.
            </span>
            <Link href="/dashboard" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-[10px] font-black text-white hover:bg-emerald-600">
              الانتقال للوحة التحكم
              <FileText className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">لا تحتاج تجربة كل ميزات مسار الآن — فقط أكمل الخطوتين الأساسيتين.</span>
        )}
      </div>
    </section>
  );
}
