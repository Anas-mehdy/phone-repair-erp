"use client";

import { useState, useTransition } from "react";
import {
  Tag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Percent,
  Users,
  Flame,
  Power,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminUpdateOfferSettingsAction } from "./actions";
import type { SubscriptionOfferData } from "@/lib/subscription/offer-pricing";


interface AdminOfferManagementProps {
  initialOffer: SubscriptionOfferData;
}

export function AdminOfferManagement({
  initialOffer,
}: AdminOfferManagementProps) {
  const [isPending, startTransition] = useTransition();
  const [offer, setOffer] = useState<SubscriptionOfferData>(initialOffer);

  const [isActive, setIsActive] = useState(initialOffer.isActive);
  const [totalEligible, setTotalEligible] = useState(initialOffer.totalEligible);
  const [remainingEligible, setRemainingEligible] = useState(
    initialOffer.remainingEligible,
  );
  const [sixMonthsDiscount, setSixMonthsDiscount] = useState(
    initialOffer.sixMonthsDiscountPercent,
  );
  const [annualDiscount, setAnnualDiscount] = useState(
    initialOffer.annualDiscountPercent,
  );

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Derived metrics for preview
  const claimedCount = Math.max(0, totalEligible - remainingEligible);
  const claimedPercentage =
    totalEligible > 0
      ? Math.min(100, Math.max(0, Math.round((claimedCount / totalEligible) * 100)))
      : 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.set("isActive", String(isActive));
    formData.set("totalEligible", String(totalEligible));
    formData.set("remainingEligible", String(remainingEligible));
    formData.set("sixMonthsDiscountPercent", String(sixMonthsDiscount));
    formData.set("annualDiscountPercent", String(annualDiscount));

    startTransition(async () => {
      const res = await adminUpdateOfferSettingsAction(formData);
      if (res.success && res.offer) {
        setOffer(res.offer);
        setFeedback({
          type: "success",
          message: "تم حفظ وتحديث إعدادات عرض المشتركين الأوائل بنجاح.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "تعذر حفظ إعدادات العرض.",
        });
      }
    });
  };

  const handleReset = () => {
    setIsActive(offer.isActive);
    setTotalEligible(offer.totalEligible);
    setRemainingEligible(offer.remainingEligible);
    setSixMonthsDiscount(offer.sixMonthsDiscountPercent);
    setAnnualDiscount(offer.annualDiscountPercent);
    setFeedback(null);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  عرض المشتركين الأوائل (Founders Offer)
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {isActive ? "العرض نشط حالياً" : "العرض متوقف"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                تحكم يدوي كامل في إعدادات عرض الإطلاق للمشتركين الجدد: نسبة الخصم لكل
                فترة، والعدد الإجمالي والمتبقي من الاشتراكات المؤهلة المعروضة في صفحة
                الاشتراك.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                isActive
                  ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Power className="h-4 w-4" />
              <span>{isActive ? "إيقاف العرض" : "تفعيل العرض"}</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
            feedback.type === "success"
              ? "bg-emerald-950/40 text-emerald-200 border-emerald-800"
              : "bg-rose-950/40 text-rose-200 border-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>إعدادات العرض والخصومات</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                يتم التحديث فورياً لجميع المتاجر
              </span>
            </div>

            {/* Toggle Status */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <label
                  htmlFor="offer-active-toggle"
                  className="text-xs font-black text-slate-200 block"
                >
                  حالة العرض التسويقي
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  عند التعطيل، لن تظهر أي خصومات أو شريط العرض للمتاجر في صفحة
                  الاشتراك.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="offer-active-toggle"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Quota Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                  <span>إجمالي الاشتراكات المؤهلة</span>
                  <span className="text-[10px] text-slate-500 font-numeric">
                    (1 - 100,000)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={totalEligible}
                    onChange={(e) =>
                      setTotalEligible(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-amber-500"
                  />
                  <Users className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                  <span>العدد المتبقي حالياً</span>
                  <span className="text-[10px] text-slate-500 font-numeric">
                    (0 - {totalEligible})
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={totalEligible}
                    value={remainingEligible}
                    onChange={(e) =>
                      setRemainingEligible(
                        Math.max(0, parseInt(e.target.value, 10) || 0),
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-amber-500"
                  />
                  <Flame className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Discount Percentages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                  <span>نسبة خصم اشتراك 6 أشهر</span>
                  <span className="text-[10px] text-amber-400 font-numeric">
                    %{sixMonthsDiscount}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={sixMonthsDiscount}
                    onChange={(e) =>
                      setSixMonthsDiscount(
                        Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-amber-500"
                  />
                  <Percent className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-500">
                  إذا كانت 0%، يظهر السعر الأصلي دون خصم.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                  <span>نسبة خصم اشتراك سنة كاملة</span>
                  <span className="text-[10px] text-amber-400 font-numeric">
                    %{annualDiscount}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={annualDiscount}
                    onChange={(e) =>
                      setAnnualDiscount(
                        Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-amber-500"
                  />
                  <Percent className="h-4 w-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-500">
                  إذا كانت 0%، يظهر السعر الأصلي دون خصم.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isPending}
                className="bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-bold"
              >
                <RotateCcw className="h-3.5 w-3.5 ml-1.5" />
                إلغاء التغييرات
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-600/20"
              >
                {isPending ? "جاري الحفظ..." : "حفظ إعدادات العرض"}
              </Button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-400" />
                <span>معاينة حية للمشتركين</span>
              </h4>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50">
                {isActive ? "مفعّل" : "معطّل"}
              </span>
            </div>

            {/* Live Progress Box */}
            <div className="bg-gradient-to-br from-amber-950/30 to-slate-950 border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-amber-200">
                  عرض خاص للمشتركين الأوائل
                </span>
                <span className="font-extrabold text-white text-[11px] font-numeric">
                  {remainingEligible} متبقي
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${claimedPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-numeric">
                  <span>تم حجز {claimedCount} اشتراك</span>
                  <span>من أصل {totalEligible}</span>
                </div>
              </div>

              <p className="text-[11px] text-amber-200/80 leading-relaxed pt-1 border-t border-amber-500/10">
                متبقي {remainingEligible} من أصل {totalEligible} اشتراكاً مؤهلاً
                للحصول على الخصم الخاص.
              </p>
            </div>

            {/* Discounts summary */}
            <div className="space-y-2 pt-2">
              <h5 className="text-[11px] font-bold text-slate-400">
                الخصومات المطبقة في العرض:
              </h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    خصم 6 أشهر
                  </span>
                  <span className="text-base font-black text-amber-400 font-numeric">
                    %{sixMonthsDiscount}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    خصم سنة كاملة
                  </span>
                  <span className="text-base font-black text-amber-400 font-numeric">
                    %{annualDiscount}
                  </span>
                </div>
              </div>
            </div>

            {remainingEligible === 0 && (
              <div className="bg-rose-950/30 border border-rose-800/50 p-3 rounded-xl text-center">
                <span className="text-[11px] font-bold text-rose-300 block">
                  اكتمل العدد المخصص لعرض المشتركين الأوائل.
                </span>
                <span className="text-[10px] text-rose-400/80 mt-0.5 block">
                  لن يُطبّق أي خصم في صفحة المشترك عند وصول المتبقي إلى 0.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
