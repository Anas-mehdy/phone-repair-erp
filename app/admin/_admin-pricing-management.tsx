"use client";

import { useState, useTransition } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Loader2,
  X,
  Globe2,
} from "lucide-react";
import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
} from "@prisma/client";
import { COUNTRY_DIAL_CODES } from "@/lib/countries";
import { adminUpdateSubscriptionPriceAction } from "./actions";
import { Button } from "@/components/ui/button";

export interface SubscriptionPriceRecord {
  id: string;
  countryCode: string;
  plan: SubscriptionPlan;
  billingInterval: SubscriptionBillingInterval;
  currencyCode: string;
  amount: number;
}

interface CountryPricingGroup {
  countryCode: string;
  countryName: string;
  flag: string;
  currencyCode: string;
  sixMonths?: SubscriptionPriceRecord;
  annual?: SubscriptionPriceRecord;
}

export function AdminPricingManagement({
  initialPrices,
}: {
  initialPrices: SubscriptionPriceRecord[];
}) {
  const [prices, setPrices] = useState<SubscriptionPriceRecord[]>(initialPrices);
  const [search, setSearch] = useState("");
  const [editingPrice, setEditingPrice] = useState<SubscriptionPriceRecord | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editCurrency, setEditCurrency] = useState<string>("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const countryMetaMap = new Map(
    COUNTRY_DIAL_CODES.map((c) => [c.code, { name: c.name, flag: c.flag, currency: c.currency }])
  );

  // Group prices by countryCode (PROFESSIONAL plan only)
  const countryGroupsMap = new Map<string, CountryPricingGroup>();

  for (const price of prices) {
    if (price.plan !== "PROFESSIONAL") continue;

    const meta = countryMetaMap.get(price.countryCode) || {
      name: price.countryCode === "US" ? "الولايات المتحدة / دولي" : price.countryCode,
      flag: price.countryCode === "US" ? "🇺🇸" : "🌐",
      currency: price.currencyCode,
    };

    if (!countryGroupsMap.has(price.countryCode)) {
      countryGroupsMap.set(price.countryCode, {
        countryCode: price.countryCode,
        countryName: meta.name,
        flag: meta.flag,
        currencyCode: price.currencyCode,
      });
    }

    const group = countryGroupsMap.get(price.countryCode)!;
    if (price.billingInterval === "SIX_MONTHS") {
      group.sixMonths = price;
    } else if (price.billingInterval === "ANNUAL") {
      group.annual = price;
    }
  }

  const countryGroups = Array.from(countryGroupsMap.values()).sort((a, b) =>
    a.countryCode.localeCompare(b.countryCode)
  );

  const filteredGroups = countryGroups.filter((group) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      group.countryName.toLowerCase().includes(term) ||
      group.countryCode.toLowerCase().includes(term) ||
      group.currencyCode.toLowerCase().includes(term)
    );
  });

  function handleOpenEdit(price: SubscriptionPriceRecord) {
    setEditingPrice(price);
    setEditAmount(String(price.amount));
    setEditCurrency(price.currencyCode);
    setFeedback(null);
  }

  function handleCloseEdit() {
    setEditingPrice(null);
    setFeedback(null);
  }

  function handleSavePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPrice) return;

    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: "error", message: "المبلغ يجب أن يكون رقماً موجباً." });
      return;
    }

    const curr = editCurrency.trim().toUpperCase();
    if (curr.length !== 3) {
      setFeedback({ type: "error", message: "رمز العملة يجب أن يتكون من 3 أحرف (مثل SAR)." });
      return;
    }

    const formData = new FormData();
    formData.append("countryCode", editingPrice.countryCode);
    formData.append("plan", editingPrice.plan);
    formData.append("billingInterval", editingPrice.billingInterval);
    formData.append("amount", String(amountNum));
    formData.append("currencyCode", curr);

    startTransition(async () => {
      const res = await adminUpdateSubscriptionPriceAction(formData);
      if (res.success && res.price) {
        setPrices((prev) =>
          prev.map((p) => (p.id === editingPrice.id ? (res.price as SubscriptionPriceRecord) : p))
        );
        setFeedback({
          type: "success",
          message: `تم تحديث سعر (${editingPrice.countryCode} - ${editingPrice.billingInterval === "ANNUAL" ? "سنة" : "6 أشهر"}) بنجاح.`,
        });
        setTimeout(() => handleCloseEdit(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل تعديل السعر.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-violet-400" />
            <h3 className="text-lg font-black text-white">أسعار الاشتراك حسب الدولة</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            الأسعار المعتمدة للخطة الشاملة لكل دولة (6 أشهر وسنة واحدة). التعديل محمي بصلاحية Super Admin.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالدولة أو كود العملة..."
            className="w-full rounded-xl bg-slate-950/80 border border-slate-800 pr-9 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Country Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <div
            key={group.countryCode}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg space-y-4 hover:border-slate-700 transition"
          >
            {/* Country Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{group.flag}</span>
                <div>
                  <h4 className="font-black text-white text-sm">
                    {group.countryName}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    كود: {group.countryCode}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 font-numeric font-black text-xs">
                {group.currencyCode}
              </span>
            </div>

            {/* Pricing Section (6 Months and Annual) */}
            <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-teal-300">
                  الخطة الشاملة
                </span>
                <span className="text-[9px] text-slate-400">شاملة كافة الميزات • 5 مقاعد</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-numeric">
                {/* 6 Months */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">6 أشهر</span>
                    <span className="font-bold text-white text-sm">
                      {group.sixMonths
                        ? `${group.sixMonths.amount.toLocaleString()} ${group.sixMonths.currencyCode}`
                        : "غير محدد"}
                    </span>
                  </div>
                  {group.sixMonths && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(group.sixMonths!)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                      title="تعديل السعر"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Annual */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">سنة واحدة</span>
                    <span className="font-bold text-white text-sm">
                      {group.annual
                        ? `${group.annual.amount.toLocaleString()} ${group.annual.currencyCode}`
                        : "غير محدد"}
                    </span>
                  </div>
                  {group.annual && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(group.annual!)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                      title="تعديل السعر"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Price Modal */}
      {editingPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  تعديل سعر الاشتراك
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-bold">
                  دولة: {editingPrice.countryCode} —{" "}
                  {editingPrice.billingInterval === "ANNUAL" ? "سنة واحدة" : "6 أشهر"}
                </p>
              </div>
              <button
                onClick={handleCloseEdit}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  المبلغ الجديد
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white font-numeric"
                  placeholder="مثال: 599.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رمز العملة (ISO 3)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  required
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value.toUpperCase())}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white font-mono uppercase"
                  placeholder="SAR"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                  disabled={isPending}
                  className="rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                >
                  {isPending ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      جاري الحفظ...
                    </span>
                  ) : (
                    "حفظ السعر"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
