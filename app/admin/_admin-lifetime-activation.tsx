"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Crown,
  Loader2,
  Search,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LIFETIME_MAINTENANCE_GRACE_DAYS,
  resolveLifetimeMaintenancePolicy,
  type LifetimeMaintenancePolicyStatus,
} from "@/lib/subscription/lifetime-maintenance-policy";
import { adminActivateLifetimeSubscriptionAction } from "./lifetime-activation-actions";
import { adminRecordLifetimeMaintenancePaymentAction } from "./lifetime-maintenance-actions";

export type LifetimeAdminShop = { id: string; name: string; countryCode: string };
export type LifetimeMaintenanceStatus = "LEGACY" | "FREE_FIRST_YEAR" | "PAID" | "DUE_SOON" | "OVERDUE";
export type LifetimeAdminRecord = {
  id: string;
  shopId: string;
  shopName: string;
  countryCode: string;
  activatedAt: string;
  pricePaid: number | null;
  currencyCode: string | null;
  annualMaintenanceAmount: number | null;
  maintenanceCurrencyCode: string | null;
  maintenanceStartsAt: string | null;
  maintenancePaidThrough: string | null;
  maintenancePaymentCount: number;
  lastMaintenancePaidAt: string | null;
  maintenanceStatus: LifetimeMaintenanceStatus;
  nextMaintenanceDueAt: string | null;
  maintenanceDaysUntilDue: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  isActive: boolean;
};

const statusMeta: Record<LifetimeMaintenancePolicyStatus, { label: string; className: string }> = {
  LEGACY: { label: "شروط قديمة", className: "bg-slate-800 text-slate-400" },
  FREE_FIRST_YEAR: { label: "السنة الأولى مجانية", className: "bg-cyan-500/10 text-cyan-300" },
  PAID: { label: "مدفوع", className: "bg-emerald-500/10 text-emerald-300" },
  DUE_SOON: { label: "يستحق قريباً", className: "bg-amber-500/10 text-amber-300" },
  GRACE_PERIOD: { label: "ضمن مهلة 30 يوم", className: "bg-orange-500/10 text-orange-300" },
  EXPIRED: { label: "الصيانة غير مجددة", className: "bg-rose-500/10 text-rose-300" },
};

function maintenancePolicyFor(row: LifetimeAdminRecord) {
  return resolveLifetimeMaintenancePolicy({
    status: row.maintenanceStatus,
    nextDueAt: row.nextMaintenanceDueAt ? new Date(row.nextMaintenanceDueAt) : null,
    daysUntilDue: row.maintenanceDaysUntilDue,
  });
}

export function AdminLifetimeActivation({ shops, initialLifetime }: { shops: LifetimeAdminShop[]; initialLifetime: LifetimeAdminRecord[] }) {
  const router = useRouter();
  const [selectedShopId, setSelectedShopId] = useState("");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const [maintenanceShopId, setMaintenanceShopId] = useState("");
  const [maintenanceMethod, setMaintenanceMethod] = useState("");
  const [maintenanceReference, setMaintenanceReference] = useState("");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [maintenanceFeedback, setMaintenanceFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [maintenancePending, startMaintenanceTransition] = useTransition();

  const filteredShops = useMemo(() => {
    const term = search.trim().toLowerCase();
    return shops.filter((shop) => !term || `${shop.name} ${shop.countryCode}`.toLowerCase().includes(term));
  }, [shops, search]);

  const maintenanceEligible = useMemo(
    () => initialLifetime.filter((row) => row.isActive && row.annualMaintenanceAmount != null && row.annualMaintenanceAmount > 0),
    [initialLifetime],
  );
  const selectedMaintenance = maintenanceEligible.find((row) => row.shopId === maintenanceShopId) ?? null;
  const selectedMaintenancePolicy = selectedMaintenance ? maintenancePolicyFor(selectedMaintenance) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedShopId) return setFeedback({ type: "error", text: "اختر المتجر أولاً." });
    const formData = new FormData();
    formData.set("shopId", selectedShopId);
    formData.set("paymentMethod", paymentMethod);
    formData.set("paymentReference", paymentReference);
    formData.set("adminNotes", adminNotes);
    startTransition(async () => {
      const res = await adminActivateLifetimeSubscriptionAction(formData);
      if (!res.success) return setFeedback({ type: "error", text: res.error || "تعذر التفعيل." });
      setFeedback({ type: "success", text: `تم تفعيل ترخيص مدى الحياة. السنة الأولى للصيانة والتحديثات مجانية، وبعد كل استحقاق توجد مهلة ${LIFETIME_MAINTENANCE_GRACE_DAYS} يوم.` });
      setPaymentMethod("");
      setPaymentReference("");
      setAdminNotes("");
      router.refresh();
    });
  }

  function submitMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!maintenanceShopId) return setMaintenanceFeedback({ type: "error", text: "اختر اشتراك مدى الحياة أولاً." });
    const formData = new FormData();
    formData.set("shopId", maintenanceShopId);
    formData.set("paymentMethod", maintenanceMethod);
    formData.set("paymentReference", maintenanceReference);
    formData.set("adminNotes", maintenanceNotes);
    startMaintenanceTransition(async () => {
      const res = await adminRecordLifetimeMaintenancePaymentAction(formData);
      if (!res.success) return setMaintenanceFeedback({ type: "error", text: res.error || "تعذر تسجيل الدفعة." });
      const end = res.payment ? new Date(res.payment.coverageEnd).toLocaleDateString("ar-SA") : "السنة التالية";
      setMaintenanceFeedback({ type: "success", text: `تم تسجيل الدفعة السنوية. التغطية مدفوعة حتى ${end}.` });
      setMaintenanceMethod("");
      setMaintenanceReference("");
      setMaintenanceNotes("");
      router.refresh();
    });
  }

  return <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-5 shadow-xl sm:p-6">
    <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950"><Crown className="h-5 w-5 fill-current" /></div><div><h2 className="text-base font-black text-white">إدارة اشتراكات مدى الحياة</h2><p className="mt-1 text-[11px] font-semibold text-slate-400">التفعيل يثبت سعر الترخيص والرسم السنوي وقت البيع. السنة الأولى مجانية، وبعد الاستحقاق مهلة {LIFETIME_MAINTENANCE_GRACE_DAYS} يوم. انتهاء المهلة لا يوقف الترخيص الأساسي.</p></div></div>
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black text-amber-300">{initialLifetime.filter((x)=>x.isActive).length} متجر Lifetime</span>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-amber-400" /><h3 className="text-xs font-black text-white">تفعيل ترخيص جديد</h3></div>
          <div><label className="mb-1.5 block text-xs font-black text-slate-300">بحث عن متجر</label><div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-500" /><input value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-9 pl-3 text-xs text-white" placeholder="اسم المتجر أو الدولة" /></div></div>
          <div><label className="mb-1.5 block text-xs font-black text-slate-300">المتجر</label><select required value={selectedShopId} onChange={(e)=>setSelectedShopId(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white"><option value="">اختر متجر...</option>{filteredShops.map((shop)=><option key={shop.id} value={shop.id}>{shop.name} — {shop.countryCode}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-[11px] font-bold text-slate-400">وسيلة الدفع</label><input value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="Vodafone Cash..." /></div><div><label className="mb-1 block text-[11px] font-bold text-slate-400">مرجع الدفع</label><input value={paymentReference} onChange={(e)=>setPaymentReference(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="اختياري" /></div></div>
          <div><label className="mb-1 block text-[11px] font-bold text-slate-400">ملاحظة إدارية</label><textarea rows={2} value={adminNotes} onChange={(e)=>setAdminNotes(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="اختياري" /></div>
          {feedback ? <Feedback data={feedback} /> : null}
          <Button type="submit" disabled={pending || !selectedShopId} className="h-11 w-full rounded-xl bg-amber-500 font-black text-slate-950 hover:bg-amber-400">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="ml-1.5 h-4 w-4" />}تفعيل مدى الحياة</Button>
        </form>

        <form onSubmit={submitMaintenance} className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4">
          <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-emerald-400" /><div><h3 className="text-xs font-black text-white">تسجيل دفعة الصيانة والتحديث السنوية</h3><p className="mt-0.5 text-[10px] font-semibold text-slate-500">كل دفعة تغطي سنة واحدة بالسعر المثبت عند شراء الخطة.</p></div></div>
          <div><label className="mb-1.5 block text-xs font-black text-slate-300">الاشتراك</label><select required value={maintenanceShopId} onChange={(e)=>setMaintenanceShopId(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white"><option value="">اختر متجر...</option>{maintenanceEligible.map((row)=><option key={row.shopId} value={row.shopId}>{row.shopName} — {row.annualMaintenanceAmount?.toLocaleString()} {row.maintenanceCurrencyCode || row.currencyCode || ""}</option>)}</select></div>
          {selectedMaintenance ? <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-[11px] font-bold text-slate-300"><div className="flex justify-between gap-3"><span>المبلغ الثابت</span><span className="font-numeric text-emerald-300">{selectedMaintenance.annualMaintenanceAmount?.toLocaleString()} {selectedMaintenance.maintenanceCurrencyCode || selectedMaintenance.currencyCode || ""}</span></div><div className="mt-1 flex justify-between gap-3"><span>الاستحقاق الحالي</span><span>{selectedMaintenance.nextMaintenanceDueAt ? new Date(selectedMaintenance.nextMaintenanceDueAt).toLocaleDateString("ar-SA") : "-"}</span></div>{selectedMaintenancePolicy?.status === "GRACE_PERIOD" ? <div className="mt-1 flex justify-between gap-3 text-orange-300"><span>المهلة</span><span>متبقي {selectedMaintenancePolicy.graceDaysRemaining ?? 0} يوم</span></div> : null}{selectedMaintenancePolicy?.status === "EXPIRED" ? <div className="mt-1 text-rose-300">انتهت مهلة الصيانة، لكن ترخيص مدى الحياة الأساسي ما زال فعالاً.</div> : null}</div> : null}
          <div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-[11px] font-bold text-slate-400">وسيلة الدفع</label><input value={maintenanceMethod} onChange={(e)=>setMaintenanceMethod(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="تحويل / كاش..." /></div><div><label className="mb-1 block text-[11px] font-bold text-slate-400">مرجع الدفع</label><input value={maintenanceReference} onChange={(e)=>setMaintenanceReference(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="اختياري" /></div></div>
          <div><label className="mb-1 block text-[11px] font-bold text-slate-400">ملاحظة</label><textarea rows={2} value={maintenanceNotes} onChange={(e)=>setMaintenanceNotes(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="اختياري" /></div>
          {maintenanceFeedback ? <Feedback data={maintenanceFeedback} /> : null}
          <Button type="submit" disabled={maintenancePending || !maintenanceShopId} className="h-11 w-full rounded-xl bg-emerald-600 font-black hover:bg-emerald-500">{maintenancePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-1.5 h-4 w-4" />}تسجيل الدفعة السنوية</Button>
        </form>
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h3 className="mb-3 text-xs font-black text-slate-300">الاشتراكات مدى الحياة المفعلة</h3>
        {initialLifetime.length === 0 ? <div className="py-10 text-center text-xs font-bold text-slate-600">لا توجد اشتراكات Lifetime مفعلة بعد.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead><tr className="border-b border-slate-800 text-slate-500"><th className="p-2">المتجر</th><th className="p-2">الترخيص</th><th className="p-2">الصيانة السنوية</th><th className="p-2">الاستحقاق</th><th className="p-2">الدفعات</th><th className="p-2">تاريخ التفعيل</th><th className="p-2">الحالة</th></tr></thead><tbody>{initialLifetime.map((row)=>{
          const policy = maintenancePolicyFor(row);
          const meta = statusMeta[policy.status];
          return <tr key={row.id} className="border-b border-slate-900"><td className="p-2"><div className="font-black text-white">{row.shopName}</div><div className="text-[10px] text-slate-500">{row.countryCode}</div></td><td className="p-2 font-numeric font-black text-amber-300">{row.pricePaid == null ? "-" : `${row.pricePaid.toLocaleString()} ${row.currencyCode || ""}`}</td><td className="p-2">{row.annualMaintenanceAmount == null ? <span className="text-slate-600">غير مطبق</span> : <><div className="font-numeric font-black text-emerald-300">{row.annualMaintenanceAmount.toLocaleString()} {row.maintenanceCurrencyCode || row.currencyCode || ""}</div><span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-black ${meta.className}`}>{meta.label}</span></>}</td><td className="p-2 text-slate-400">{row.nextMaintenanceDueAt ? <><div className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{new Date(row.nextMaintenanceDueAt).toLocaleDateString("ar-SA")}</div>{policy.status === "GRACE_PERIOD" ? <div className="mt-1 text-[9px] text-orange-400">ضمن المهلة — متبقي {policy.graceDaysRemaining ?? 0} يوم</div> : policy.status === "EXPIRED" ? <div className="mt-1 text-[9px] text-rose-400">انتهت المهلة — متأخر {policy.overdueDays} يوم</div> : row.maintenanceDaysUntilDue != null ? <div className="mt-1 text-[9px] text-slate-600">{row.maintenanceDaysUntilDue >= 0 ? `بعد ${row.maintenanceDaysUntilDue} يوم` : `متأخر ${Math.abs(row.maintenanceDaysUntilDue)} يوم`}</div> : null}</> : "-"}</td><td className="p-2 text-slate-400"><div>{row.maintenancePaymentCount} دفعة</div>{row.lastMaintenancePaidAt ? <div className="mt-1 text-[9px] text-slate-600">آخر دفع: {new Date(row.lastMaintenancePaidAt).toLocaleDateString("ar-SA")}</div> : null}</td><td className="p-2 text-slate-400">{new Date(row.activatedAt).toLocaleDateString("ar-SA")}</td><td className="p-2"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${row.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>{row.isActive ? "مدى الحياة" : "غير نشط"}</span></td></tr>;
        })}</tbody></table></div>}
      </div>
    </div>
  </section>;
}

function Feedback({ data }: { data: { type: "success" | "error"; text: string } }) {
  return <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${data.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300"}`}>{data.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span>{data.text}</span></div>;
}
