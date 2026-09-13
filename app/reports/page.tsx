import { Download, FileSpreadsheet, Printer } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { formatDate } from "@/lib/format";
import { reportRangeInputs, reportRangeQuery, resolveReportRange, type ReportSearchParams } from "@/lib/reports/reportRange";
import { reportDashboardService } from "@/lib/services/reportDashboardService";
import { timeZoneForCountry } from "@/lib/timezone";
import { FinancialSections } from "./_financial-sections";
import { OperationsSections } from "./_operations-sections";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportSearchParams> }) {
  const params = await searchParams;
  const auth = await requirePermission("reports:read");
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const range = resolveReportRange(params, timeZone);
  const dashboard = await reportDashboardService.getReportDashboard(auth.shop.id, range);
  const currency = auth.shop.currency || "SAR";
  const query = reportRangeQuery(params, range);
  const { lastInstant: rangeLastInstant, startInput: rangeStartInput, endInput: rangeEndInput } = reportRangeInputs(range, timeZone);

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        eyebrow="المالية في صورة واضحة"
        title="التقارير والأرباح"
        description="جرد مالي سريع ومفصل: المبيعات والأرباح حسب النشاط، الأرصدة والسيولة، المخزون، الديون، التوالف والمصروفات."
      />

      <section className="erp-filter-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-slate-800 dark:text-slate-100">الفترة المعروضة: {range.label}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">من {formatDate(range.start, timeZone)} إلى {formatDate(rangeLastInstant, timeZone)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <details className="group relative">
              <summary className="inline-flex h-9 cursor-pointer list-none items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900">
                <Download className="ml-1.5 h-4 w-4" />تصدير الجرد
              </summary>
              <div className="absolute left-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-950">
                <a href={`/reports/export/excel?${query}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><FileSpreadsheet className="h-4 w-4 text-emerald-600" />تنزيل Excel</a>
                <Link href={`/reports/print?${query}`} target="_blank" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"><Printer className="h-4 w-4 text-rose-600" />حفظ PDF</Link>
              </div>
            </details>
            {[["today", "اليوم"], ["week", "7 أيام"], ["month", "هذا الشهر"], ["year", "هذه السنة"]].map(([value, label]) => (
              <Button key={value} asChild size="sm" variant={range.preset === value ? "default" : "outline"} className="rounded-xl text-xs font-bold"><Link href={`/reports?preset=${value}`}>{label}</Link></Button>
            ))}
          </div>
        </div>

        <form className="grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="preset" value="custom" />
          <label className="grid gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">من تاريخ<input className="erp-input" type="date" name="start" defaultValue={rangeStartInput} required /></label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">إلى تاريخ<input className="erp-input" type="date" name="end" defaultValue={rangeEndInput} required /></label>
          <Button type="submit" className="h-11 rounded-xl font-bold">عرض الفترة</Button>
        </form>
      </section>

      <FinancialSections dashboard={dashboard} currency={currency} query={query} preset={range.preset} />
      <OperationsSections dashboard={dashboard} currency={currency} query={query} />
    </div>
  );
}
