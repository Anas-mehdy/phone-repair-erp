"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Circle, ExternalLink, Gauge, PackageCheck, Printer, ShoppingCart, Sparkles } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import {
  EMPTY_SALES_ACTIVATION_PROGRESS,
  parseSalesActivationProgress,
  salesActivationCoreStepCount,
  salesActivationIsComplete,
  salesActivationStorageKey,
  type SalesActivationClientProgress,
} from "@/lib/onboarding/sales-activation";
import { cn } from "@/lib/utils";

function StepState({ done }: { done: boolean }) {
  return done ? (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"><Check className="h-3.5 w-3.5" /></span>
  ) : (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-900"><Circle className="h-2.5 w-2.5 fill-current" /></span>
  );
}

export function SaleActivationSuccess({
  saleId,
  printHref,
  usedInventory,
}: {
  saleId: string;
  printHref: string;
  usedInventory: boolean;
}) {
  const storageKey = useMemo(() => salesActivationStorageKey(saleId), [saleId]);
  const [progress, setProgress] = useState<SalesActivationClientProgress>(EMPTY_SALES_ACTIVATION_PROGRESS);
  const coreStepCount = salesActivationCoreStepCount(progress);
  const complete = salesActivationIsComplete(progress);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      setProgress(parseSalesActivationProgress(JSON.parse(raw)));
    } catch {
      // Local checklist progress is non-authoritative and may be unavailable.
    }
  }, [storageKey]);

  function markReceiptPreviewed() {
    if (progress.receiptPreviewed) return;
    const next = { receiptPreviewed: true };
    setProgress(next);
    captureClientEvent(ANALYTICS_EVENTS.SALE_RECEIPT_PREVIEWED, {
      onboarding_flow: "sales_first_value",
      onboarding_mode: true,
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Business truth remains the completed Sale record on the server.
    }
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-indigo-50/60 shadow-[0_24px_80px_-52px_rgba(5,150,105,0.62)] dark:border-emerald-900/70 dark:from-emerald-950/30 dark:via-slate-900 dark:to-indigo-950/20">
      <div className="flex flex-col gap-4 border-b border-emerald-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-emerald-900/50">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20"><Sparkles className="h-5 w-5" /></span>
          <div>
            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">أول قيمة وصلت ✅</p>
            <h2 className="mt-0.5 text-[17px] font-black text-slate-950 dark:text-slate-50">تم تسجيل أول عملية بيع على مسار</h2>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">بقيت خطوة واحدة فقط: افتح الإيصال وشوف النتيجة التي تستطيع طباعتها أو إعطاءها للعميل.</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">{coreStepCount} / 2</span>
      </div>

      <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-white/85 p-4 dark:border-emerald-900/60 dark:bg-slate-900/70">
          <StepState done />
          <div><p className="text-[12px] font-black text-slate-900 dark:text-slate-100">1. أتممت أول بيع</p><p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">صار عندك سجل بيع حقيقي وإيصال محفوظ داخل النظام.</p></div>
        </div>

        <Link
          href={printHref}
          target="_blank"
          onClick={markReceiptPreviewed}
          className={cn(
            "flex items-start gap-3 rounded-2xl border bg-white/85 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:bg-slate-900/70",
            progress.receiptPreviewed ? "border-emerald-300 dark:border-emerald-800" : "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-800",
          )}
        >
          <StepState done={progress.receiptPreviewed} />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="text-[12px] font-black text-slate-900 dark:text-slate-100">2. شاهد الإيصال</p><ExternalLink className="h-3 w-3 text-indigo-600" /></div><p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">افتح نسخة الإيصال الجاهزة للطباعة للعميل.</p></div>
        </Link>
      </div>

      {usedInventory ? (
        <div className="mx-5 mb-5 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 px-4 py-3 dark:border-cyan-900/60 dark:bg-cyan-950/20 sm:mx-6">
          <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" />
          <div><p className="text-[11px] font-black text-cyan-900 dark:text-cyan-200">ومسار حدّث المخزون تلقائياً</p><p className="mt-0.5 text-[9px] font-semibold leading-5 text-cyan-700/80 dark:text-cyan-300/70">لأنك اخترت قطعة من المخزون، الكمية المباعة انخصمت من الرصيد بدون حركة يدوية إضافية.</p></div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-emerald-100 bg-white/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-emerald-900/50 dark:bg-slate-950/15">
        <Link href={printHref} target="_blank" onClick={markReceiptPreviewed} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {progress.receiptPreviewed ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Printer className="h-3.5 w-3.5" />}
          معاينة الإيصال
        </Link>

        {complete ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-black text-emerald-700 dark:text-emerald-300"><Gauge className="h-4 w-4" />ممتاز — شفت دورة البيع الأساسية.</span>
            <Link href="/point-of-sale?tab=sale" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-[10px] font-black text-white hover:bg-indigo-500"><ShoppingCart className="h-3.5 w-3.5" />عملية بيع أخرى</Link>
            <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">لوحة التحكم</Link>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ما تحتاج تتعلم العملاء والمحافظ والخصومات الآن — الإيصال هو الخطوة التالية فقط.</span>
        )}
      </div>
    </section>
  );
}
