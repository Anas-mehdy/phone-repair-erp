"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, CheckCircle2, AlertCircle, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminActivateLifetimeSubscriptionAction } from "./lifetime-activation-actions";

export type LifetimeAdminShop = { id: string; name: string; countryCode: string };
export type LifetimeAdminRecord = {
  id: string;
  shopId: string;
  shopName: string;
  countryCode: string;
  activatedAt: string;
  pricePaid: number | null;
  currencyCode: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  isActive: boolean;
};

export function AdminLifetimeActivation({ shops, initialLifetime }: { shops: LifetimeAdminShop[]; initialLifetime: LifetimeAdminRecord[] }) {
  const router = useRouter();
  const [selectedShopId, setSelectedShopId] = useState("");
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredShops = useMemo(() => {
    const term = search.trim().toLowerCase();
    return shops.filter((shop) => !term || `${shop.name} ${shop.countryCode}`.toLowerCase().includes(term));
  }, [shops, search]);

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
      setFeedback({ type: "success", text: "تم تفعيل اشتراك مدى الحياة بنجاح بدون تاريخ انتهاء." });
      setPaymentMethod(""); setPaymentReference(""); setAdminNotes("");
      router.refresh();
    });
  }

  return <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-5 sm:p-6 shadow-xl">
    <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-slate-950"><Crown className="h-5 w-5 fill-current" /></div><div><h2 className="text-base font-black text-white">تفعيل اشتراك مدى الحياة</h2><p className="mt-1 text-[11px] font-semibold text-slate-400">التفعيل لا يغير العداد يدوياً. السعر يؤخذ من سعر Lifetime المحدد لدولة المتجر.</p></div></div>
      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black text-amber-300">{initialLifetime.filter((x)=>x.isActive).length} متجر Lifetime</span>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div><label className="mb-1.5 block text-xs font-black text-slate-300">بحث عن متجر</label><div className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-500" /><input value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pr-9 pl-3 text-xs text-white" placeholder="اسم المتجر أو الدولة" /></div></div>
        <div><label className="mb-1.5 block text-xs font-black text-slate-300">المتجر</label><select required value={selectedShopId} onChange={(e)=>setSelectedShopId(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white"><option value="">اختر متجر...</option>{filteredShops.map((shop)=><option key={shop.id} value={shop.id}>{shop.name} — {shop.countryCode}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-[11px] font-bold text-slate-400">وسيلة الدفع</label><input value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="Vodafone Cash..." /></div><div><label className="mb-1 block text-[11px] font-bold text-slate-400">مرجع الدفع</label><input value={paymentReference} onChange={(e)=>setPaymentReference(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="اختياري" /></div></div>
        <div><label className="mb-1 block text-[11px] font-bold text-slate-400">ملاحظة إدارية</label><textarea rows={2} value={adminNotes} onChange={(e)=>setAdminNotes(e.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white" placeholder="اختياري" /></div>
        {feedback ? <div className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${feedback.type === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300"}`}>{feedback.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}<span>{feedback.text}</span></div> : null}
        <Button type="submit" disabled={pending || !selectedShopId} className="h-11 w-full rounded-xl bg-amber-500 font-black text-slate-950 hover:bg-amber-400">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="ml-1.5 h-4 w-4" />}تفعيل مدى الحياة</Button>
      </form>

      <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"><h3 className="mb-3 text-xs font-black text-slate-300">الاشتراكات مدى الحياة المفعلة</h3>{initialLifetime.length === 0 ? <div className="py-10 text-center text-xs font-bold text-slate-600">لا توجد اشتراكات Lifetime مفعلة بعد.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-right text-xs"><thead><tr className="border-b border-slate-800 text-slate-500"><th className="p-2">المتجر</th><th className="p-2">السعر المثبت</th><th className="p-2">تاريخ التفعيل</th><th className="p-2">الدفع</th><th className="p-2">الحالة</th></tr></thead><tbody>{initialLifetime.map((row)=><tr key={row.id} className="border-b border-slate-900"><td className="p-2"><div className="font-black text-white">{row.shopName}</div><div className="text-[10px] text-slate-500">{row.countryCode}</div></td><td className="p-2 font-numeric font-black text-amber-300">{row.pricePaid == null ? "-" : `${row.pricePaid.toLocaleString()} ${row.currencyCode || ""}`}</td><td className="p-2 text-slate-400">{new Date(row.activatedAt).toLocaleDateString("ar-SA")}</td><td className="p-2 text-slate-400">{row.paymentMethod || "-"}<div className="text-[9px] text-slate-600">{row.paymentReference || ""}</div></td><td className="p-2"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${row.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>{row.isActive ? "مدى الحياة" : "غير نشط"}</span></td></tr>)}</tbody></table></div>}</div>
    </div>
  </section>;
}
