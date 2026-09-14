import { Banknote, BookOpenText, CircleDollarSign, Landmark, PackageSearch, ReceiptText, Trash2, Truck, WalletCards, Zap } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import type { ReportDashboardData } from "@/lib/services/reportDashboardService";
import { BalanceCard, BreakdownCard, ReportSection, StatusCard, SummaryCard } from "./_report-primitives";

function withRange(href: string, query: string) {
  return `${href}${href.includes("?") ? "&" : "?"}${query}`;
}

export function OperationsSections({ dashboard, currency, query }: { dashboard: ReportDashboardData; currency: string; query: string }) {
  const maxMix = Math.max(...dashboard.baseReport.revenueMix.map((item) => item.value), 1);
  const maxSource = Math.max(...dashboard.baseReport.paymentSources.map((item) => item.value), 1);

  return (
    <>
      <ReportSection eyebrow="الأرصدة والمخزون" title="أين توجد أموال المتجر الآن؟" description="الأرصدة الحالية مستقلة عن الفترة؛ أما قيمة المخزون فهي بسعر التكلفة وليس بسعر البيع.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <BalanceCard label="الدرج النقدي" value={dashboard.balances.drawer} currency={currency} icon={Banknote} href="/cash-drawer" helper="الرصيد النقدي الحالي" />
          <BalanceCard label="المحافظ الإلكترونية" value={dashboard.balances.wallets} currency={currency} icon={WalletCards} href="/transfers" helper="إجمالي أرصدة المحافظ" />
          <BalanceCard label="الحسابات البنكية" value={dashboard.balances.banks} currency={currency} icon={Landmark} href="/bank-accounts" helper="إجمالي أرصدة الحسابات" />
          <BalanceCard label="رصيد الخدمات الإلكترونية" value={dashboard.balances.electronicProviders} currency={currency} icon={Zap} href="/electronic-services" helper="رصيد مزودي الخدمات الحالي" />
          <BalanceCard label="إجمالي السيولة" value={dashboard.balances.liquidity} currency={currency} icon={CircleDollarSign} href="/cash-drawer" helper="الدرج + المحافظ + البنوك" emphasized />
          <BalanceCard label="قيمة المخزون" value={dashboard.balances.inventory} currency={currency} icon={PackageSearch} href="/inventory" helper="قيمة الكميات الحالية بسعر التكلفة" />
        </div>
      </ReportSection>

      <ReportSection eyebrow="الديون والتوالف والمصروفات" title="الحركات التي تحتاج متابعة" description="ملخص سريع، والضغط على أي بطاقة يفتح التفاصيل الكاملة.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard label="الديون والمستحقات" value={dashboard.obligations.debts} currency={currency} icon={BookOpenText} helper="إجمالي المبالغ المتبقية عند العملاء" href="/debts" tone="amber" />
          <StatusCard label="التوالف" value={dashboard.obligations.damages} currency={currency} icon={Trash2} helper={`${dashboard.obligations.damageCount} حركة تالف ضمن الفترة`} href={withRange("/reports/damages", query)} tone="rose" />
          <StatusCard label="المصروفات" value={dashboard.obligations.expenses} currency={currency} icon={ReceiptText} helper={`${dashboard.obligations.expenseCount} حركة مصروف ضمن الفترة`} href={withRange("/expenses", query)} tone="orange" />
          <StatusCard label="الديون التي علينا" value={dashboard.obligations.supplierPurchaseDebt} currency={currency} icon={Truck} helper="إجمالي المتبقي من فواتير الشراء المعتمدة" href="/inventory/purchases" tone="indigo" />
        </div>
      </ReportSection>

      <ReportSection eyebrow="تحليل إضافي" title="قوة التقرير المالي الحالي" description="نحافظ على التحليل التفصيلي للمقبوضات والمستحقات ومصادر الأموال بدل اختزاله بالجرد السريع.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard label="المقبوض فعلياً" helper="يشمل التحصيل المباشر وتحصيلات الديون" value={formatCurrency(dashboard.baseReport.metrics.collected, currency)} icon={Banknote} tone="emerald" href={withRange("/reports/details/collected", query)} />
          <SummaryCard label="المتبقي عند العملاء" helper="فواتير وأقساط وديون خدمات إلكترونية" value={formatCurrency(dashboard.baseReport.metrics.outstanding, currency)} icon={BookOpenText} tone="amber" href={withRange("/reports/details/outstanding", query)} />
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <BreakdownCard title="من أين جاءت المبيعات؟" description="توزيع الإيرادات حسب المصدر مع منع التكرار" items={dashboard.baseReport.revenueMix} max={maxMix} currency={currency} empty="لا توجد مبيعات في هذه الفترة." />
          <BreakdownCard title="مصادر الأموال المقبوضة" description="نقدي، بطاقة، بنك، محافظ وخدمات إلكترونية" items={dashboard.baseReport.paymentSources} max={maxSource} currency={currency} empty="لا توجد دفعات في هذه الفترة." />
        </div>
      </ReportSection>
    </>
  );
}
