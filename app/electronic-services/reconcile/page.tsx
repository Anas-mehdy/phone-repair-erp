import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Scale, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { electronicServiceProviderService } from "@/lib/services/electronicServiceProviderService";
import { electronicServiceReconciliationService } from "@/lib/services/electronicServiceReconciliationService";
import { reconcileElectronicServiceProviderAction } from "./actions";

export const dynamic = "force-dynamic";
type SearchParams = { provider?: string; saved?: string; difference?: string; error?: string };
const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-teal-700 dark:focus:ring-teal-950/50";
const reasonLabels: Record<string, string> = {
  UNRECORDED_TRANSACTION: "عملية غير مسجلة",
  PROVIDER_FEE: "رسوم أو عمولة من المزود",
  OPERATOR_ERROR: "خطأ إدخال أو تشغيل",
  ROUNDING: "فرق تقريب",
  OTHER: "سبب آخر",
};

export default async function ElectronicServiceReconcilePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const [overview, reconciliations] = await Promise.all([
    electronicServiceProviderService.getOverview(context.shopId),
    electronicServiceReconciliationService.listReconciliations(context.shopId, undefined, 100),
  ]);
  const canManage = context.permissions.includes("sales:create");
  const selectedId = query.provider && overview.providers.some((p) => p.id === query.provider) ? query.provider : overview.providers[0]?.id ?? "";

  return <div className="space-y-6 pb-8">
    <section className="relative overflow-hidden rounded-[28px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-teal-50/70 px-5 py-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20 sm:px-6">
      <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-600 text-white"><Scale className="h-6 w-6" /></span><div><p className="text-[10px] font-black text-cyan-700 dark:text-cyan-300">جرد ومطابقة</p><h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">مطابقة أرصدة مزودي الخدمات</h1><p className="mt-1.5 max-w-3xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">قارن الرصيد الذي يظهر داخل تطبيق أو ماكينة المزود مع الرصيد المحسوب في مسار. أي فرق يُسجل كتسوية مدققة مع السبب والموظف والرصيد قبل وبعد.</p></div></div>
    </section>

    {query.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">{query.error}</div> : null}
    {query.saved ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="ml-1 inline h-4 w-4" />تمت المطابقة وتحديث رصيد المزود وتسجيل فرق التسوية.</div> : null}

    <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="h-fit rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:sticky xl:top-24">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">مطابقة جديدة</h2><p className="mt-0.5 text-[10px] font-semibold text-slate-400">أدخل الرقم الذي يظهر عند المزود فعليًا.</p></div></div>
        {overview.providers.length === 0 ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200">لا يوجد مزودون بعد.</div> : canManage ? <form action={reconcileElectronicServiceProviderAction} className="mt-5 space-y-3">
          <label className="block"><span className="mb-1.5 block text-[10px] font-black text-slate-600 dark:text-slate-300">المزود *</span><select name="providerId" defaultValue={selectedId} className={inputClass} required>{overview.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} — مسار: {formatCurrency(provider.currentBalance, provider.currencyCode)}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black text-slate-600 dark:text-slate-300">الرصيد الفعلي عند المزود *</span><input name="actualBalance" type="number" min="0" step="0.01" className={inputClass} required placeholder="0.00" /></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black text-slate-600 dark:text-slate-300">سبب الفرق *</span><select name="reasonCode" className={inputClass} defaultValue="UNRECORDED_TRANSACTION"><option value="UNRECORDED_TRANSACTION">عملية غير مسجلة</option><option value="PROVIDER_FEE">رسوم أو عمولة من المزود</option><option value="OPERATOR_ERROR">خطأ إدخال أو تشغيل</option><option value="ROUNDING">فرق تقريب</option><option value="OTHER">سبب آخر</option></select></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black text-slate-600 dark:text-slate-300">ملاحظات</span><textarea name="notes" rows={3} maxLength={1000} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="اشرح سبب الفرق عند الحاجة" /></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black text-slate-600 dark:text-slate-300">مرجع اختياري</span><input name="reference" maxLength={160} className={inputClass} placeholder="رقم تقرير أو عملية عند المزود" /></label>
          <Button type="submit" className="h-11 w-full rounded-xl bg-gradient-to-l from-teal-600 to-cyan-600 text-xs font-black text-white">مطابقة واعتماد الرصيد الفعلي</Button>
          <p className="text-[9px] font-semibold leading-5 text-slate-400">إذا كان الرصيد مطابقًا تمامًا، لن ينشئ مسار تسوية غير ضرورية.</p>
        </form> : <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">حسابك للعرض فقط ولا يستطيع إجراء تسويات.</div>}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">سجل المطابقات</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">آخر {reconciliations.length} عملية جرد وتسوية.</p></div>
        {reconciliations.length === 0 ? <div className="py-14 text-center"><WalletCards className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-xs font-bold text-slate-400">لم يتم تسجيل أي مطابقة بعد.</p></div> : <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-right text-xs"><thead className="bg-slate-50 text-[10px] font-black text-slate-500 dark:bg-slate-900/70 dark:text-slate-400"><tr><th className="px-4 py-3">المزود</th><th className="px-4 py-3">رصيد مسار</th><th className="px-4 py-3">الرصيد الفعلي</th><th className="px-4 py-3">الفرق</th><th className="px-4 py-3">السبب</th><th className="px-4 py-3">الموظف</th><th className="px-4 py-3">المرجع</th><th className="px-4 py-3">التاريخ</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{reconciliations.map((row) => { const diff = Number(row.difference); return <tr key={row.id}><td className="px-4 py-3 font-black text-slate-800 dark:text-slate-200">{row.providerName}</td><td className="px-4 py-3 font-numeric font-bold">{formatCurrency(row.systemBalance, row.currencyCode)}</td><td className="px-4 py-3 font-numeric font-black text-teal-700 dark:text-teal-300">{formatCurrency(row.actualBalance, row.currencyCode)}</td><td className="px-4 py-3">{diff > 0 ? <span className="inline-flex items-center gap-1 font-numeric font-black text-emerald-700 dark:text-emerald-300"><ArrowDownLeft className="h-3.5 w-3.5" />+{formatCurrency(diff, row.currencyCode)}</span> : <span className="inline-flex items-center gap-1 font-numeric font-black text-rose-700 dark:text-rose-300"><ArrowUpRight className="h-3.5 w-3.5" />{formatCurrency(diff, row.currencyCode)}</span>}</td><td className="px-4 py-3"><div className="font-bold text-slate-600 dark:text-slate-300">{reasonLabels[row.reasonCode] || row.reasonCode}</div>{row.notes ? <div className="mt-1 max-w-[220px] truncate text-[9px] font-semibold text-slate-400" title={row.notes}>{row.notes}</div> : null}</td><td className="px-4 py-3 text-[10px] font-bold text-slate-500">{row.createdByName || "—"}</td><td className="px-4 py-3 font-numeric text-[9px] font-semibold text-slate-400">{row.reference || "—"}</td><td className="px-4 py-3 font-numeric text-[10px] font-semibold text-slate-500">{formatDateTime(row.createdAt)}</td></tr>; })}</tbody></table></div>}
      </div>
    </section>
  </div>;
}
