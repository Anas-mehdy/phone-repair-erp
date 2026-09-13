import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDate } from "@/lib/format";
import { resolveReportRange, type ReportSearchParams } from "@/lib/reports/reportRange";
import { reportDashboardService } from "@/lib/services/reportDashboardService";
import { timeZoneForCountry } from "@/lib/timezone";
import { PrintControls } from "./_print-controls";

export const dynamic = "force-dynamic";

type PrintPageProps = { searchParams: Promise<ReportSearchParams> };

export default async function ReportPrintPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;
  const auth = await requirePermission("reports:read");
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const range = resolveReportRange(params, timeZone);
  const dashboard = await reportDashboardService.getReportDashboard(auth.shop.id, range);
  const currency = auth.shop.currency || "SAR";
  const endDisplay = new Date(range.end.getTime() - 1);
  const departments = Object.values(dashboard.departments);

  return (
    <div dir="rtl" className="massar-report-print min-h-screen bg-slate-100 text-slate-950 print:bg-white">
      <style>{`
        @page { size: A4; margin: 12mm; }
        body:has(.massar-report-print) { background: white !important; }
        .massar-report-print ~ section { display: none !important; }
        @media print {
          body:has(.massar-report-print) > *:not(.massar-report-print) { display: none !important; }
          .massar-report-print { min-height: auto !important; background: white !important; }
          .massar-report-print main { box-shadow: none !important; }
        }
      `}</style>
      <PrintControls />
      <main className="mx-auto max-w-[210mm] bg-white p-8 print:max-w-none print:p-0">
        <header className="mb-7 border-b-2 border-slate-900 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold text-slate-500">نظام مسار ERP</p>
              <h1 className="mt-1 text-2xl font-black">جرد وتقرير مالي</h1>
              <p className="mt-2 text-sm font-bold">{auth.shop.name}</p>
            </div>
            <div className="text-left text-xs font-bold leading-6 text-slate-600">
              <p>الفترة: {range.label}</p>
              <p>{formatDate(range.start, timeZone)} — {formatDate(endDisplay, timeZone)}</p>
              <p>العملة: {currency}</p>
            </div>
          </div>
        </header>

        <Section title="الملخص المالي">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="إجمالي المبيعات" value={formatCurrency(dashboard.summary.sales, currency)} />
            <Metric label="التكاليف المباشرة" value={formatCurrency(dashboard.summary.directCosts, currency)} />
            <Metric label="مجمل الربح" value={formatCurrency(dashboard.summary.grossProfit, currency)} />
            <Metric label="صافي الربح" value={formatCurrency(dashboard.summary.netProfit, currency)} strong />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric label="المقبوض فعلياً" value={formatCurrency(dashboard.baseReport.metrics.collected, currency)} />
            <Metric label="المتبقي عند العملاء" value={formatCurrency(dashboard.baseReport.metrics.outstanding, currency)} />
          </div>
        </Section>

        <Section title="المبيعات والأرباح حسب القسم">
          <Table headers={["القسم", "العمليات", "المبيعات / الداخل", "التكلفة / الخارج", "الربح"]} rows={departments.map((item) => [
            item.label,
            String(item.count),
            formatCurrency(item.revenue, currency),
            formatCurrency(item.cost, currency),
            formatCurrency(item.profit, currency),
          ])} />
          <p className="mt-2 text-[10px] font-bold text-slate-500">ملاحظة: في التحويلات المالية، أصل مبلغ التحويل لا يدخل ضمن إجمالي المبيعات؛ الربح المعتمد هو العمولة.</p>
        </Section>

        <Section title="الأرصدة الحالية والمخزون">
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] font-bold text-amber-900">
            هذه أرصدة لحظية حالية وليست أرصدة تاريخية بنهاية الفترة المختارة. قيمة المخزون محسوبة بسعر التكلفة.
          </p>
          <Table headers={["البيان", "القيمة"]} rows={[
            ["الدرج النقدي", formatCurrency(dashboard.balances.drawer, currency)],
            ["المحافظ الإلكترونية", formatCurrency(dashboard.balances.wallets, currency)],
            ["الحسابات البنكية", formatCurrency(dashboard.balances.banks, currency)],
            ["رصيد الخدمات الإلكترونية", formatCurrency(dashboard.balances.electronicProviders, currency)],
            ["إجمالي السيولة", formatCurrency(dashboard.balances.liquidity, currency)],
            ["قيمة المخزون", formatCurrency(dashboard.balances.inventory, currency)],
          ]} />
        </Section>

        <Section title="الديون والتوالف والمصروفات">
          <Table headers={["البيان", "القيمة", "عدد الحركات"]} rows={[
            ["الديون والمستحقات", formatCurrency(dashboard.obligations.debts, currency), "—"],
            ["المصروفات ضمن الفترة", formatCurrency(dashboard.obligations.expenses, currency), String(dashboard.obligations.expenseCount)],
            ["التوالف ضمن الفترة", formatCurrency(dashboard.obligations.damages, currency), String(dashboard.obligations.damageCount)],
          ]} />
        </Section>

        <footer className="mt-8 border-t border-slate-300 pt-3 text-[9px] font-semibold text-slate-500">
          تم إنشاء هذا التقرير من مسار ERP. الأرقام الخاصة بالمبيعات والأرباح والمصروفات والتوالف مرتبطة بالفترة المحددة؛ الأرصدة موضحة كأرصدة حالية.
        </footer>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mb-7 break-inside-avoid"><h2 className="mb-3 text-sm font-black">{title}</h2>{children}</section>;
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`rounded-xl border p-3 ${strong ? "border-slate-900" : "border-slate-200"}`}><p className="text-[10px] font-bold text-slate-500">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table className="w-full border-collapse text-[10px]">
      <thead><tr>{headers.map((header) => <th key={header} className="border border-slate-300 bg-slate-100 px-2 py-2 text-right font-black">{header}</th>)}</tr></thead>
      <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border border-slate-300 px-2 py-2 font-semibold">{cell}</td>)}</tr>)}</tbody>
    </table>
  );
}
