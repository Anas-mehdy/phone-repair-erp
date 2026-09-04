import { BarChart3, CalendarDays, CircleDollarSign, Clock3, Scale, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { formatCurrency } from "@/lib/format";
import { electronicServiceReportService } from "@/lib/services/electronicServiceReportService";
import { timeZoneForCountry } from "@/lib/shop-timezone";

export const dynamic = "force-dynamic";
type SearchParams = { from?: string; to?: string; provider?: string };

function localDateString(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function paymentLabel(value: string) {
  if (value === "DRAWER") return "الدرج النقدي";
  if (value === "WALLET") return "محفظة";
  if (value === "DEBT") return "على الدين";
  return "مصدر آخر";
}

export default async function ElectronicServiceReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const timeZone = timeZoneForCountry(context.countryCode);
  const today = localDateString(timeZone);
  const defaultFrom = `${today.slice(0, 8)}01`;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from || "") ? query.from! : defaultFrom;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to || "") ? query.to! : today;
  const providerId = query.provider && /^[0-9a-f-]{36}$/i.test(query.provider) ? query.provider : undefined;
  const report = await electronicServiceReportService.getElectronicServiceReport(context.shopId, { from, to, providerId, timeZone });
  const currency = context.currency;

  return <div className="space-y-6 pb-8">
    <section className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50/70 px-5 py-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/25 sm:px-6"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white"><BarChart3 className="h-6 w-6" /></span><div><p className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">تقارير الخدمات الإلكترونية</p><h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">الأداء والأرباح والأرصدة</h1><p className="mt-1.5 max-w-3xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">حلّل العمليات حسب الفترة والمزود والخدمة، واعرف التكلفة الفعلية والربح والتحصيل والبيع الآجل وفروقات الجرد.</p></div></div></section>

    <form className="grid gap-3 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end"><label className="grid gap-1.5 text-[10px] font-black text-slate-600 dark:text-slate-300">من<input type="date" name="from" defaultValue={from} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900" /></label><label className="grid gap-1.5 text-[10px] font-black text-slate-600 dark:text-slate-300">إلى<input type="date" name="to" defaultValue={to} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900" /></label><label className="grid gap-1.5 text-[10px] font-black text-slate-600 dark:text-slate-300">المزود<select name="provider" defaultValue={providerId || ""} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"><option value="">كل المزودين</option>{report.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><Button type="submit" className="h-10 rounded-xl px-5 text-xs font-black"><CalendarDays className="ml-1.5 h-4 w-4" />تطبيق</Button></form>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Stat title="العمليات" value={String(report.totals.operationCount)} icon={Clock3} /><Stat title="تكلفة المزودين" value={formatCurrency(report.totals.providerCost, currency)} icon={WalletCards} /><Stat title="على العملاء" value={formatCurrency(report.totals.customerCharge, currency)} icon={CircleDollarSign} /><Stat title="المحصّل" value={formatCurrency(report.totals.collected, currency)} icon={Sparkles} /><Stat title="الآجل" value={formatCurrency(report.totals.deferred, currency)} icon={Clock3} /><Stat title="صافي الربح" value={formatCurrency(report.totals.profit, currency)} icon={Sparkles} /></section>

    <section className="grid gap-5 xl:grid-cols-2">
      <ReportTable title="الأداء حسب المزود" empty="لا توجد عمليات في هذه الفترة." headers={["المزود","العمليات","التكلفة","على العميل","الربح"]}>{report.providerRows.map((row) => <tr key={row.providerId}><td className="px-4 py-3 font-black text-slate-800 dark:text-slate-200">{row.providerName}</td><td className="px-4 py-3 font-numeric font-bold">{row.operationCount}</td><td className="px-4 py-3 font-numeric font-bold text-amber-700 dark:text-amber-300">{formatCurrency(row.providerCost, row.currencyCode)}</td><td className="px-4 py-3 font-numeric font-bold text-teal-700 dark:text-teal-300">{formatCurrency(row.customerCharge, row.currencyCode)}</td><td className="px-4 py-3 font-numeric font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(row.profit, row.currencyCode)}</td></tr>)}</ReportTable>
      <ReportTable title="أفضل الخدمات" empty="لا توجد خدمات في هذه الفترة." headers={["الخدمة","الفئة","العمليات","الإيراد","الربح"]}>{report.serviceRows.map((row) => <tr key={`${row.category}-${row.serviceName}`}><td className="px-4 py-3 font-black text-slate-800 dark:text-slate-200">{row.serviceName}</td><td className="px-4 py-3 text-[10px] font-bold text-slate-500">{row.category}</td><td className="px-4 py-3 font-numeric font-bold">{row.operationCount}</td><td className="px-4 py-3 font-numeric font-bold text-teal-700 dark:text-teal-300">{formatCurrency(row.customerCharge, currency)}</td><td className="px-4 py-3 font-numeric font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(row.profit, currency)}</td></tr>)}</ReportTable>
    </section>

    <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">طرق التحصيل</h2><div className="mt-4 space-y-2">{report.paymentRows.length === 0 ? <p className="py-8 text-center text-xs font-bold text-slate-400">لا توجد بيانات.</p> : report.paymentRows.map((row) => <div key={row.paymentDestination} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"><div><p className="text-xs font-black text-slate-700 dark:text-slate-200">{paymentLabel(row.paymentDestination)}</p><p className="mt-0.5 text-[9px] font-bold text-slate-400">{row.operationCount} عملية</p></div><p className="font-numeric text-sm font-black text-slate-900 dark:text-slate-100">{formatCurrency(row.amount, currency)}</p></div>)}</div><div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20"><div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-200"><Scale className="h-4 w-4" /><p className="text-xs font-black">فروقات الجرد</p></div><div className="mt-3 grid grid-cols-2 gap-3"><Mini label="عدد المطابقات" value={String(report.reconciliation.count)} /><Mini label="إجمالي الفروقات" value={formatCurrency(report.reconciliation.absoluteDifference, currency)} /></div><p className="mt-2 text-[9px] font-semibold text-slate-400">الصافي: {formatCurrency(report.reconciliation.netDifference, currency)}</p></div></div>
      <ReportTable title="الأداء اليومي" empty="لا توجد حركة يومية." headers={["اليوم","العمليات","التكلفة","الإيراد","الربح"]}>{report.dailyRows.map((row) => <tr key={String(row.day)}><td className="px-4 py-3 font-numeric font-black text-slate-700 dark:text-slate-200">{new Intl.DateTimeFormat("ar", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(new Date(row.day))}</td><td className="px-4 py-3 font-numeric font-bold">{row.operationCount}</td><td className="px-4 py-3 font-numeric font-bold text-amber-700 dark:text-amber-300">{formatCurrency(row.providerCost, currency)}</td><td className="px-4 py-3 font-numeric font-bold text-teal-700 dark:text-teal-300">{formatCurrency(row.customerCharge, currency)}</td><td className="px-4 py-3 font-numeric font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(row.profit, currency)}</td></tr>)}</ReportTable>
    </section>
  </div>;
}

function Stat({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Sparkles }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"><Icon className="h-4 w-4" /></span><p className="mt-3 text-[9px] font-black text-slate-400">{title}</p><p className="mt-1 font-numeric text-sm font-black text-slate-900 dark:text-slate-100">{value}</p></div>; }
function Mini({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-black text-slate-400">{label}</p><p className="mt-1 font-numeric text-sm font-black text-slate-900 dark:text-slate-100">{value}</p></div>; }
function ReportTable({ title, empty, headers, children }: { title: string; empty: string; headers: string[]; children: React.ReactNode }) { const rows = Array.isArray(children) ? children.length : children ? 1 : 0; return <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h2></div>{rows === 0 ? <div className="py-12 text-center text-xs font-bold text-slate-400">{empty}</div> : <div className="overflow-x-auto"><table className="min-w-[680px] w-full text-right text-xs"><thead className="bg-slate-50 text-[10px] font-black text-slate-500 dark:bg-slate-900/70 dark:text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody></table></div>}</div>; }
