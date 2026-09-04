"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, Sparkles, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";

type MetricKey = "balances" | "commission" | "deposits" | "withdrawals" | "operations";
type TabKey = "service" | "user" | "direction" | "all";
type WalletItem = { id: string; name: string; balance: number; monthlyLimit: number | null; monthlyUsed: number };
type OperationItem = { id: string; walletName: string; userName: string; customerName: string | null; operationType: "CUSTOMER_DEPOSIT" | "CUSTOMER_WITHDRAWAL"; amount: number; commission: number; createdAt: string };
type Stats = { totalBalance: number; todayCommission: number; todayDeposits: number; todayWithdrawals: number; todayOperations: number };

const titles: Record<MetricKey, string> = { balances: "إجمالي الأرصدة", commission: "عمولة اليوم", deposits: "إيداعات اليوم", withdrawals: "سحوبات اليوم", operations: "عمليات اليوم" };
const directionLabel = { CUSTOMER_DEPOSIT: "إيداع للعميل", CUSTOMER_WITHDRAWAL: "سحب للعميل" } as const;

export function TransferStatsCards({ stats, wallets, operations, currency, timeZone }: { stats: Stats; wallets: WalletItem[]; operations: OperationItem[]; currency: string; timeZone: string }) {
  const [metric, setMetric] = useState<MetricKey | null>(null);
  const [tab, setTab] = useState<TabKey>("service");

  const cards = [
    { key: "balances" as const, label: "إجمالي الأرصدة", value: money(stats.totalBalance, currency), helper: `${wallets.length} محفظة مفعلة`, icon: WalletCards, className: "xl:col-span-2 border-teal-200/80 bg-gradient-to-br from-teal-600 via-teal-600 to-cyan-600 text-white shadow-teal-600/20", labelClass: "text-teal-50", valueClass: "text-white", iconClass: "bg-white/15 text-white border-white/15" },
    { key: "commission" as const, label: "عمولة اليوم", value: money(stats.todayCommission, currency), helper: "صافي دخل التحويلات", icon: Banknote, className: "border-amber-100 bg-gradient-to-br from-amber-50 to-white", labelClass: "text-amber-700", valueClass: "text-amber-950", iconClass: "bg-amber-100 text-amber-700 border-amber-200" },
    { key: "deposits" as const, label: "إيداعات اليوم", value: money(stats.todayDeposits, currency), helper: "إجمالي المبالغ الداخلة", icon: ArrowDownLeft, className: "border-cyan-100 bg-gradient-to-br from-cyan-50 to-white", labelClass: "text-cyan-700", valueClass: "text-cyan-950", iconClass: "bg-cyan-100 text-cyan-700 border-cyan-200" },
    { key: "withdrawals" as const, label: "سحوبات اليوم", value: money(stats.todayWithdrawals, currency), helper: "إجمالي المبالغ الخارجة", icon: ArrowUpRight, className: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white", labelClass: "text-indigo-600", valueClass: "text-indigo-950", iconClass: "bg-indigo-100 text-indigo-600 border-indigo-200" },
    { key: "operations" as const, label: "عمليات اليوم", value: String(stats.todayOperations), helper: "عملية مسجلة اليوم", icon: ArrowLeftRight, className: "border-slate-200 bg-gradient-to-br from-slate-50 to-white", labelClass: "text-slate-500", valueClass: "text-slate-950", iconClass: "bg-white text-slate-600 border-slate-200" },
  ];

  const filtered = useMemo(() => metric === "deposits" ? operations.filter((row) => row.operationType === "CUSTOMER_DEPOSIT") : metric === "withdrawals" ? operations.filter((row) => row.operationType === "CUSTOMER_WITHDRAWAL") : operations, [metric, operations]);
  const grouped = useMemo(() => {
    if (!metric || metric === "balances" || tab === "all") return [];
    const groups = new Map<string, { label: string; count: number; amount: number; commission: number }>();
    for (const row of filtered) {
      const label = tab === "service" ? row.walletName : tab === "user" ? row.userName : directionLabel[row.operationType];
      const current = groups.get(label) ?? { label, count: 0, amount: 0, commission: 0 };
      current.count += 1; current.amount += row.amount; current.commission += row.commission; groups.set(label, current);
    }
    return [...groups.values()].sort((a, b) => metric === "commission" ? b.commission - a.commission : b.amount - a.amount);
  }, [filtered, metric, tab]);

  return <>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => { const Icon = card.icon; return <button key={card.key} type="button" onClick={() => { setMetric(card.key); setTab("service"); }} className={`group relative min-h-[132px] overflow-hidden rounded-2xl border p-4 text-right shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card.className}`}>
        {card.key === "balances" ? <div className="absolute -left-7 -top-8 h-28 w-28 rounded-full bg-white/10 blur-xl" /> : null}
        <div className="relative flex items-start justify-between gap-3"><div><p className={`text-[10px] font-black ${card.labelClass}`}>{card.label}</p><p className={`mt-2 font-numeric text-xl font-black tracking-tight ${card.valueClass}`}>{card.value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${card.iconClass}`}><Icon className="h-4 w-4" /></span></div>
        <div className="relative mt-4 flex items-center justify-between"><span className={`text-[9px] font-bold ${card.key === "balances" ? "text-teal-100" : "text-slate-400"}`}>{card.helper}</span><span className={`text-[9px] font-black opacity-0 transition group-hover:opacity-100 ${card.key === "balances" ? "text-white" : "text-teal-600"}`}>عرض التفاصيل</span></div>
      </button>; })}
    </section>

    {metric ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.currentTarget === event.target) setMetric(null); }}>
      <div className="w-full max-w-3xl overflow-hidden rounded-[24px] border border-teal-100 bg-white shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-teal-100 bg-gradient-to-l from-teal-50 via-white to-cyan-50 px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-base font-black text-slate-950">{titles[metric]}</h2><p className="mt-0.5 text-[10px] font-bold text-slate-400">تحليل مباشر لبيانات اليوم</p></div></div><button type="button" onClick={() => setMetric(null)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm hover:bg-slate-50"><X className="h-4 w-4" /></button></div>
        {metric === "balances" ? <BalancesView wallets={wallets} currency={currency} /> : <div className="p-5 sm:p-6"><div className="mb-5 flex flex-wrap gap-2">{([["service","حسب المحفظة"],["user","حسب المستخدم"],["direction","حسب الاتجاه"],["all",`كل العمليات (${filtered.length})`]] as Array<[TabKey,string]>).map(([key,label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-xl px-3.5 py-2 text-[10px] font-black transition ${tab === key ? "bg-teal-600 text-white shadow-md shadow-teal-600/15" : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"}`}>{label}</button>)}</div>{filtered.length === 0 ? <div className="py-14 text-center text-xs font-bold text-slate-400">لا توجد بيانات اليوم.</div> : tab === "all" ? <OperationsTable rows={filtered} metric={metric} currency={currency} timeZone={timeZone} /> : <GroupedTable rows={grouped} metric={metric} currency={currency} />}</div>}
      </div>
    </div> : null}
  </>;
}

function BalancesView({ wallets, currency }: { wallets: WalletItem[]; currency: string }) { const total = wallets.reduce((sum, wallet) => sum + wallet.balance, 0); return <div className="p-5 sm:p-6">{wallets.length === 0 ? <div className="py-12 text-center text-xs font-bold text-slate-400">لا توجد محافظ مضافة.</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[640px] w-full text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">المحفظة</th><th className="px-4 py-3">الحد الشهري</th><th className="px-4 py-3">استخدام الشهر</th><th className="px-4 py-3">الرصيد</th></tr></thead><tbody className="divide-y divide-slate-100">{wallets.map((wallet) => <tr key={wallet.id}><td className="px-4 py-3 font-black text-slate-800">{wallet.name}</td><td className="px-4 py-3 font-numeric font-bold">{wallet.monthlyLimit == null ? "—" : money(wallet.monthlyLimit, currency)}</td><td className="px-4 py-3 font-numeric font-bold">{money(wallet.monthlyUsed, currency)}</td><td className="px-4 py-3 font-numeric font-black text-teal-700">{money(wallet.balance, currency)}</td></tr>)}</tbody><tfoot className="bg-teal-50/60"><tr><td colSpan={3} className="px-4 py-3 font-black text-slate-700">{wallets.length} محفظة</td><td className="px-4 py-3 font-numeric font-black text-teal-800">{money(total, currency)}</td></tr></tfoot></table></div>}</div>; }
function GroupedTable({ rows, metric, currency }: { rows: Array<{ label: string; count: number; amount: number; commission: number }>; metric: MetricKey; currency: string }) { return <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-[560px] w-full text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">التصنيف</th><th className="px-4 py-3">العمليات</th><th className="px-4 py-3">إجمالي المبالغ</th><th className="px-4 py-3">العمولة</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.label}><td className="px-4 py-3 font-black text-slate-800">{row.label}</td><td className="px-4 py-3 font-numeric font-bold">{row.count}</td><td className="px-4 py-3 font-numeric font-bold">{money(row.amount, currency)}</td><td className={`px-4 py-3 font-numeric font-black ${metric === "commission" ? "text-amber-700" : "text-teal-700"}`}>{money(row.commission, currency)}</td></tr>)}</tbody></table></div>; }
function OperationsTable({ rows, metric, currency, timeZone }: { rows: OperationItem[]; metric: MetricKey; currency: string; timeZone: string }) { return <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200"><table className="min-w-[760px] w-full text-right text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">المحفظة</th><th className="px-4 py-3">الاتجاه</th><th className="px-4 py-3">المستخدم</th><th className="px-4 py-3">العميل</th><th className="px-4 py-3">المبلغ</th><th className="px-4 py-3">العمولة</th><th className="px-4 py-3">الوقت</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-black text-slate-800">{row.walletName}</td><td className="px-4 py-3 font-bold text-slate-600">{directionLabel[row.operationType]}</td><td className="px-4 py-3 font-bold text-slate-600">{row.userName}</td><td className="px-4 py-3 font-bold text-slate-500">{row.customerName || "—"}</td><td className="px-4 py-3 font-numeric font-black">{money(row.amount, currency)}</td><td className={`px-4 py-3 font-numeric font-black ${metric === "commission" ? "text-amber-700" : "text-teal-700"}`}>{money(row.commission, currency)}</td><td className="px-4 py-3 font-numeric font-bold text-slate-400">{new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(row.createdAt))}</td></tr>)}</tbody></table></div>; }
function money(value: number, currency: string) { try { return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); } catch { return `${new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(value)} ${currency}`; } }
