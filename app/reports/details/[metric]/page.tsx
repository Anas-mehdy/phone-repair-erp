import { ArrowRight, Banknote, Boxes, CircleDollarSign, ReceiptText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { reportRangeQuery, resolveReportRange, type ReportSearchParams } from "@/lib/reports/reportRange";
import { reportDashboardService } from "@/lib/services/reportDashboardService";
import { timeZoneForCountry } from "@/lib/timezone";

export const dynamic = "force-dynamic";

type MetricKey = "sales" | "direct-costs" | "gross-profit" | "net-profit" | "collected" | "outstanding";

type MetricInfo = {
  title: string;
  description: string;
  helper: string;
  icon: typeof ReceiptText;
};

const metricInfo: Record<MetricKey, MetricInfo> = {
  sales: {
    title: "تفاصيل إجمالي المبيعات",
    description: "توزيع المبيعات حسب نشاط المتجر ومصدر الإيراد ضمن الفترة المختارة.",
    helper: "لا يدخل أصل مبالغ التحويلات المالية ضمن إجمالي المبيعات.",
    icon: ReceiptText,
  },
  "direct-costs": {
    title: "تفاصيل التكاليف المباشرة",
    description: "تكلفة القطع والخدمات والمزودين المرتبطة مباشرة بالمبيعات خلال الفترة.",
    helper: "المصروفات التشغيلية مستقلة عن هذه التكلفة وتظهر عند حساب صافي الربح.",
    icon: Boxes,
  },
  "gross-profit": {
    title: "تفاصيل مجمل الربح",
    description: "الربح الناتج عن الأنشطة قبل طرح المصروفات التشغيلية.",
    helper: "يتضمن أرباح وعمولات التحويلات دون احتساب أصل مبالغ التحويل كمبيعات.",
    icon: TrendingUp,
  },
  "net-profit": {
    title: "تفاصيل صافي الربح",
    description: "النتيجة النهائية بعد طرح المصروفات التشغيلية من مجمل الربح.",
    helper: "صافي الربح = مجمل الربح − المصروفات ضمن الفترة.",
    icon: CircleDollarSign,
  },
  collected: {
    title: "تفاصيل المقبوض فعلياً",
    description: "الأموال التي تم تحصيلها فعلياً خلال الفترة من الفواتير والديون والتحصيلات.",
    helper: "هذا الرقم يقيس التحصيل الفعلي وليس قيمة المبيعات المسجلة فقط.",
    icon: Banknote,
  },
  outstanding: {
    title: "تفاصيل المتبقي عند العملاء",
    description: "المبالغ التي ما زالت مستحقة على العملاء ولم تُحصّل بعد.",
    helper: "يشمل المستحقات التي تدخل ضمن التقرير المالي الحالي حسب مصدرها.",
    icon: ReceiptText,
  },
};

export default async function ReportMetricDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ metric: string }>;
  searchParams: Promise<ReportSearchParams>;
}) {
  const [{ metric }, queryParams] = await Promise.all([params, searchParams]);
  if (!(metric in metricInfo)) notFound();
  const key = metric as MetricKey;
  const info = metricInfo[key];
  const MetricIcon = info.icon;

  const auth = await requirePermission("reports:read");
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const range = resolveReportRange(queryParams, timeZone);
  const dashboard = await reportDashboardService.getReportDashboard(auth.shop.id, range);
  const currency = auth.shop.currency || "SAR";
  const query = reportRangeQuery(queryParams, range);
  const endDisplay = new Date(range.end.getTime() - 1);
  const departments = Object.values(dashboard.departments);

  const value = key === "sales" ? dashboard.summary.sales
    : key === "direct-costs" ? dashboard.summary.directCosts
      : key === "gross-profit" ? dashboard.summary.grossProfit
        : key === "net-profit" ? dashboard.summary.netProfit
          : key === "collected" ? dashboard.baseReport.metrics.collected
            : dashboard.baseReport.metrics.outstanding;

  return (
    <div className="space-y-6 pb-10">
      <PageHeader eyebrow="تفاصيل التقرير" title={info.title} description={info.description} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={`/reports?${query}`}><ArrowRight className="ml-1.5 h-4 w-4" />العودة للتقارير</Link>
        </Button>
        <p className="text-[11px] font-bold text-slate-500">{formatDate(range.start, timeZone)} — {formatDate(endDisplay, timeZone)}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-slate-500">{info.title.replace("تفاصيل ", "")}</p>
            <p className="mt-2 font-numeric text-3xl font-black text-slate-950 dark:text-white">{formatCurrency(value, currency)}</p>
            <p className="mt-3 max-w-2xl text-[11px] font-bold leading-6 text-slate-500">{info.helper}</p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"><MetricIcon className="h-5 w-5" /></span>
        </div>
      </section>

      {(key === "sales" || key === "direct-costs" || key === "gross-profit" || key === "net-profit") ? (
        <section className="erp-section overflow-hidden p-0">
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">حسب القسم</h2>
            <p className="mt-1 text-[10px] font-bold text-slate-400">نفس الأرقام المستخدمة في بطاقة التقرير الرئيسية.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/70"><tr><th className="px-5 py-3">القسم</th><th className="px-5 py-3">العمليات</th><th className="px-5 py-3">المبيعات / الداخل</th><th className="px-5 py-3">التكلفة / الخارج</th><th className="px-5 py-3">الربح</th></tr></thead>
              <tbody>
                {departments.map((item) => (
                  <tr key={item.key} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-5 py-3 font-black">{item.label}</td>
                    <td className="px-5 py-3 font-numeric">{item.count}</td>
                    <td className="px-5 py-3 font-numeric">{formatCurrency(item.revenue, currency)}</td>
                    <td className="px-5 py-3 font-numeric">{formatCurrency(item.cost, currency)}</td>
                    <td className="px-5 py-3 font-numeric font-black">{formatCurrency(item.profit, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {key === "sales" ? <Breakdown title="مصادر الإيرادات" items={dashboard.baseReport.revenueMix} currency={currency} /> : null}
      {key === "collected" ? <Breakdown title="مصادر الأموال المقبوضة" items={dashboard.baseReport.paymentSources} currency={currency} /> : null}

      {key === "net-profit" ? (
        <section className="grid gap-3 sm:grid-cols-3">
          <Mini label="مجمل الربح" value={dashboard.summary.grossProfit} currency={currency} />
          <Mini label="المصروفات" value={dashboard.obligations.expenses} currency={currency} />
          <Mini label="صافي الربح" value={dashboard.summary.netProfit} currency={currency} emphasized />
        </section>
      ) : null}
    </div>
  );
}

function Mini({ label, value, currency, emphasized = false }: { label: string; value: number; currency: string; emphasized?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${emphasized ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`}><p className="text-[10px] font-black text-slate-500">{label}</p><p className="mt-2 font-numeric text-lg font-black">{formatCurrency(value, currency)}</p></div>;
}

function Breakdown({ title, items, currency }: { title: string; items: Array<{ label: string; value: number }>; currency: string }) {
  return (
    <section className="erp-section">
      <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {items.length ? items.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 py-3 text-xs"><span className="font-bold text-slate-600 dark:text-slate-300">{item.label}</span><span className="font-numeric font-black">{formatCurrency(item.value, currency)}</span></div>) : <p className="py-4 text-xs font-bold text-slate-400">لا توجد بيانات في هذه الفترة.</p>}
      </div>
    </section>
  );
}
