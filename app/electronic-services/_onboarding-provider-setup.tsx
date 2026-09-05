"use client";

import { useRef, useState } from "react";
import { ArrowRight, WalletCards, Zap } from "lucide-react";
import Link from "next/link";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { createElectronicServiceProviderAction } from "./actions";

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function OnboardingElectronicProviderSetup({ currency, error }: { currency: string; error?: string }) {
  const started = useRef(false);
  const [openingBalance, setOpeningBalance] = useState("");

  function markStarted() {
    if (started.current) return;
    started.current = true;
    captureClientEvent(ANALYTICS_EVENTS.ELECTRONIC_PROVIDER_SETUP_STARTED, {
      onboarding_mode: true,
      onboarding_flow: "electronic_services",
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5" dir="rtl">
      <section className="rounded-[28px] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50/70 p-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/20">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white"><WalletCards className="h-6 w-6" /></span>
          <div>
            <div className="text-[10px] font-black text-teal-700 dark:text-teal-300">الخطوة 1 من 2</div>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">جهّز أول مزود خدمة</h1>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">اكتب المزود الذي عندك فيه رصيد فعلي الآن. بعد الحفظ سننفذ أول خدمة مباشرة ونريك كيف يخصم مسار تكلفتها من رصيده.</p>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div> : null}

      <form action={createElectronicServiceProviderAction} onChange={markStarted} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <input type="hidden" name="onboarding" value="1" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">اسم المزود *</span><input name="name" required maxLength={160} className={inputClass} placeholder="مثال: مزود الشحن الرئيسي" /></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-[11px] font-black text-slate-700 dark:text-slate-300">الرصيد الحقيقي الموجود عند المزود الآن ({currency}) *</span><input name="openingBalance" type="number" min="0.01" step="0.01" required value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} className={`${inputClass} font-numeric`} placeholder="مثال: 1000" /><span className="mt-1.5 block text-[10px] font-semibold leading-5 text-slate-400">لا تدخل رقماً تجريبياً؛ اكتب الرصيد الفعلي حتى تبقى تقاريرك صحيحة.</span></label>
        </div>
        <input type="hidden" name="typeLabel" value="مزود خدمات إلكترونية" />
        <input type="hidden" name="notes" value="" />
        <button type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-teal-600 to-cyan-600 text-xs font-black text-white shadow-lg shadow-teal-600/15 hover:from-teal-700 hover:to-cyan-700"><Zap className="h-4 w-4" />حفظ المزود وتنفيذ أول خدمة</button>
      </form>

      <div className="text-center"><Link href="/electronic-services" className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><ArrowRight className="h-3.5 w-3.5" />استخدام إدارة المزودين الكاملة</Link></div>
    </div>
  );
}
