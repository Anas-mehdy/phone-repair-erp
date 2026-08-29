"use client";

import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Clock,
  AlertCircle,
  Flame,
  Tag,
  Check,
  Crown,
  Calendar,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  calculateDiscountedPrice,
  type SubscriptionOfferData,
} from "@/lib/subscription/offer-pricing";
import type { EntitlementContext } from "@/lib/services/subscriptionEntitlementService";


interface PriceInfo {
  amount: number;
  currencyCode: string;
}

interface SubscriptionViewProps {
  shop: {
    name: string;
    countryCode: string;
    currency: string;
  };
  entitlement: EntitlementContext;
  offer: SubscriptionOfferData;
  sixMonthsPrice: PriceInfo | null;
  annualPrice: PriceInfo | null;
}

export function SubscriptionView({
  shop,
  entitlement,
  offer,
  sixMonthsPrice,
  annualPrice,
}: SubscriptionViewProps) {
  const [selectedInterval, setSelectedInterval] = useState<"ANNUAL" | "SIX_MONTHS">(
    "ANNUAL",
  );

  const sub = entitlement.subscription;
  const effectiveStatus = sub.effectiveStatus;
  const isOfferActive = offer.isActive && offer.remainingEligible > 0;
  const isOfferSoldOut = offer.isActive && offer.remainingEligible === 0;

  // Derived offer progress
  const claimedCount = Math.max(0, offer.totalEligible - offer.remainingEligible);
  const claimedPercentage =
    offer.totalEligible > 0
      ? Math.min(100, Math.max(0, Math.round((claimedCount / offer.totalEligible) * 100)))
      : 0;

  // Selected pricing calculation
  const currentPriceInfo =
    selectedInterval === "ANNUAL" ? annualPrice : sixMonthsPrice;
  const basePrice = currentPriceInfo?.amount ?? 0;
  const currencyCode = currentPriceInfo?.currencyCode || shop.currency || "SAR";

  const discountPercent = isOfferActive
    ? selectedInterval === "ANNUAL"
      ? offer.annualDiscountPercent
      : offer.sixMonthsDiscountPercent
    : 0;

  const finalPrice = calculateDiscountedPrice(basePrice, discountPercent);

  // Status remaining calculation
  const now = new Date();
  const formatRemainingTime = () => {
    if (effectiveStatus === "TRIALING") {
      const ms = Math.max(0, new Date(sub.trialEndsAt).getTime() - now.getTime());
      const days = Math.floor(ms / (24 * 60 * 60 * 1000));
      const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      return {
        label: "الفترة التجريبية",
        detail:
          days > 0
            ? `متبقي ${days} يوم و${hours} ساعة على انتهاء الفترة التجريبية`
            : `متبقي ${hours} ساعة على انتهاء الفترة التجريبية`,
        date: new Date(sub.trialEndsAt).toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    }
    if (effectiveStatus === "ACTIVE" && sub.currentPeriodEndsAt) {
      const ms = Math.max(0, new Date(sub.currentPeriodEndsAt).getTime() - now.getTime());
      const days = Math.floor(ms / (24 * 60 * 60 * 1000));
      return {
        label: "اشتراك نشط",
        detail: `ينتهي الاشتراك بعد ${days} يوم`,
        date: new Date(sub.currentPeriodEndsAt).toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    }
    if (effectiveStatus === "GRACE_PERIOD" && sub.gracePeriodEndsAt) {
      const ms = Math.max(0, new Date(sub.gracePeriodEndsAt).getTime() - now.getTime());
      const days = Math.floor(ms / (24 * 60 * 60 * 1000));
      const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      return {
        label: "مهلة تجديد مؤقتة",
        detail:
          days > 0
            ? `متبقي ${days} يوم و${hours} ساعة قبل توقف العمليات`
            : `متبقي ${hours} ساعة قبل توقف العمليات`,
        date: new Date(sub.gracePeriodEndsAt).toLocaleDateString("ar-SA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
    }
    if (effectiveStatus === "EXPIRED") {
      return {
        label: "انتهى الاشتراك",
        detail: "بيانات متجرك وسجلاتك محفوظة بالكامل. اختر خطة للمتابعة.",
        date: null,
      };
    }
    return {
      label: "تم إلغاء الاشتراك",
      detail: "تواصل مع الدعم الفني لإعادة تفعيل الاشتراك.",
      date: null,
    };
  };

  const statusInfo = formatRemainingTime();

  // WhatsApp link generator
  const buildWhatsAppHref = (interval: "ANNUAL" | "SIX_MONTHS") => {
    const intervalLabel = interval === "ANNUAL" ? "سنة كاملة" : "6 أشهر";
    const priceInfo = interval === "ANNUAL" ? annualPrice : sixMonthsPrice;
    const base = priceInfo?.amount ?? 0;
    const curr = priceInfo?.currencyCode || shop.currency || "SAR";
    const disc = isOfferActive
      ? interval === "ANNUAL"
        ? offer.annualDiscountPercent
        : offer.sixMonthsDiscountPercent
      : 0;
    const final = calculateDiscountedPrice(base, disc);

    const cleanPhone = "905350215375";
    let message = `مرحباً، أريد الاشتراك في خطة مسار الشاملة لمدة ${intervalLabel} لمتجري (${shop.name})`;

    if (isOfferActive && disc > 0) {
      message += ` بسعر (${final} ${curr}) ضمن عرض المشتركين الأوائل (خصم ${disc}% من ${base} ${curr}).`;
    } else {
      message += ` بسعر (${final} ${curr}).`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const features = [
    "طلبات صيانة غير محدودة",
    "المبيعات ونقطة البيع (POS)",
    "الفواتير والدفعات والأقساط",
    "المستودع والمخزون وقطع الغيار",
    "دليل التوافقات والبدائل غير محدود",
    "التقارير والأرباح المحاسبية المتقدمة",
    "حتى 5 مستخدمين شامل مالك المتجر",
    "جميع الميزات الحالية والتحديثات المستمرة",
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <span className="text-[11px] font-black tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            اشتراك مسار
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            اشتراكي
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            تابع حالة اشتراك متجرك واستفد من عرض الاشتراك المتاح لبلدك.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-xs px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>المتجر: {shop.name}</span>
        </div>
      </div>

      {/* 2. Current Subscription Status Card */}
      <div
        className={`rounded-3xl p-6 border shadow-sm transition-all ${
          effectiveStatus === "ACTIVE"
            ? "bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 border-emerald-200/80 text-emerald-950"
            : effectiveStatus === "TRIALING"
            ? "bg-gradient-to-br from-amber-50 via-white to-orange-50/40 border-amber-200/80 text-amber-950"
            : effectiveStatus === "GRACE_PERIOD"
            ? "bg-gradient-to-br from-orange-50 via-white to-amber-50/40 border-orange-300 text-orange-950"
            : "bg-gradient-to-br from-rose-50 via-white to-orange-50/40 border-rose-200/80 text-rose-950"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                effectiveStatus === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : effectiveStatus === "TRIALING"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : effectiveStatus === "GRACE_PERIOD"
                  ? "bg-orange-100 text-orange-700 border-orange-200"
                  : "bg-rose-100 text-rose-700 border-rose-200"
              }`}
            >
              {effectiveStatus === "ACTIVE" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : effectiveStatus === "TRIALING" ? (
                <Sparkles className="h-6 w-6" />
              ) : effectiveStatus === "GRACE_PERIOD" ? (
                <Clock className="h-6 w-6" />
              ) : (
                <AlertCircle className="h-6 w-6" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  الحالة الحالية
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${
                    effectiveStatus === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
                      : effectiveStatus === "TRIALING"
                      ? "bg-amber-500/10 text-amber-800 border-amber-500/20"
                      : effectiveStatus === "GRACE_PERIOD"
                      ? "bg-orange-500/10 text-orange-800 border-orange-500/20"
                      : "bg-rose-500/10 text-rose-800 border-rose-500/20"
                  }`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {statusInfo.detail}
              </h3>
              {statusInfo.date && (
                <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5 pt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>تاريخ الانتهاء: {statusInfo.date}</span>
                </p>
              )}
            </div>
          </div>

          <div className="sm:self-center">
            <Button
              asChild
              className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs shadow-sm h-10 px-5"
            >
              <a
                href={buildWhatsAppHref(selectedInterval)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="ml-1.5 h-4 w-4 text-emerald-400" />
                تواصل مع الدعم للتجديد
                <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Founders Offer Banner */}
      {isOfferActive && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-2 border-amber-400/40 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-md shadow-amber-500/5">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
                  <Flame className="h-4 w-4 fill-current" />
                </span>
                <h3 className="text-base sm:text-lg font-black text-amber-950">
                  عرض خاص للمشتركين الأوائل
                </h3>
                <span className="bg-amber-500/20 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  عرض الإطلاق 🔥
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                استفد من سعر الإطلاق الخاص لمسار ضمن العدد المحدود من الاشتراكات
                المؤهلة للعرض.
              </p>

              <p className="text-[11px] text-amber-900/80 font-bold">
                سعر الإطلاق الخاص بك يبقى محفوظاً لك ما دام اشتراكك مستمراً وفق
                شروط العرض.
              </p>
            </div>

            {/* Quota Progress Gauge */}
            <div className="bg-white/90 backdrop-blur-xs border border-amber-300/80 rounded-2xl p-4 sm:p-5 lg:w-80 shrink-0 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950">
                  الاشتراكات المتبقية
                </span>
                <span className="text-xs font-black text-amber-700 font-numeric bg-amber-100/80 px-2 py-0.5 rounded-md">
                  {offer.remainingEligible} من {offer.totalEligible}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-full transition-all duration-500 shadow-xs"
                  style={{ width: `${claimedPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700">
                <span>تم حجز {claimedCount} اشتراك</span>
                <span className="text-amber-800 font-black">
                  بادر بالاشتراك قبل اكتمال العدد
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOfferSoldOut && (
        <div className="bg-slate-100 border border-slate-300 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold text-slate-700">
          <Tag className="h-4 w-4 text-slate-500" />
          <span>اكتمل العدد المخصص لعرض المشتركين الأوائل.</span>
        </div>
      )}

      {/* 4. Single Plan Presentation & Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Plan Features Card */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <Crown className="h-5 w-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                الخطة الشاملة
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              كل ما تحتاجه لإدارة ورشة الصيانة من مكان واحد، دون قيود على
              العمليات الأساسية.
            </p>
          </div>

          {/* Features Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              الميزات المتضمنة في الخطة:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100/80"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs font-medium text-slate-500 leading-relaxed">
            * جميع الحسابات تشمل إمكانية العمل لـ 5 مستخدمين وموظفين في المتجر
            (شامل مالك المتجر) بصلاحيات وأدوار مخصصة لكل موظف.
          </div>
        </div>

        {/* Pricing Selector & CTA Card */}
        <div className="lg:col-span-5 bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          {/* Duration Selector Tabs */}
          <div className="space-y-2 relative z-10">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              اختر مدة الاشتراك:
            </span>

            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedInterval("ANNUAL")}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  selectedInterval === "ANNUAL"
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>سنة كاملة</span>
                {offer.annualDiscountPercent > 0 && isOfferActive && (
                  <span
                    className={`text-[9px] font-black px-1.5 rounded-full ${
                      selectedInterval === "ANNUAL"
                        ? "bg-white text-primary"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    خصم %{offer.annualDiscountPercent}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedInterval("SIX_MONTHS")}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 relative ${
                  selectedInterval === "SIX_MONTHS"
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>6 أشهر</span>
                {offer.sixMonthsDiscountPercent > 0 && isOfferActive && (
                  <span
                    className={`text-[9px] font-black px-1.5 rounded-full ${
                      selectedInterval === "SIX_MONTHS"
                        ? "bg-white text-primary"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    خصم %{offer.sixMonthsDiscountPercent}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Price Calculation Display */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-3 relative z-10 text-center">
            <span className="text-xs font-bold text-slate-400">
              قيمة الاشتراك لـ {selectedInterval === "ANNUAL" ? "سنة كاملة" : "6 أشهر"}:
            </span>

            <div className="flex items-baseline justify-center gap-3">
              {discountPercent > 0 && (
                <span className="text-base sm:text-lg font-bold text-slate-500 line-through font-numeric">
                  {basePrice} {currencyCode}
                </span>
              )}
              <span className="text-3xl sm:text-4xl font-black text-white font-numeric tracking-tight">
                {finalPrice}
              </span>
              <span className="text-sm font-bold text-slate-400 font-numeric">
                {currencyCode}
              </span>
            </div>

            {discountPercent > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black">
                <Tag className="h-3.5 w-3.5" />
                <span>وفرت {Math.round(basePrice - finalPrice)} {currencyCode} (خصم %{discountPercent})</span>
              </div>
            )}
          </div>

          {/* WhatsApp CTA Action */}
          <div className="space-y-3 relative z-10">
            <Button
              asChild
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl h-12 text-sm shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <a
                href={buildWhatsAppHref(selectedInterval)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="ml-2 h-5 w-5 fill-current" />
                طلب الاشتراك عبر واتساب
                <ArrowUpRight className="mr-1.5 h-4 w-4" />
              </a>
            </Button>

            <p className="text-center text-[11px] text-slate-400 font-medium leading-relaxed">
              يتم تأكيد وتفعيل الاشتراك مباشرة بعد التواصل مع فريق مسار عبر
              الواتساب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
