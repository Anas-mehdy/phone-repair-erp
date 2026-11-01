import { requirePermission } from "@/lib/auth/context";
import { formatDate } from "@/lib/format";
import { resolveReportRange, type ReportSearchParams } from "@/lib/reports/reportRange";
import { reportDashboardService } from "@/lib/services/reportDashboardService";
import { getReportLiquidity } from "@/lib/services/reportLiquidityService";
import { timeZoneForCountry } from "@/lib/timezone";
import { PrintControls } from "./_print-controls";
import { ReportDocument } from "./_report-document";
import "./report-print.css";

export const dynamic = "force-dynamic";

type PrintPageProps = { searchParams: Promise<ReportSearchParams> };

export default async function ReportPrintPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;
  const auth = await requirePermission("reports:read");
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const range = resolveReportRange(params, timeZone);
  const [dashboard, liquidity] = await Promise.all([
    reportDashboardService.getReportDashboard(auth.shop.id, range),
    getReportLiquidity(auth.shop.id, range.start, range.end),
  ]);
  const period = `${formatDate(range.start, timeZone)} — ${formatDate(new Date(range.end.getTime() - 1), timeZone)}`;
  const generatedAt = new Intl.DateTimeFormat("ar", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date());
  return <div dir="rtl" className="massar-report-print min-h-screen bg-slate-100 text-slate-950 print:bg-white">
    <PrintControls title={`${auth.shop.name} - الجرد - ${formatDate(range.start, timeZone)}`} />
    <ReportDocument shopName={auth.shop.name} currency={auth.shop.currency || "SAR"} period={period} generatedAt={generatedAt} daily={range.preset === "today"} dashboard={dashboard} liquidity={liquidity} />
  </div>;
}
