import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { formatCurrency } from "@/lib/format";
import type { ReportDepartmentPerformance } from "@/lib/services/reportDashboardService";

export function PerformanceCard({ item, currency, icon: Icon, href, revenueLabel = "سعر البيع", costLabel = "التكلفة", note }: {
  item: ReportDepartmentPerformance;
  currency: string;
  icon: LucideIcon;
  href: string;
  revenueLabel?: string;
  costLabel?: string;
  note?: string;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-900 dark:text-slate-100">{item.label}</p><p className="mt-1 text-[9px] font-bold text-slate-400">{item.count} عملية ضمن الفترة</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"><Icon className="h-5 w-5" /></span></div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniMetric label={revenueLabel} value={formatCurrency(item.revenue, currency)} />
        <MiniMetric label={costLabel} value={formatCurrency(item.cost, currency)} />
        <MiniMetric label="الربح" value={formatCurrency(item.profit, currency)} />
      </div>
      {note ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-[9px] font-bold leading-4 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">{note}</p> : null}
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><p className="text-[8px] font-black text-slate-400">{label}</p><p className="mt-1 break-words font-numeric text-xs font-black text-slate-900 dark:text-slate-100">{value}</p></div>;
}

export function TotalProfitCard({ grossProfit, totalSales, directCosts, expenses, currency, href }: { grossProfit: number; totalSales: number; directCosts: number; expenses: number; currency: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[10px] font-black text-slate-400">إجمالي الربح من كل الأنشطة</p>
      <p className="mt-2 font-numeric text-2xl font-black">{formatCurrency(grossProfit, currency)}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center"><MiniDark label="المبيعات" value={formatCurrency(totalSales, currency)} /><MiniDark label="التكاليف" value={formatCurrency(directCosts, currency)} /><MiniDark label="المصروفات" value={formatCurrency(expenses, currency)} /></div>
      <p className="mt-4 text-[9px] font-bold leading-4 text-slate-400">المصروفات لا تُطرح من مجمل الربح هنا؛ تُطرح في صافي الربح.</p>
    </Link>
  );
}

function MiniDark({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/5 p-2"><p className="text-[8px] font-black text-slate-500">{label}</p><p className="mt-1 break-words font-numeric text-[10px] font-black text-white">{value}</p></div>;
}
