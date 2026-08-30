"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubscriptionBillingInterval } from "@prisma/client";
import {
  adminApprovePartnerActivationRequestAction,
  adminCreatePartnerActivationRequestAction,
  adminRejectPartnerActivationRequestAction,
} from "./partner-actions";

export interface ActivationCandidateData {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  discountPercent: number;
  shopId: string;
  shopName: string;
  countryCode: string;
}

export interface ActivationRequestData {
  id: string;
  partnerId: string;
  partnerName?: string;
  partnerCode?: string;
  shopId: string;
  shopName?: string;
  billingInterval: SubscriptionBillingInterval;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  priceSourceCountryCode: string;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  payableAmount: number;
  currencyCode: string;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  canceledAt: string | null;
  paymentReference: string | null;
  paymentMethod: string | null;
  adminNotes: string | null;
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

export function AdminPartnerActivationRequests({
  initialCandidates,
  initialRequests,
}: {
  initialCandidates: ActivationCandidateData[];
  initialRequests: ActivationRequestData[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState(initialCandidates[0]?.shopId ?? "");

  const selectedCandidate = useMemo(
    () => initialCandidates.find((item) => item.shopId === selectedShopId) ?? null,
    [initialCandidates, selectedShopId],
  );

  const pendingRequests = initialRequests.filter((request) => request.status === "PENDING");

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setMessage(result.error ?? "تعذر تنفيذ العملية.");
        return;
      }
      setMessage("تم تنفيذ العملية بنجاح.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950/40 p-5 shadow-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">طلبات تفعيل الوكلاء</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            السعر هنا هو المبلغ المستحق لمسار فقط. سعر بيع الوكيل لعميله لا يدخل في النظام.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black text-amber-300">
          {pendingRequests.length} طلب بانتظار القرار
        </span>
      </div>

      {message ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 lg:grid-cols-[1fr_180px_auto] lg:items-end">
        <label className="grid gap-2 text-xs font-black text-slate-300">
          <span>المتجر والوكيل</span>
          <select
            value={selectedShopId}
            onChange={(event) => setSelectedShopId(event.target.value)}
            className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white"
          >
            {initialCandidates.length === 0 ? (
              <option value="">لا توجد متاجر مرتبطة بوكلاء نشطين</option>
            ) : null}
            {initialCandidates.map((candidate) => (
              <option key={candidate.shopId} value={candidate.shopId}>
                {candidate.shopName} — {candidate.partnerName} ({candidate.discountPercent}%)
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-xs font-black text-slate-300">
          <span>مدة الاشتراك</span>
          <select id="partner-activation-interval" className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-white">
            <option value={SubscriptionBillingInterval.SIX_MONTHS}>6 أشهر</option>
            <option value={SubscriptionBillingInterval.ANNUAL}>سنة</option>
          </select>
        </label>

        <button
          type="button"
          disabled={!selectedCandidate || isPending}
          onClick={() => {
            if (!selectedCandidate) return;
            const intervalElement = document.getElementById("partner-activation-interval") as HTMLSelectElement | null;
            const formData = new FormData();
            formData.set("partnerId", selectedCandidate.partnerId);
            formData.set("shopId", selectedCandidate.shopId);
            formData.set("billingInterval", intervalElement?.value ?? SubscriptionBillingInterval.SIX_MONTHS);
            run(() => adminCreatePartnerActivationRequestAction(formData));
          }}
          className="h-11 rounded-xl bg-teal-600 px-5 text-xs font-black text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          إنشاء طلب وحفظ السعر
        </button>
      </div>

      <div className="space-y-3">
        {initialRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-xs font-bold text-slate-500">
            لا توجد طلبات تفعيل للوكلاء حتى الآن.
          </div>
        ) : (
          initialRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-white">{request.shopName ?? request.shopId}</span>
                    <span className="text-xs font-bold text-slate-400">عبر {request.partnerName ?? request.partnerCode ?? request.partnerId}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${request.status === "PENDING" ? "bg-amber-500/10 text-amber-300" : request.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-x-6 gap-y-1 text-xs font-semibold text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                    <span>المدة: {request.billingInterval === SubscriptionBillingInterval.ANNUAL ? "سنة" : "6 أشهر"}</span>
                    <span>السعر الرسمي: {formatAmount(request.baseAmount, request.currencyCode)}</span>
                    <span>خصم الوكيل: {request.discountPercent}%</span>
                    <span className="font-black text-teal-300">المطلوب لمسار: {formatAmount(request.payableAmount, request.currencyCode)}</span>
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-slate-500">
                    Snapshot محفوظ من تسعير {request.priceSourceCountryCode} — {new Date(request.requestedAt).toLocaleString("ar")}
                  </div>
                </div>

                {request.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("requestId", request.id);
                        formData.set("paymentMethod", "PARTNER_SETTLEMENT");
                        run(() => adminApprovePartnerActivationRequestAction(formData));
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      استلمت المبلغ — اعتماد وتفعيل
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("requestId", request.id);
                        run(() => adminRejectPartnerActivationRequestAction(formData));
                      }}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      رفض الطلب
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
