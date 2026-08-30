"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, LogOut, Store, WalletCards } from "lucide-react";
import { partnerLogoutAction, partnerRequestActivationAction } from "./actions";

type ShopItem = {
  shopId: string;
  shopName: string;
  countryCode: string;
  effectiveStatus: string;
  billingInterval: "SIX_MONTHS" | "ANNUAL" | null;
  trialEndsAt: string;
  currentPeriodEndsAt: string | null;
};

type RequestItem = {
  id: string;
  shopId: string;
  shopName: string;
  billingInterval: "SIX_MONTHS" | "ANNUAL";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  baseAmount: number;
  discountPercent: number;
  payableAmount: number;
  currencyCode: string;
  requestedAt: string;
};

function statusLabel(status: string) {
  if (status === "ACTIVE") return "نشط";
  if (status === "TRIALING") return "تجريبي";
  if (status === "GRACE_PERIOD") return "مهلة تجديد";
  if (status === "EXPIRED") return "منتهي";
  if (status === "CANCELED") return "ملغي";
  return status;
}

function requestStatusLabel(status: string) {
  if (status === "PENDING") return "بانتظار الموافقة";
  if (status === "APPROVED") return "تم التفعيل";
  if (status === "REJECTED") return "مرفوض";
  return "ملغي";
}

export function PartnerDashboard({
  partnerName,
  partnerCode,
  shops,
  requests,
}: {
  partnerName: string;
  partnerCode: string;
  shops: ShopItem[];
  requests: RequestItem[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [submittingShop, setSubmittingShop] = useState<string | null>(null);

  const pendingShopIds = new Set(requests.filter((r) => r.status === "PENDING").map((r) => r.shopId));
  const shopById = useMemo(() => new Map(shops.map((shop) => [shop.shopId, shop])), [shops]);

  async function requestActivation(shopId: string, billingInterval: "SIX_MONTHS" | "ANNUAL") {
    setMessage(null);
    setSubmittingShop(shopId);
    const form = new FormData();
    form.set("shopId", shopId);
    form.set("billingInterval", billingInterval);
    const result = await partnerRequestActivationAction(form);
    setSubmittingShop(null);
    setMessage(result.success ? "تم إرسال طلب التفعيل إلى إدارة مسار." : result.error || "تعذر إرسال الطلب.");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <div className="text-lg font-black">بوابة وكلاء مسار</div>
            <div className="mt-1 text-xs font-bold text-slate-400">{partnerName} · {partnerCode}</div>
          </div>
          <form action={partnerLogoutAction}>
            <button className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800">
              <LogOut className="h-4 w-4" /> خروج
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-8">
        {message ? <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 p-3 text-xs font-bold text-teal-200">{message}</div> : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <Store className="h-5 w-5 text-teal-400" />
            <div className="mt-3 text-2xl font-black">{shops.length}</div>
            <div className="text-xs font-bold text-slate-400">العملاء المرتبطون بك</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <Clock3 className="h-5 w-5 text-amber-400" />
            <div className="mt-3 text-2xl font-black">{requests.filter((r) => r.status === "PENDING").length}</div>
            <div className="text-xs font-bold text-slate-400">طلبات بانتظار الموافقة</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div className="mt-3 text-2xl font-black">{requests.filter((r) => r.status === "APPROVED").length}</div>
            <div className="text-xs font-bold text-slate-400">طلبات تم تفعيلها</div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-black">عملائي</h2>
          {shops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-sm font-bold text-slate-500">لا يوجد متاجر مرتبطة بحسابك حتى الآن.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {shops.map((shop) => {
                const hasPending = pendingShopIds.has(shop.shopId);
                return (
                  <div key={shop.shopId} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black">{shop.shopName}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">{shop.countryCode}</div>
                      </div>
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-black text-slate-300">{statusLabel(shop.effectiveStatus)}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <CalendarDays className="h-4 w-4" />
                      {shop.currentPeriodEndsAt ? `ينتهي الاشتراك ${new Date(shop.currentPeriodEndsAt).toLocaleDateString("ar")}` : `تنتهي التجربة ${new Date(shop.trialEndsAt).toLocaleDateString("ar")}`}
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button disabled={hasPending || submittingShop === shop.shopId} onClick={() => requestActivation(shop.shopId, "SIX_MONTHS")} className="flex-1 rounded-xl bg-teal-500 px-3 py-2.5 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">طلب 6 أشهر</button>
                      <button disabled={hasPending || submittingShop === shop.shopId} onClick={() => requestActivation(shop.shopId, "ANNUAL")} className="flex-1 rounded-xl border border-teal-500/40 px-3 py-2.5 text-xs font-black text-teal-300 disabled:cursor-not-allowed disabled:opacity-40">طلب سنة</button>
                    </div>
                    {hasPending ? <div className="mt-2 text-[11px] font-bold text-amber-400">يوجد طلب تفعيل قيد المراجعة لهذا العميل.</div> : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black"><WalletCards className="h-5 w-5 text-teal-400" /> طلبات التفعيل</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-right text-xs">
                <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">العميل</th><th className="p-3">المدة</th><th className="p-3">المطلوب لمسار</th><th className="p-3">خصمك</th><th className="p-3">الحالة</th><th className="p-3">ينتهي الاشتراك</th><th className="p-3">التاريخ</th></tr></thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  {requests.map((request) => {
                    const shop = shopById.get(request.shopId);
                    const subscriptionEndsAt = request.status === "APPROVED" ? shop?.currentPeriodEndsAt ?? null : null;
                    return (
                      <tr key={request.id}>
                        <td className="p-3 font-black">{request.shopName}</td>
                        <td className="p-3">{request.billingInterval === "ANNUAL" ? "سنة" : "6 أشهر"}</td>
                        <td className="p-3 font-black text-teal-300">{request.payableAmount.toFixed(2)} {request.currencyCode}</td>
                        <td className="p-3">{request.discountPercent}%</td>
                        <td className="p-3">{requestStatusLabel(request.status)}</td>
                        <td className="p-3 font-bold text-slate-300">{subscriptionEndsAt ? new Date(subscriptionEndsAt).toLocaleDateString("ar") : "—"}</td>
                        <td className="p-3 text-slate-500">{new Date(request.requestedAt).toLocaleDateString("ar")}</td>
                      </tr>
                    );
                  })}
                  {requests.length === 0 ? <tr><td colSpan={7} className="p-6 text-center font-bold text-slate-600">لا توجد طلبات تفعيل حتى الآن.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
