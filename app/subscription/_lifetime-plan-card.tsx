"use client";

import { Crown, Flame, Infinity, MessageCircle, Sparkles } from "lucide-react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import type { MonetizationStage } from "@/lib/monetization/onboarding";
import { Button } from "@/components/ui/button";

export interface LifetimePriceInfo {
  amount: number;
  currencyCode: string;
}

export function LifetimePlanCard({
  shopName,
  price,
  totalEligible,
  remainingEligible,
  isActive,
  subscriptionStatus,
  monetizationStage,
}: {
  shopName: string;
  price: LifetimePriceInfo | null;
  totalEligible: number;
  remainingEligible: number;
  isActive: boolean;
  subscriptionStatus: string;
  monetizationStage?: MonetizationStage | null;
}) {
  const soldOut = remainingEligible <= 0;
  const available = isActive && !soldOut && price;
  const claimed = Math.max(0, totalEligible - remainingEligible);
  const progress = totalEligible > 0 ? Math.min(100, Math.round((claimed / totalEligible) * 100)) : 0;
  const message = price
    ? `مرحباً، أريد الاشتراك في خطة مسار مدى الحياة لمتجري (${shopName}) بسعر (${price.amount} ${price.currencyCode}) ضمن العرض المحدود لأول ${totalEligible} مشترك.`
    : "مرحباً، أريد الاستفسار عن خطة مسار مدى الحياة لمتجري.";
  const href = `https://wa.me/905350215375?text=${encodeURIComponent(message)}`;

  function trackLifetimeUpgrade() {
    if (!price) return;
    captureClientEvent(ANALYTICS_EVENTS.UPGRADE_CLICKED, {
      destination: "whatsapp",
      interval: "lifetime",
      price: price.amount,
      currency_code: price.currencyCode,
      discount_percent: 0,
      subscription_status: subscriptionStatus,
      offer_state: "lifetime_limited",
      monetization_stage: monetizationStage ?? "unscoped",
    });
  }

  return (
    <section id="lifetime-plan" className="mx-auto mb-8 max-w-6xl overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg shadow-amber-500/10">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_340px] lg:items-center">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-slate-950"><Crown className="h-5 w-5 fill-current" /></span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-950 sm:text-2xl">خطة مسار مدى الحياة</h2>
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">عرض محدود</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-600">دفعة واحدة فقط، واستخدم الخطة الشاملة مدى الحياة بدون تجديد سنوي.</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-white/80 p-3"><Infinity className="mb-1 h-4 w-4 text-amber-600" /><div className="text-xs font-black text-slate-900">استخدام مدى الحياة</div><div className="mt-0.5 text-[10px] font-semibold text-slate-500">لا يوجد تاريخ انتهاء</div></div>
            <div className="rounded-2xl border border-amber-200 bg-white/80 p-3"><Sparkles className="mb-1 h-4 w-4 text-amber-600" /><div className="text-xs font-black text-slate-900">الخطة الشاملة</div><div className="mt-0.5 text-[10px] font-semibold text-slate-500">جميع الميزات الحالية</div></div>
            <div className="rounded-2xl border border-amber-200 bg-white/80 p-3"><Flame className="mb-1 h-4 w-4 text-amber-600" /><div className="text-xs font-black text-slate-900">عدد محدود</div><div className="mt-0.5 text-[10px] font-semibold text-slate-500">العداد يتم تحديثه يدوياً من الإدارة</div></div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl">
          <div className="text-center">
            <span className="text-[11px] font-black text-amber-300">سعر مدى الحياة</span>
            {price ? (
              <div className="mt-2 flex items-baseline justify-center gap-2"><span className="font-numeric text-4xl font-black">{price.amount.toLocaleString()}</span><span className="font-numeric text-sm font-bold text-slate-400">{price.currencyCode}</span></div>
            ) : (
              <div className="mt-2 text-sm font-black text-slate-300">السعر غير محدد لهذه الدولة بعد</div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="flex items-center justify-between text-xs font-black"><span>المتبقي من العرض</span><span className="font-numeric text-amber-300">{remainingEligible} من {totalEligible}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} /></div>
          </div>

          <Button asChild={Boolean(available)} disabled={!available} className="mt-4 h-12 w-full rounded-2xl bg-amber-500 font-black text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
            {available ? (
              <a href={href} onClick={trackLifetimeUpgrade} target="_blank" rel="noopener noreferrer"><MessageCircle className="ml-2 h-5 w-5" />طلب خطة مدى الحياة</a>
            ) : (
              <span>{soldOut ? "اكتمل العدد المخصص" : "الخطة غير متاحة حالياً"}</span>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
