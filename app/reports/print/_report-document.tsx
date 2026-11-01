import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/format";
import type { ReportDashboardData } from "@/lib/services/reportDashboardService";
import type { getReportLiquidity } from "@/lib/services/reportLiquidityService";

type Props = {
  shopName: string;
  currency: string;
  period: string;
  generatedAt: string;
  daily: boolean;
  dashboard: ReportDashboardData;
  liquidity: Awaited<ReturnType<typeof getReportLiquidity>>;
};

export function ReportDocument({ shopName, currency, period, generatedAt, daily, dashboard: d, liquidity }: Props) {
  const money = (value: number) => formatCurrency(value, currency);
  const channels = [["الدرج النقدي", liquidity.drawer], ["المحافظ الإلكترونية", liquidity.wallets], ["الحسابات البنكية", liquidity.bank]] as const;
  return <article className="report-document" dir="rtl">
    <div className="report-sheet">
      <Header title={daily ? "تقرير الجرد اليومي" : "تقرير الجرد المالي"} shopName={shopName} period={period} generatedAt={generatedAt} currency={currency} />
      <Section number="١" title={daily ? "ملخّص اليوم" : "ملخّص الفترة"} subtitle="المبيعات توضّح قيمة النشاط، والمقبوض يوضّح المال الذي تم تحصيله." >
        <div className="report-metrics">
          <Metric label="إجمالي المبيعات" value={money(d.summary.sales)} />
          <Metric label="المقبوض فعلياً" value={money(d.baseReport.metrics.collected)} />
          <Metric label="صافي الربح" value={money(d.summary.netProfit)} strong />
        </div>
        <Table headers={["البيان", "المبلغ"]} rows={[
          ["التكاليف المباشرة", money(d.summary.directCosts)],
          ["مجمل الربح قبل المصروفات", money(d.summary.grossProfit)],
          ["المتبقي عند العملاء وفق التقرير", money(d.baseReport.metrics.outstanding)],
        ]} />
      </Section>
      <Section number="٢" title="النشاط حسب القسم" subtitle="ملخّص إجمالي، دون تفاصيل الفواتير أو أسماء العملاء.">
        <Table headers={["القسم", "العمليات", "المبيعات / الداخل", "التكلفة / الخارج", "الربح"]} rows={Object.values(d.departments).map(item => [item.label, String(item.count), money(item.revenue), money(item.cost), money(item.profit)])} />
        <p className="report-note">التحويلات المالية: أصل المبلغ المحوّل ليس مبيعات؛ الربح المعتمد هو العمولة.</p>
      </Section>
      <Section number="٣" title="المصروفات والتوالف خلال الفترة">
        <Table headers={["البيان", "عدد الحركات", "المبلغ"]} rows={[
          ["المصروفات", String(d.obligations.expenseCount), money(d.obligations.expenses)],
          ["التوالف", String(d.obligations.damageCount), money(d.obligations.damages)],
        ]} />
      </Section>
      <Footer page="١ / ٢" />
    </div>
    <div className="report-sheet">
      <Header title="السيولة والمطابقة" shopName={shopName} period={period} generatedAt={generatedAt} currency={currency} />
      <Section number="٤" title="المال الداخل والخارج" subtitle="الحركات للفترة المختارة فقط. التحويل بين الدرج والمحفظة أو البنك يغيّر مكان المال ولا يمثّل ربحاً جديداً.">
        <Table headers={["مكان المال", "الداخل", "الخارج", "صافي الحركة"]} rows={channels.map(([label, value]) => [label, money(value.inflow), money(value.outflow), money(value.netMovement)])} />
        <p className="report-note">صافي الحركة = الداخل − الخارج. تسجيل الرصيد الافتتاحي لا يُحسب ضمن حركة الداخل.</p>
      </Section>
      <Section number="٥" title="الأرصدة الحالية والمطابقة اليدوية" subtitle={`الأرصدة حسب النظام وقت استخراج التقرير: ${generatedAt}. ليست أرصدة تاريخية لنهاية الفترة.`}>
        <Table headers={["مكان المال", "الرصيد الحالي بالنظام", "الموجود فعلياً", "الفرق"]} rows={channels.map(([label, value]) => [label, money(value.currentBalance), "........................", "........................"])} />
        <p className="report-note">اكتب الرصيد الذي تحققت منه فعلياً، ثم احسب الفرق: الموجود فعلياً − رصيد النظام. صفر يعني تطابقاً. هذه الخانات للمراجعة الورقية ولا تحفظ تغييرات في الحساب.</p>
      </Section>
      <Section number="٦" title="معلومات إضافية للمراجعة" subtitle="قيم حالية للمعلومية؛ لا تُضاف إلى رصيد الدرج.">
        <Table headers={["البيان", "القيمة"]} rows={[
          ["رصيد الخدمات الإلكترونية", money(d.balances.electronicProviders)],
          ["قيمة المخزون بسعر التكلفة", money(d.balances.inventory)],
          ["المستحق على العملاء حالياً", money(d.obligations.debts)],
        ]} />
      </Section>
      <div className="report-review"><p>ملاحظات المراجعة: ....................................................................................</p><p>أعدّه: ................................... <span>راجعه: ...................................</span></p></div>
      <Footer page="٢ / ٢" />
    </div>
  </article>;
}

function Header({ title, shopName, period, generatedAt, currency }: { title: string; shopName: string; period: string; generatedAt: string; currency: string }) {
  return <header className="report-header"><div className="report-brand">مسار <span>تقرير مالي</span></div><h1>{title}</h1><p className="report-shop">{shopName}</p><div className="report-meta"><span>الفترة: {period}</span><span>العملة: {currency}</span><span>وقت الاستخراج: {generatedAt}</span></div></header>;
}
function Section({ number, title, subtitle, children }: { number: string; title: string; subtitle?: string; children: ReactNode }) {
  return <section className="report-section"><h2><span>{number}</span>{title}</h2>{subtitle && <p className="report-subtitle">{subtitle}</p>}{children}</section>;
}
function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`report-metric${strong ? " report-metric-strong" : ""}`}><p>{label}</p><strong>{value}</strong></div>;
}
function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <table className="report-table"><thead><tr>{headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className={j ? "report-number" : undefined}>{cell}</td>)}</tr>)}</tbody></table>;
}
function Footer({ page }: { page: string }) {
  return <footer className="report-footer"><span>مسار • ملخّص للمراجعة والمطابقة</span><span>{page}</span></footer>;
}
