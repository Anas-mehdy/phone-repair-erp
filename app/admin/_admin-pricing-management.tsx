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
import { Button } from "@/components/ui/button";
import { COUNTRY_DIAL_CODES } from "@/lib/countries";
import { adminUpdateSubscriptionPriceAction } from "./actions";

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
  basicSixMonths?: SubscriptionPriceRecord;
  basicAnnual?: SubscriptionPriceRecord;
  proSixMonths?: SubscriptionPriceRecord;
  proAnnual?: SubscriptionPriceRecord;
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

  // Group prices by countryCode
  const countryGroupsMap = new Map<string, CountryPricingGroup>();

  for (const price of prices) {
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
    if (price.plan === "BASIC" && price.billingInterval === "SIX_MONTHS") {
      group.basicSixMonths = price;
    } else if (price.plan === "BASIC" && price.billingInterval === "ANNUAL") {
      group.basicAnnual = price;
    } else if (price.plan === "PROFESSIONAL" && price.billingInterval === "SIX_MONTHS") {
      group.proSixMonths = price;
    } else if (price.plan === "PROFESSIONAL" && price.billingInterval === "ANNUAL") {
      group.proAnnual = price;
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

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedback({ type: "error", message: "المبلغ يجب أن يكون رقماً موجباً أكبر من صفر." });
      return;
    }

    const trimmedCurrency = editCurrency.trim().toUpperCase();
    if (trimmedCurrency.length !== 3) {
      setFeedback({ type: "error", message: "رمز العملة يجب أن يتكون من 3 أحرف (مثل SAR, TRY, EGP)." });
      return;
    }

    const formData = new FormData();
    formData.append("countryCode", editingPrice.countryCode);
    formData.append("plan", editingPrice.plan);
    formData.append("billingInterval", editingPrice.billingInterval);
    formData.append("amount", String(numAmount));
    formData.append("currencyCode", trimmedCurrency);

    startTransition(async () => {
      const res = await adminUpdateSubscriptionPriceAction(formData);
      if (res.success && res.price) {
        setPrices((prev) =>
          prev.map((p) =>
            p.countryCode === editingPrice.countryCode &&
            p.plan === editingPrice.plan &&
            p.billingInterval === editingPrice.billingInterval
              ? {
                  ...p,
                  amount: res.price!.amount,
                  currencyCode: res.price!.currencyCode,
                }
              : p
          )
        );
        setFeedback({
          type: "success",
          message: `تم تحديث السعر بنجاح إلى ${numAmount.toLocaleString()} ${trimmedCurrency}`,
        });
        setTimeout(() => handleCloseEdit(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل تحديث السعر.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-black text-white">
              كتالوج أسعار الاشتراكات حسب الدولة ({countryGroups.length} دولة)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-bold">
            تعديل وتخصيص أسعار الخطط (6 أشهر / سنة) لكل دولة والعملة الخاصة بها
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالدولة أو رمز العملة..."
            className="w-full rounded-xl bg-slate-950/80 border border-slate-800 pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none"
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

            {/* BASIC Plan Section */}
            <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-blue-300">
                  الخطة الأساسية (BASIC)
                </span>
                <span className="text-[9px] text-slate-400">مستخدم 1 • 100 تذكرة/شهر</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-numeric">
                {/* 6 Months */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">6 أشهر</span>
                    <span className="font-bold text-white">
                      {group.basicSixMonths
                        ? `${group.basicSixMonths.amount.toLocaleString()} ${group.basicSixMonths.currencyCode}`
                        : "غير محدد"}
                    </span>
                  </div>
                  {group.basicSixMonths && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(group.basicSixMonths!)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                      title="تعديل السعر"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Annual */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">سنة واحدة</span>
                    <span className="font-bold text-white">
                      {group.basicAnnual
                        ? `${group.basicAnnual.amount.toLocaleString()} ${group.basicAnnual.currencyCode}`
                        : "غير محدد"}
                    </span>
                  </div>
                  {group.basicAnnual && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(group.basicAnnual!)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                      title="تعديل السعر"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* PROFESSIONAL Plan Section */}
            <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-teal-300">
                  الخطة الاحترافية (PROFESSIONAL)
                </span>
                <span className="text-[9px] text-slate-400">غير محدود • كل المزايا</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-numeric">
                {/* 6 Months */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">6 أشهر</span>
                    <span className="font-bold text-white">
                      {group.proSixMonths
                        ? `${group.proSixMonths.amount.toLocaleString()} ${group.proSixMonths.currencyCode}`
                        : "غير محدد"}
                    </span>
                  </div>
                  {group.proSixMonths && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(group.proSixMonths!)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                      title="تعديل السعر"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Annual */}
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">سنة واحدة</span>
                    <span className="font-bold text-white">
                      {group.proAnnual
                        ? `${group.proAnnual.amount.toLocaleString()} ${group.proAnnual.currencyCode}`
                        : "غير محدد"}
                    </span>
                  </div>
                  {group.proAnnual && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(group.proAnnual!)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md"
                      title="تعديل السعر"
                    >
                      <Edit2 className="h-3 w-3" />
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
                  {countryMetaMap.get(editingPrice.countryCode)?.name || editingPrice.countryCode} (
                  {editingPrice.countryCode}) •{" "}
                  {editingPrice.plan === "BASIC" ? "الأساسية" : "الاحترافية"} •{" "}
                  {editingPrice.billingInterval === "SIX_MONTHS" ? "6 أشهر" : "سنة"}
                </p>
              </div>
              <button
                onClick={handleCloseEdit}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
                  السعر الجديد
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-sm font-numeric text-white focus:border-violet-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رمز العملة (3 أحرف)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  required
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value.toUpperCase())}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-sm font-numeric text-white uppercase focus:border-violet-500 focus:outline-none"
                  placeholder="SAR"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseEdit}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-1" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 ml-1" />
                  )}
                  حفظ السعر
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
