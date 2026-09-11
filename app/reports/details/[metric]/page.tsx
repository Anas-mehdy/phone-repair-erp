import { ArrowRight, ExternalLink, Info, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getReportMetricDrilldown,
  type ReportMetricKey,
} from "@/lib/services/reportDrilldownService";
import {
  dateInputEndUtcForTimeZone,
  dateInputStartUtcForTimeZone,
  dayUtcBoundsForTimeZone,
  localDateParts,
  monthUtcBoundsForTimeZone,
  timeZoneForCountry,
  yearUtcBoundsForTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

export const dynamic = "force-dynamic";

type SearchParams = {
  preset?: string;
  start?: string;
  end?: string;
};

type ResolvedRange = {
  preset: "today" | "week" | "month" | "year" | "custom";
  start: Date;
  end: Date;
  label: string;
};

const validMetrics = new Set<ReportMetricKey>([
  "sales",
  "collected",
  "outstanding",
  "direct-costs",
  "electronic-profit",
  "transfer-profit",
  "gross-profit",
  "expenses",
  "net-profit",
  "inventory-value",
]);

function localDayShift(reference: Date, days: number, timeZone: string) {
  const local = localDateParts(reference, timeZone);
  const shifted = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
  return zonedDateTimeToUtc({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }, timeZone);
}

function resolveRange(params: SearchParams, timeZone: string): ResolvedRange {
  const now = new Date();
  const today = dayUtcBoundsForTimeZone(now, timeZone);
  const preset = ["today", "week", "month", "year", "custom"].includes(params.preset ?? "")
    ? params.preset as ResolvedRange["preset"]
    : "month";

  if (preset === "today") {
    return { preset, start: today.start, end: today.end, label: "اليوم" };
  }
  if (preset === "week") {
    return { preset, start: localDayShift(now, -6, timeZone), end: today.end, label: "آخر 7 أيام" };
  }
  if (preset === "year") {
    const year = yearUtcBoundsForTimeZone(now, timeZone);
    return { preset, start: year.start, end: today.end, label: "هذه السنة" };
  }
  if (preset === "custom" && params.start && params.end) {
    const start = dateInputStartUtcForTimeZone(params.start, timeZone);
    const end = dateInputEndUtcForTimeZone(params.end, timeZone);
    if (start && end && start < end) {
      return { preset, start, end, label: "فترة مخصصة" };
    }
  }

  const month = monthUtcBoundsForTimeZone(now, timeZone);
  return { preset: "month", start: month.start, end: today.end, label: "هذا الشهر" };
}

function reportHref(params: SearchParams, range: ResolvedRange) {
  const search = new URLSearchParams({ preset: range.preset });
  if (range.preset === "custom" && params.start && params.end) {
    search.set("start", params.start);
    search.set("end", params.end);
  }
  return `/reports?${search.toString()}`;
}

export default async function ReportMetricDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ metric: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ metric: rawMetric }, query] = await Promise.all([params, searchParams]);
  if (!validMetrics.has(rawMetric as ReportMetricKey)) notFound();
  const metric = rawMetric as ReportMetricKey;

  const auth = await requirePermission("reports:read");
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const range = resolveRange(query, timeZone);
  const result = await getReportMetricDrilldown(auth.shop.id, metric, range);
  const currency = auth.shop.currency || "SAR";
  const difference = Math.round((result.total - result.detailedTotal + Number.EPSILON) * 100) / 100;
  const hasDifference = Math.abs(difference) >= 0.01;
  const lastInstant = new Date(range.end.getTime() - 1);
  const rowCount = result.sections.reduce((sum, item) => sum + item.rows.length, 0);

  return (
    <div className="space-y-7 pb-10">
      <PageHeader
        eyebrow="التقارير والأرباح • جرد الرقم"
        title={result.title}
        description={result.description}
        actions={(
          <Button asChild variant="outline" className="rounded-xl font-black">
            <Link href={reportHref(query, range)}>
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للتقارير والأرباح
            </Link>
          </Button>
        )}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400">الفترة المطابقة للبطاقة</p>
            <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">
              {range.label} — {formatDateTime(range.start, timeZone)} إلى {formatDateTime(lastInstant, timeZone)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="رقم البطاقة" value={formatCurrency(result.total, currency)} emphasized />
            <Summary label="مجموع الجرد" value={formatCurrency(result.detailedTotal, currency)} />
            <Summary
              label="فرق المطابقة"
              value={formatCurrency(difference, currency)}
              warning={hasDifference}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-900">{rowCount} حركة / بند</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-900">{result.sections.length} مصدر</span>
        </div>
      </section>

      {result.formula ? (
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs font-bold leading-6 text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div><strong>معادلة البطاقة:</strong> {result.formula}</div>
        </div>
      ) : null}

      {result.note ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs font-bold leading-6 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200">
          {result.note}
        </div>
      ) : null}

      {hasDifference ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          يوجد فرق مطابقة قدره {formatCurrency(difference, currency)} بين رقم البطاقة ومجموع البنود المعروضة.
          هذا التنبيه مقصود حتى لا يخفي النظام أي فرق محاسبي أو بيانات قديمة تحتاج مراجعة.
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-black text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200">
          الجرد مطابق لرقم البطاقة.
        </div>
      )}

      <div className="space-y-6">
        {result.sections.map((item) => (
          <section key={item.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{item.title}</h2>
                <p className="mt-1 text-[10px] font-bold leading-5 text-slate-400">{item.description}</p>
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-400">مجموع المصدر</p>
                <p className={`mt-1 font-numeric text-base font-black ${item.total < 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-slate-100"}`}>
                  {formatCurrency(item.total, currency)}
                </p>
              </div>
            </div>

            {item.rows.length === 0 ? (
              <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center text-xs font-bold text-slate-400">
                <ReceiptText className="h-6 w-6 text-slate-300" />
                لا توجد حركات من هذا المصدر ضمن الفترة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table min-w-[980px]">
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>المصدر</th>
                      <th>البيان</th>
                      <th>العميل / الطرف</th>
                      <th>المرجع</th>
                      <th>المبلغ</th>
                      <th className="w-24 text-center">الأصل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="font-numeric text-[11px] font-bold text-slate-500">
                          {row.occurredAt ? formatDateTime(row.occurredAt, timeZone) : "—"}
                        </td>
                        <td className="text-xs font-black text-slate-700 dark:text-slate-200">{row.source}</td>
                        <td>
                          <div className="max-w-[320px] text-xs font-bold text-slate-800 dark:text-slate-100">
                            {row.description}
                          </div>
                        </td>
                        <td className="text-xs font-bold text-slate-600 dark:text-slate-300">{row.party || "—"}</td>
                        <td className="max-w-[220px] truncate font-numeric text-[10px] font-bold text-slate-400" title={row.reference || undefined}>
                          {row.reference || "—"}
                        </td>
                        <td className={`font-numeric text-sm font-black ${row.amount < 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-950 dark:text-slate-50"}`}>
                          {formatCurrency(row.amount, currency)}
                        </td>
                        <td className="text-center">
                          {row.href ? (
                            <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2 text-[10px] font-black">
                              <Link href={row.href}>
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                فتح
                              </Link>
                            </Button>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  emphasized = false,
  warning = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`min-w-[150px] rounded-xl border px-4 py-3 ${
      warning
        ? "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20"
        : emphasized
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
    }`}>
      <p className="text-[9px] font-black text-slate-400">{label}</p>
      <p className={`mt-1 font-numeric text-base font-black ${
        warning
          ? "text-amber-800 dark:text-amber-200"
          : emphasized
            ? "text-emerald-800 dark:text-emerald-200"
            : "text-slate-900 dark:text-slate-100"
      }`}>{value}</p>
    </div>
  );
}
