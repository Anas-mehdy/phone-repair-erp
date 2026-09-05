"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Boxes, Check, Circle, Gauge, LayoutDashboard, MoveDown, ShoppingCart } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import {
  EMPTY_INVENTORY_ACTIVATION_PROGRESS,
  inventoryActivationCoreStepCount,
  inventoryActivationIsComplete,
  inventoryActivationStorageKey,
  parseInventoryActivationProgress,
  type InventoryActivationClientProgress,
} from "@/lib/onboarding/inventory-activation";

function StepState({ done }: { done: boolean }) {
  return done ? (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"><Check className="h-3.5 w-3.5" /></span>
  ) : (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-900"><Circle className="h-2.5 w-2.5 fill-current" /></span>
  );
}

export function InventoryActivationSuccess({
  inventoryItemId,
  itemName,
  quantity,
  openingQuantity,
  hasOpeningMovement,
}: {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  openingQuantity: number;
  hasOpeningMovement: boolean;
}) {
  const storageKey = useMemo(() => inventoryActivationStorageKey(inventoryItemId), [inventoryItemId]);
  const [progress, setProgress] = useState<InventoryActivationClientProgress>(EMPTY_INVENTORY_ACTIVATION_PROGRESS);
  const stepCount = inventoryActivationCoreStepCount(progress, hasOpeningMovement);
  const complete = inventoryActivationIsComplete(progress, hasOpeningMovement);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setProgress(parseInventoryActivationProgress(JSON.parse(raw)));
    } catch {
      // Checklist state is convenience only; InventoryItem/Movement remain authoritative.
    }
  }, [storageKey]);

  function previewMovement() {
    if (!progress.movementPreviewed) {
      const next = { movementPreviewed: true };
      setProgress(next);
      captureClientEvent(ANALYTICS_EVENTS.INVENTORY_MOVEMENT_PREVIEWED, {
        onboarding_mode: true,
        onboarding_flow: "inventory_first_value",
        has_opening_movement: hasOpeningMovement,
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Business truth does not depend on local storage.
      }
    }
    document.getElementById("inventory-movements")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="overflow-hidden rounded-[26px] border border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-amber-50/60 shadow-[0_24px_80px_-52px_rgba(5,150,105,0.55)] dark:border-emerald-900/70 dark:from-emerald-950/25 dark:via-slate-950 dark:to-amber-950/15">
      <div className="flex flex-col gap-4 border-b border-emerald-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-emerald-900/50">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Boxes className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">أول صنف صار بالمخزون ✅</p><h2 className="mt-0.5 text-[17px] font-black text-slate-950 dark:text-slate-50">شوف كيف مسار حفظ الرصيد كحركة قابلة للتتبع</h2><p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">الصنف والرصيد الافتتاحي صاروا بيانات تشغيل فعلية، مو مجرد تجربة أو مثال.</p></div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">{stepCount} / 3</span>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_250px] sm:p-6">
        <div className="space-y-2.5">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white/85 p-4 dark:border-emerald-900/60 dark:bg-slate-900/70"><StepState done /><div><p className="text-[11px] font-black text-slate-900 dark:text-slate-100">1. أضفت أول صنف</p><p className="mt-1 text-[9px] font-semibold leading-5 text-slate-500 dark:text-slate-400">صار الصنف متاحاً للمبيعات والصيانة وإدارة المخزون.</p></div></div>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white/85 p-4 dark:border-emerald-900/60 dark:bg-slate-900/70"><StepState done={hasOpeningMovement} /><div><p className="text-[11px] font-black text-slate-900 dark:text-slate-100">2. تسجل الرصيد الافتتاحي</p><p className="mt-1 text-[9px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{hasOpeningMovement ? `مسار أنشأ حركة +${openingQuantity} تلقائياً.` : "لم نجد حركة افتتاحية؛ راجع كمية الصنف."}</p></div></div>
          <button type="button" onClick={previewMovement} className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white/85 p-4 text-right transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-amber-800"><StepState done={progress.movementPreviewed} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-[11px] font-black text-slate-900 dark:text-slate-100">3. شاهد حركة الرصيد <MoveDown className="h-3.5 w-3.5 text-amber-600" /></p><p className="mt-1 text-[9px] font-semibold leading-5 text-slate-500 dark:text-slate-400">انزل لسجل الحركات وشوف التغير والكمية بعد الحركة.</p></div></button>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white/85 p-4 text-center dark:border-amber-900/60 dark:bg-slate-900/70">
          <Boxes className="mx-auto h-5 w-5 text-amber-600" />
          <p className="mt-2 truncate text-[10px] font-black text-slate-500 dark:text-slate-300">{itemName}</p>
          <p className="mt-2 font-numeric text-3xl font-black text-slate-950 dark:text-slate-50">{quantity}</p>
          <p className="mt-0.5 text-[9px] font-bold text-slate-400">الكمية الحالية</p>
          <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2.5 text-[9px] font-semibold leading-5 text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-200">لما تبيع من هذا الصنف أو تستخدمه كقطعة صيانة، مسار يقدر يسجل حركة الخصم ويحدث الرصيد تلقائياً.</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-emerald-100 bg-white/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-emerald-900/50 dark:bg-slate-950/15">
        {complete ? <span className="inline-flex items-center gap-2 text-[11px] font-black text-emerald-700 dark:text-emerald-300"><Gauge className="h-4 w-4" />ممتاز — شفت دورة المخزون الأساسية.</span> : <span className="text-[10px] font-bold text-slate-400">بقي بس تفتح حركة الرصيد؛ ما تحتاج إعداد التصنيفات والتوافقات الآن.</span>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/inventory" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[10px] font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">إدارة المخزون</Link>
          {complete ? <Link href="/point-of-sale?tab=sale" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 text-[10px] font-black text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200"><ShoppingCart className="h-3.5 w-3.5" />جرّب البيع لاحقاً</Link> : null}
          <Link href="/dashboard" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-[10px] font-black text-white hover:bg-emerald-500"><LayoutDashboard className="h-3.5 w-3.5" />لوحة التحكم</Link>
        </div>
      </div>
    </section>
  );
}
