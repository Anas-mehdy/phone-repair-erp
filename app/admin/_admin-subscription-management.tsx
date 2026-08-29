"use client";

import { useState, useTransition } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Ban,
  Sparkles,
  PlusCircle,
  CreditCard,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { COUNTRY_DIAL_CODES } from "@/lib/countries";
import {
  adminActivateSubscriptionAction,
  adminCancelSubscriptionAction,
  adminGrantExtraDaysAction,
  adminMarkSubscriptionExpiredAction,
  adminStartGracePeriodAction,
} from "./actions";

export interface SubscriptionItemData {
  id: string;
  shopId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus;
  billingInterval: SubscriptionBillingInterval | null;
  trialStartedAt: Date | string;
  trialEndsAt: Date | string;
  currentPeriodStartedAt: Date | string | null;
  currentPeriodEndsAt: Date | string | null;
  gracePeriodEndsAt: Date | string | null;
  activatedAt: Date | string | null;
  canceledAt: Date | string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  adminNotes: string | null;
  foundersOfferEligible: boolean;
  foundersOfferGrantedAt: Date | string | null;
  foundersOfferSixMonthsDiscountPercent: number | null;
  foundersOfferAnnualDiscountPercent: number | null;
  shop: {

    id: string;
    name: string;
    countryCode: string;
    deletedAt: Date | string | null;
  };
}

const STATUS_BADGES: Record<
  SubscriptionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  ACTIVE: {
    label: "مفعل مدفوع",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  TRIALING: {
    label: "فترة تجريبية",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  GRACE_PERIOD: {
    label: "مهلة تجديد",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  EXPIRED: {
    label: "منتهي",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  CANCELED: {
    label: "ملغي",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
};

const INTERVAL_LABELS: Record<SubscriptionBillingInterval, string> = {
  SIX_MONTHS: "6 أشهر",
  ANNUAL: "سنة واحدة",
};

export function AdminSubscriptionManagement({
  initialSubscriptions,
}: {
  initialSubscriptions: SubscriptionItemData[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal States
  const [activeModal, setActiveModal] = useState<
    "activate" | "grace" | "extraDays" | "expire" | "cancel" | null
  >(null);
  const [selectedSub, setSelectedSub] = useState<SubscriptionItemData | null>(null);

  // Form States
  const [activateInterval, setActivateInterval] =
    useState<SubscriptionBillingInterval>(SubscriptionBillingInterval.ANNUAL);
  const [activateExtraDays, setActivateExtraDays] = useState(0);
  const [activatePaymentMethod, setActivatePaymentMethod] = useState("");
  const [activatePaymentRef, setActivatePaymentRef] = useState("");
  const [activateNotes, setActivateNotes] = useState("");
  const [activateGrantFoundersOffer, setActivateGrantFoundersOffer] = useState(false);

  const [graceDays, setGraceDays] = useState(3);
  const [extraDaysCount, setExtraDaysCount] = useState(30);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const countryMap = new Map(
    COUNTRY_DIAL_CODES.map((c) => [c.code, { name: c.name, flag: c.flag }])
  );

  const filtered = initialSubscriptions.filter((sub) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      sub.shop.name.toLowerCase().includes(term) ||
      sub.shop.countryCode.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "all" || sub.effectiveStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openModal(
    modal: "activate" | "grace" | "extraDays" | "expire" | "cancel",
    sub: SubscriptionItemData
  ) {
    setSelectedSub(sub);
    setActiveModal(modal);
    setFeedback(null);

    if (modal === "activate") {
      setActivateInterval(
        sub.billingInterval || SubscriptionBillingInterval.ANNUAL
      );
      setActivateExtraDays(0);
      setActivatePaymentMethod(sub.paymentMethod || "");
      setActivatePaymentRef(sub.paymentReference || "");
      setActivateNotes(sub.adminNotes || "");
      setActivateGrantFoundersOffer(false);
    } else if (modal === "grace") {
      setGraceDays(3);
    } else if (modal === "extraDays") {
      setExtraDaysCount(30);
    }
  }

  function closeModal() {
    setActiveModal(null);
    setSelectedSub(null);
  }

  function handleActivateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;

    const formData = new FormData();
    formData.append("shopId", selectedSub.shopId);
    formData.append("plan", "PROFESSIONAL");
    formData.append("billingInterval", activateInterval);
    formData.append("extraDays", String(activateExtraDays));
    formData.append("paymentMethod", activatePaymentMethod);
    formData.append("paymentReference", activatePaymentRef);
    formData.append("adminNotes", activateNotes);
    formData.append("grantFoundersOffer", String(activateGrantFoundersOffer));


    startTransition(async () => {
      const res = await adminActivateSubscriptionAction(formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `تم تفعيل اشتراك متجر "${selectedSub.shop.name}" بنجاح.`,
        });
        setTimeout(() => closeModal(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل تفعيل الاشتراك.",
        });
      }
    });
  }

  function handleGraceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;

    const formData = new FormData();
    formData.append("shopId", selectedSub.shopId);
    formData.append("days", String(graceDays));

    startTransition(async () => {
      const res = await adminStartGracePeriodAction(formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `تم بدء مهلة تجديد لمدة ${graceDays} أيام لمتجر "${selectedSub.shop.name}".`,
        });
        setTimeout(() => closeModal(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل بدء مهلة التجديد.",
        });
      }
    });
  }

  function handleExtraDaysSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;

    const formData = new FormData();
    formData.append("shopId", selectedSub.shopId);
    formData.append("extraDays", String(extraDaysCount));

    startTransition(async () => {
      const res = await adminGrantExtraDaysAction(formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `تمت إضافة ${extraDaysCount} يوم لاشتراك متجر "${selectedSub.shop.name}".`,
        });
        setTimeout(() => closeModal(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل إضافة الأيام.",
        });
      }
    });
  }

  function handleExpireSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;

    const formData = new FormData();
    formData.append("shopId", selectedSub.shopId);

    startTransition(async () => {
      const res = await adminMarkSubscriptionExpiredAction(formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `تم إنهاء اشتراك متجر "${selectedSub.shop.name}" بنجاح.`,
        });
        setTimeout(() => closeModal(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل إنهاء الاشتراك.",
        });
      }
    });
  }

  function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSub) return;

    const formData = new FormData();
    formData.append("shopId", selectedSub.shopId);

    startTransition(async () => {
      const res = await adminCancelSubscriptionAction(formData);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `تم إلغاء اشتراك متجر "${selectedSub.shop.name}".`,
        });
        setTimeout(() => closeModal(), 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل إلغاء الاشتراك.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث باسم المتجر أو رمز الدولة..."
            className="w-full rounded-xl bg-slate-950/80 border border-slate-800 pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2.5 text-xs text-slate-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="all">جميع الحالات ({initialSubscriptions.length})</option>
            <option value="ACTIVE">مفعل (ACTIVE)</option>
            <option value="TRIALING">فترة تجريبية (TRIALING)</option>
            <option value="GRACE_PERIOD">مهلة تجديد (GRACE_PERIOD)</option>
            <option value="EXPIRED">منتهي (EXPIRED)</option>
            <option value="CANCELED">ملغي (CANCELED)</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-extrabold">
              <th className="py-3.5 pr-4 pl-2">المتجر / الدولة</th>
              <th className="py-3.5 px-3">الخطة والحالة</th>
              <th className="py-3.5 px-3">المدة والتواريخ</th>
              <th className="py-3.5 px-3">بيانات الدفع والملاحظات</th>
              <th className="py-3.5 pl-4 pr-2 text-center">إجراءات Super Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 font-bold">
                  لا توجد متاجر مطابقة لبحثك.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const country = countryMap.get(sub.shop.countryCode);
                const statusMeta =
                  STATUS_BADGES[sub.effectiveStatus] || STATUS_BADGES.EXPIRED;

                return (
                  <tr
                    key={sub.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Shop and Country */}
                    <td className="py-4 pr-4 pl-2">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 font-bold border border-slate-700/60 text-sm">
                          {country?.flag || "🌐"}
                        </div>
                        <div>
                          <p className="font-black text-white text-sm">
                            {sub.shop.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                            {country?.name || sub.shop.countryCode} ({sub.shop.countryCode})
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Plan & Status */}
                    <td className="py-4 px-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            {statusMeta.label}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-teal-500/20 text-teal-300">
                            الخطة الشاملة
                          </span>
                          {sub.foundersOfferEligible && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              ✨ مشترك مبكر (%{sub.foundersOfferAnnualDiscountPercent ?? 0})
                            </span>
                          )}
                          {sub.plan === "BASIC" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Legacy record
                            </span>
                          )}

                        </div>
                        {sub.billingInterval && (
                          <p className="text-[10px] text-slate-400 font-numeric">
                            دورة الفوترة: {INTERVAL_LABELS[sub.billingInterval]}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Dates & Periods */}
                    <td className="py-4 px-3">
                      <div className="space-y-1 text-[11px] text-slate-300 font-numeric">
                        {sub.effectiveStatus === "TRIALING" && (
                          <div>
                            <span className="text-slate-500">نهاية التجربة: </span>
                            <span className="font-bold text-cyan-400">
                              {formatDate(sub.trialEndsAt)}
                            </span>
                          </div>
                        )}

                        {sub.currentPeriodStartedAt && sub.currentPeriodEndsAt && (
                          <div>
                            <span className="text-slate-500">الفترة المدفوعة: </span>
                            <span className="font-bold text-slate-200">
                              {formatDate(sub.currentPeriodStartedAt)} ←{" "}
                              {formatDate(sub.currentPeriodEndsAt)}
                            </span>
                          </div>
                        )}

                        {sub.effectiveStatus === "GRACE_PERIOD" && sub.gracePeriodEndsAt && (
                          <div>
                            <span className="text-slate-500">نهاية المهلة: </span>
                            <span className="font-bold text-amber-400">
                              {formatDate(sub.gracePeriodEndsAt)}
                            </span>
                          </div>
                        )}

                        {sub.activatedAt && (
                          <div className="text-[10px] text-slate-500">
                            تاريخ التفعيل: {formatDate(sub.activatedAt)}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Payment Metadata & Notes */}
                    <td className="py-4 px-3">
                      <div className="space-y-1 text-[11px]">
                        {sub.paymentMethod && (
                          <div className="flex items-center gap-1 text-slate-300">
                            <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                            <span>{sub.paymentMethod}</span>
                          </div>
                        )}
                        {sub.paymentReference && (
                          <div className="text-[10px] text-slate-400 font-numeric">
                            المرجع: {sub.paymentReference}
                          </div>
                        )}
                        {sub.adminNotes && (
                          <div className="text-[10px] text-slate-400 line-clamp-2 max-w-xs bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                            {sub.adminNotes}
                          </div>
                        )}
                        {!sub.paymentMethod && !sub.paymentReference && !sub.adminNotes && (
                          <span className="text-slate-600 text-[10px]">لا توجد ملاحظات</span>
                        )}
                      </div>
                    </td>

                    {/* Admin Action Buttons */}
                    <td className="py-4 pl-4 pr-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => openModal("activate", sub)}
                          className="h-7 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-black"
                        >
                          <Sparkles className="h-3 w-3 ml-1" />
                          تفعيل / ترقية
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal("grace", sub)}
                          className="h-7 px-2 rounded-lg border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-[10px] font-bold"
                        >
                          <Clock className="h-3 w-3 ml-1" />
                          بدء مهلة
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal("extraDays", sub)}
                          className="h-7 px-2 rounded-lg border-slate-700 text-slate-300 hover:bg-slate-800 text-[10px] font-bold"
                        >
                          <PlusCircle className="h-3 w-3 ml-1" />
                          إضافة أيام
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openModal("expire", sub)}
                          className="h-7 px-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-[10px] font-bold"
                          title="إنهاء الاشتراك"
                        >
                          إنهاء
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openModal("cancel", sub)}
                          className="h-7 px-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 text-[10px] font-bold"
                          title="إلغاء الاشتراك"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Dialogs */}
      {activeModal && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  {activeModal === "activate" && "تفعيل أو ترقية اشتراك"}
                  {activeModal === "grace" && "بدء مهلة تجديد (Grace Period)"}
                  {activeModal === "extraDays" && "إضافة أيام مدفوعة يدوياً"}
                  {activeModal === "expire" && "تأكيد إنهاء الاشتراك"}
                  {activeModal === "cancel" && "تأكيد إلغاء الاشتراك"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-bold">
                  متجر: {selectedSub.shop.name} ({selectedSub.shop.countryCode})
                </p>
              </div>
              <button
                onClick={closeModal}
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

            {/* Modal 1: Activate Form */}
            {activeModal === "activate" && (
              <form onSubmit={handleActivateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      الخطة
                    </label>
                    <div className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-teal-400 font-black flex items-center justify-between">
                      <span>الخطة الشاملة</span>
                      <span className="text-[10px] text-teal-500/80 font-mono font-normal">PROFESSIONAL</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      دورة الاشتراك
                    </label>
                    <select
                      value={activateInterval}
                      onChange={(e) =>
                        setActivateInterval(
                          e.target.value as SubscriptionBillingInterval
                        )
                      }
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                    >
                      <option value="ANNUAL">سنة واحدة (12 شهر)</option>
                      <option value="SIX_MONTHS">6 أشهر</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    أيام إضافية مجانية (اختياري)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={activateExtraDays}
                    onChange={(e) =>
                      setActivateExtraDays(Number(e.target.value) || 0)
                    }
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      وسيلة الدفع
                    </label>
                    <input
                      type="text"
                      value={activatePaymentMethod}
                      onChange={(e) => setActivatePaymentMethod(e.target.value)}
                      placeholder="مثال: تحويل بنكي الراجحي"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      رقم العملية / المرجع
                    </label>
                    <input
                      type="text"
                      value={activatePaymentRef}
                      onChange={(e) => setActivatePaymentRef(e.target.value)}
                      placeholder="TRX-12345"
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Founders Offer Grant / Frozen Status */}
                {selectedSub?.foundersOfferEligible ? (
                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-xs font-black text-amber-300">
                        عرض المشتركين الأوائل مثبت لهذا المتجر
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-amber-200">
                      <span className="bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/20">
                        خصم 6 أشهر: %{selectedSub.foundersOfferSixMonthsDiscountPercent ?? 0}
                      </span>
                      <span className="bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/20">
                        خصم السنة: %{selectedSub.foundersOfferAnnualDiscountPercent ?? 0}
                      </span>
                      {selectedSub.foundersOfferGrantedAt && (
                        <span className="text-slate-400 font-normal">
                          منذ: {formatDate(selectedSub.foundersOfferGrantedAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      الخصم المثبت سيبقى محفوظاً تلقائياً لهذا المتجر عند التجديد.
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activateGrantFoundersOffer}
                        onChange={(e) =>
                          setActivateGrantFoundersOffer(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30"
                      />
                      <span className="text-xs font-black text-amber-300">
                        منح عرض المشتركين الأوائل لهذا المتجر
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 pr-6">
                      سيتم تثبيت نسب الخصم الحالية لهذا المتجر عند التفعيل ولن تتغير بتغيير العرض العام لاحقاً.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    ملاحظات الإدارة
                  </label>

                  <textarea
                    value={activateNotes}
                    onChange={(e) => setActivateNotes(e.target.value)}
                    rows={2}
                    placeholder="ملاحظات سرية للإدارة حول التفعيل..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 ml-1" />
                    )}
                    تأكيد التفعيل
                  </Button>
                </div>
              </form>
            )}

            {/* Modal 2: Grace Period Form */}
            {activeModal === "grace" && (
              <form onSubmit={handleGraceSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عدد أيام مهلة التجديد (Default = 3)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={graceDays}
                    onChange={(e) => setGraceDays(Number(e.target.value) || 3)}
                    required
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    خلال هذه المهلة يبقى المتجر قادراً على العمل، وتظهر له رسالة توجيهية لتجديد الاشتراك.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <Clock className="h-4 w-4 ml-1" />
                    )}
                    بدء المهلة
                  </Button>
                </div>
              </form>
            )}

            {/* Modal 3: Extra Days Form */}
            {activeModal === "extraDays" && (
              <form onSubmit={handleExtraDaysSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عدد الأيام الإضافية المراد منحها
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={extraDaysCount}
                    onChange={(e) =>
                      setExtraDaysCount(Number(e.target.value) || 1)
                    }
                    required
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    تتم إضافة هذه الأيام إلى نهاية الفترة المدفوعة الحالية دون المساس بسجل التجربة.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <PlusCircle className="h-4 w-4 ml-1" />
                    )}
                    إضافة الأيام
                  </Button>
                </div>
              </form>
            )}

            {/* Modal 4: Expire Confirmation */}
            {activeModal === "expire" && (
              <form onSubmit={handleExpireSubmit} className="space-y-4">
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-black text-rose-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>تحذير إنهاء الاشتراك</span>
                  </div>
                  <p>
                    سيتم تعيين حالة الاشتراك إلى <strong>منتهي (EXPIRED)</strong> فورياً.
                    سيفقد المتجر إمكانية إنشاء تذاكر جديدة أو إضافة موظفين حتى يتم التجديد.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    تراجع
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <Ban className="h-4 w-4 ml-1" />
                    )}
                    تأكيد إنهاء الاشتراك
                  </Button>
                </div>
              </form>
            )}

            {/* Modal 5: Cancel Confirmation */}
            {activeModal === "cancel" && (
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs leading-relaxed space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>تحذير إلغاء الاشتراك</span>
                  </div>
                  <p>
                    سيتم تعيين حالة الاشتراك إلى <strong>ملغي (CANCELED)</strong> وتسجيل تاريخ الإلغاء.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    تراجع
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    ) : (
                      <Ban className="h-4 w-4 ml-1" />
                    )}
                    تأكيد إلغاء الاشتراك
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
