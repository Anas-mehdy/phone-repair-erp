"use client";

import { useRef } from "react";
import { Landmark, Loader2, Sparkles, WalletCards } from "lucide-react";
import { useFormStatus } from "react-dom";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import { Button } from "@/components/ui/button";
import { createWalletAction } from "./actions";

export function OnboardingWalletSetup({ currency }: { currency: string }) {
  const startedRef = useRef(false);

  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    captureClientEvent(ANALYTICS_EVENTS.WALLET_SETUP_STARTED, {
      onboarding_mode: true,
      onboarding_flow: "wallets_first_value",
      source: "transfers_onboarding",
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-teal-200 bg-gradient-to-l from-teal-50 via-white to-cyan-50/70 shadow-[0_24px_80px_-54px_rgba(13,148,136,0.65)] dark:border-teal-900/70 dark:from-teal-950/30 dark:via-slate-950 dark:to-cyan-950/20">
        <div className="flex items-start gap-3 border-b border-teal-100 px-5 py-5 sm:px-6 dark:border-teal-900/50">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
            <WalletCards className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black text-teal-700 dark:text-teal-300">الخطوة 1 من 2</p>
            <h1 className="mt-0.5 text-[19px] font-black text-slate-950 dark:text-slate-50">جهّز أول محفظة</h1>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
              أضف المحفظة التي تستخدمها في التحويلات. باقي الإعدادات مثل الحدود والعمولات فيك تضبطها لاحقاً.
            </p>
          </div>
        </div>

        <form action={createWalletAction} className="space-y-5 px-5 py-5 sm:px-6">
          <input type="hidden" name="onboarding" value="1" />
          <input type="hidden" name="monthlyLimit" value="" />
          <input type="hidden" name="defaultDepositCommission" value="" />
          <input type="hidden" name="defaultWithdrawalCommission" value="" />

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <label className="grid gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
              <span>اسم المحفظة *</span>
              <div className="relative">
                <Landmark className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
                <input
                  name="name"
                  required
                  autoFocus
                  maxLength={120}
                  onChange={markStarted}
                  className="erp-input pr-9"
                  placeholder="مثال: Vodafone Cash، InstaPay، Zain Cash..."
                />
              </div>
            </label>

            <label className="grid gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-300">
              <span>الرصيد الافتتاحي ({currency}) <span className="font-semibold text-slate-400">(اختياري)</span></span>
              <input
                name="openingBalance"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                onChange={markStarted}
                className="erp-input font-numeric"
                placeholder="0.00"
              />
              <span className="text-[9px] font-semibold leading-4 text-slate-400">إذا كان بالمحفظة رصيد حالياً، اكتبه حتى يبدأ مسار من الرقم الصحيح.</span>
            </label>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 px-4 py-3 dark:border-cyan-900/60 dark:bg-cyan-950/20">
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
              <p className="text-[10px] font-bold leading-5 text-cyan-900 dark:text-cyan-200">إنشاء المحفظة لوحده مو كفاية. بعد هالخطوة رح نسجل أول حركة فعلية حتى تشوف كيف الرصيد يتحدث تلقائياً.</p>
            </div>
          </div>

          <WalletSetupSubmit />
        </form>
      </section>
    </div>
  );
}

function WalletSetupSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-11 w-full rounded-xl bg-teal-600 text-[11px] font-black text-white shadow-md shadow-teal-600/15 hover:bg-teal-500">
      {pending ? <><Loader2 className="ml-1.5 h-4 w-4 animate-spin" />جاري إنشاء المحفظة...</> : <><WalletCards className="ml-1.5 h-4 w-4" />إنشاء المحفظة والمتابعة</>}
    </Button>
  );
}
