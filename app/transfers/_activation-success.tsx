"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check, CheckCircle2, LayoutDashboard, WalletCards } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import { formatCurrency } from "@/lib/format";

export function WalletActivationSuccess({
  walletName,
  currentBalance,
  currency,
}: {
  walletName: string;
  currentBalance: number;
  currency: string;
}) {
  useEffect(() => {
    captureClientEvent(ANALYTICS_EVENTS.WALLET_BALANCE_IMPACT_VIEWED, {
      onboarding_mode: true,
      onboarding_flow: "wallets_first_value",
      source: "transfer_details_onboarding",
    });
  }, []);

  return (
    <section className="overflow-hidden rounded-[24px] border border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-teal-50/70 shadow-sm dark:border-emerald-900/70 dark:from-emerald-950/30 dark:via-slate-950 dark:to-teal-950/20">
      <div className="flex items-start gap-3 border-b border-emerald-100 px-5 py-4 dark:border-emerald-900/50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span>
        <div><p className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">أول قيمة من المحافظ وصلت ✅</p><h2 className="mt-0.5 text-[17px] font-black text-slate-950 dark:text-slate-50">مسار حدّث الرصيد من الحركة نفسها</h2><p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">هيك صار عندك محفظة وحركة مالية فعلية وسجل يمكن الرجوع له بأي وقت.</p></div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-[1fr_230px]">
        <div className="space-y-2.5">
          {[
            "أنشأت أول محفظة",
            "سجلت أول حركة مالية",
            "شاهدت أثر الحركة على الرصيد",
          ].map((label) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2.5 text-[10px] font-black text-slate-700 dark:border-emerald-900/50 dark:bg-slate-900/70 dark:text-slate-200"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="h-3 w-3" /></span>{label}</div>
          ))}
        </div>

        <div className="rounded-2xl border border-teal-200 bg-white/85 p-4 text-center dark:border-teal-900/60 dark:bg-slate-900/70">
          <WalletCards className="mx-auto h-5 w-5 text-teal-600" />
          <p className="mt-2 truncate text-[10px] font-black text-slate-500">{walletName}</p>
          <p className="mt-1 font-numeric text-xl font-black text-teal-800 dark:text-teal-200">{formatCurrency(currentBalance, currency)}</p>
          <p className="mt-0.5 text-[9px] font-bold text-slate-400">الرصيد الحالي</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-emerald-100 px-5 py-4 sm:flex-row sm:justify-end dark:border-emerald-900/50">
        <Link href="/transfers" className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-[10px] font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">إدارة المحافظ والتحويلات</Link>
        <Link href="/dashboard" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-[10px] font-black text-white hover:bg-emerald-500"><LayoutDashboard className="h-3.5 w-3.5" />الانتقال للوحة التحكم</Link>
      </div>
    </section>
  );
}
