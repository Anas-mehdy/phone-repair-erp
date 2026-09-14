import {
  ArrowLeftRight,
  Boxes,
  CircleDollarSign,
  CreditCard,
  ReceiptText,
  Smartphone,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";

import { formatCurrency } from "@/lib/format";
import type { ReportDashboardData } from "@/lib/services/reportDashboardService";
import { PerformanceCard, TotalProfitCard } from "./_performance-cards";
import { ReportSection, SummaryCard } from "./_report-primitives";

function withRange(href: string, query: string) {
  return `${href}${href.includes("?") ? "&" : "?"}${query}`;
}

export function FinancialSections({ dashboard, currency, query, preset }: {
  dashboard: ReportDashboardData;
  currency: string;
  query: string;
  preset: string;
}) {
  return (
    <>
      <ReportSection
        eyebrow={preset === "today" ? "ملخص الجرد اليومي" : "ملخص الفترة"}
        title="ملخص الأداء المالي"
        description="الأرقام الأساسية التي تحتاجها أولاً، مع إمكانية فتح جرد كل رقم بالتفصيل."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="إجمالي المبيعات" helper="لا يشمل أصل مبالغ التحويلات المالية" value={formatCurrency(dashboard.summary.sales, currency)} icon={ReceiptText} tone="indigo" href={withRange("/reports/details/sales", query)} />
          <SummaryCard label="التكاليف المباشرة" helper="قطع وتكاليف خدمات ومزودين" value={formatCurrency(dashboard.summary.directCosts, currency)} icon={Boxes} tone="rose" href={withRange("/reports/details/direct-costs", query)} />
          <SummaryCard label="مجمل الربح" helper="قبل المصروفات ويشمل أرباح التحويلات" value={formatCurrency(dashboard.summary.grossProfit, currency)} icon={TrendingUp} tone={dashboard.summary.grossProfit >= 0 ? "teal" : "rose"} href={withRange("/reports/details/gross-profit", query)} />
          <SummaryCard label="صافي الربح" helper={`بعد المصروفات — هامش ${dashboard.summary.profitMargin.toFixed(1)}%`} value={formatCurrency(dashboard.summary.netProfit, currency)} icon={CircleDollarSign} tone={dashboard.summary.netProfit >= 0 ? "emerald" : "rose"} href={withRange("/reports/details/net-profit", query)} featured />
        </div>
      </ReportSection>

      <ReportSection
        eyebrow="المبيعات حسب القسم"
        title="أداء وربحية كل نشاط"
        description="سعر البيع والتكلفة والربح لكل قسم ضمن نفس الفترة المختارة. الضغط يفتح سجل القسم التشغيلي."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PerformanceCard item={dashboard.departments.repairs} currency={currency} icon={Wrench} href="/repair-orders" />
          <PerformanceCard item={dashboard.departments.pos} currency={currency} icon={CreditCard} href="/sales" />
          <PerformanceCard item={dashboard.departments.transfers} currency={currency} icon={ArrowLeftRight} href="/transfers" revenueLabel="القيمة الداخلة" costLabel="القيمة الخارجة" note="أصل مبلغ التحويل لا يدخل ضمن إجمالي المبيعات؛ الربح هو العمولة فقط." />
          <PerformanceCard item={dashboard.departments.electronic} currency={currency} icon={Zap} href="/electronic-services/reports" revenueLabel="البيع" extraMetric={{ label: "إضافة الرصيد", value: dashboard.electronicProviderTopUps }} />
          <PerformanceCard item={dashboard.departments.software} currency={currency} icon={Smartphone} href="/software-services" />
          <TotalProfitCard grossProfit={dashboard.summary.grossProfit} totalSales={dashboard.summary.sales} directCosts={dashboard.summary.directCosts} expenses={dashboard.obligations.expenses} currency={currency} href={withRange("/reports/details/gross-profit", query)} />
        </div>
      </ReportSection>
    </>
  );
}
