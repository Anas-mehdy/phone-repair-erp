"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type MetricKey = "balances" | "commission" | "deposits" | "withdrawals" | "operations";
type TabKey = "service" | "user" | "direction" | "all";

type WalletItem = {
  id: string;
  name: string;
  balance: number;
  monthlyLimit: number | null;
  monthlyUsed: number;
};

type OperationItem = {
  id: string;
  walletName: string;
  userName: string;
  customerName: string | null;
  operationType: "CUSTOMER_DEPOSIT" | "CUSTOMER_WITHDRAWAL";
  amount: number;
  commission: number;
  createdAt: string;
};

type Stats = {
  totalBalance: number;
  todayCommission: number;
  todayDeposits: number;
  todayWithdrawals: number;
  todayOperations: number;
};

const titles: Record<MetricKey, string> = {
  balances: "إجمالي الأرصدة",
  commission: "عمولة اليوم",
  deposits: "إيداعات اليوم",
  withdrawals: "سحوبات اليوم",
  operations: "عمليات اليوم",
};

const directionLabel = {
  CUSTOMER_DEPOSIT: "إيداع للعميل",
  CUSTOMER_WITHDRAWAL: "سحب للعميل",
} as const;

export function TransferStatsCards({
  stats,
  wallets,
  operations,
  currency,
}: {
  stats: Stats;
  wallets: WalletItem[];
  operations: OperationItem[];
  currency: string;
}) {
  const [metric, setMetric] = useState<MetricKey | null>(null);
  const [tab, setTab] = useState<TabKey>("service");

  const cards = [
    { key: "balances" as const, label: "إجمالي الأرصدة", value: money(stats.totalBalance, currency), icon: WalletCards },
    { key: "commission" as const, label: "عمولة اليوم", value: money(stats.todayCommission, currency), icon: Banknote },
    { key: "deposits" as const, label: "إيداعات اليوم", value: money(stats.todayDeposits, currency), icon: ArrowDownLeft },
    { key: "withdrawals" as const, label: "سحوبات اليوم", value: money(stats.todayWithdrawals, currency), icon: ArrowUpRight },
    { key: "operations" as const, label: "عمليات اليوم", value: String(stats.todayOperations), icon: ArrowLeftRight },
  ];

  const filtered = useMemo(() => {
    if (metric === "deposits") return operations.filter((row) => row.operationType === "CUSTOMER_DEPOSIT");
    if (metric === "withdrawals") return operations.filter((row) => row.operationType === "CUSTOMER_WITHDRAWAL");
    return operations;
  }, [metric, operations]);

  const grouped = useMemo(() => {
    if (!metric || metric === "balances" || tab === "all") return [];
    const groups = new Map<string, { label: string; count: number; amount: number; commission: number }>();
    for (const row of filtered) {
      const label = tab === "service"
        ? row.walletName
        : tab === "user"
          ? row.userName
          : directionLabel[row.operationType];
      const current = groups.get(label) ?? { label, count: 0, amount: 0, commission: 0 };
      current.count += 1;
      current.amount += row.amount;
      current.commission += row.commission;
      groups.set(label, current);
    }
    return [...groups.values()].sort((a, b) => metric === "commission" ? b.commission - a.commission : b.amount - a.amount);
  }, [filtered, metric, tab]);

  function open(key: MetricKey) {
    setMetric(key);
    setTab("service");
  }

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => open(card.key)}
              className="erp-card group p-4 text-right transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-200"
              title="اضغط لعرض التفاصيل"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[11px] font-black">{card.label}</span>
                <Icon className="h-4 w-4 text-teal-600 transition group-hover:scale-110" aria-hidden="true" />
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="font-numeric text-lg font-black text-slate-950">{card.value}</p>
                <span className="text-[9px] font-bold text-slate-400 opacity-0 transition group-hover:opacity-100">التفاصيل</span>
              </div>
            </button>
          );
        })}
      </section>

      {metric ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.currentTarget === event.target) setMetric(null); }}>
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="transfer-stat-title">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="transfer-stat-title" className="text-lg font-black text-slate-950">{titles[metric]}</h2>
                <p className="mt-1 text-[11px] font-bold text-slate-400">تفاصيل وتحليل مباشر لبيانات اليوم</p>
              </div>
              <button type="button" onClick={() => setMetric(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200" aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>

            {metric === "balances" ? (
              <BalancesView wallets={wallets} currency={currency} />
            ) : (
              <div className="p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap gap-2">
                  {([
                    ["service", "بالخدمة"],
                    ["user", "بالمستخدم"],
                    ["direction", "بالاتجاه"],
                    ["all", `كل العمليات (${filtered.length})`],
                  ] as Array<[TabKey, string]>).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`rounded-xl px-4 py-2 text-xs font-black transition ${tab === key ? "bg-teal-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div className="py-14 text-center text-sm font-bold text-slate-400">لا توجد بيانات اليوم.</div>
                ) : tab === "all" ? (
                  <OperationsTable rows={filtered} metric={metric} currency={currency} />
                ) : (
                  <GroupedTable rows={grouped} metric={metric} currency={currency} />
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function BalancesView({ wallets, currency }: { wallets: WalletItem[]; currency: string }) {
  const total = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  return (
    <div className="p-5 sm:p-6">
      {wallets.length === 0 ? (
        <div className="py-12 text-center text-sm font-bold text-slate-400">لا توجد محافظ مضافة.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[640px] w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">المحفظة</th><th className="px-4 py-3">النوع</th><th className="px-4 py-3">الحد الشهري</th><th className="px-4 py-3">استخدام الشهر</th><th className="px-4 py-3">الرصيد</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {wallets.map((wallet) => <tr key={wallet.id}><td className="px-4 py-3 font-black text-slate-800">{wallet.name}</td><td className="px-4 py-3 font-bold text-slate-500">محفظة تحويل</td><td className="px-4 py-3 font-numeric font-bold">{wallet.monthlyLimit == null ? "—" : money(wallet.monthlyLimit, currency)}</td><td className="px-4 py-3 font-numeric font-bold">{money(wallet.monthlyUsed, currency)}</td><td className="px-4 py-3 font-numeric font-black text-teal-700">{money(wallet.balance, currency)}</td></tr>)}
            </tbody>
            <tfoot className="bg-slate-50"><tr><td colSpan={4} className="px-4 py-3 font-black text-slate-700">{wallets.length} محفظة</td><td className="px-4 py-3 font-numeric font-black text-slate-950">الإجمالي: {money(total, currency)}</td></tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupedTable({ rows, metric, currency }: { rows: Array<{ label: string; count: number; amount: number; commission: number }>; metric: MetricKey; currency: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[560px] w-full text-right text-xs">
        <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">التصنيف</th><th className="px-4 py-3">العمليات</th><th className="px-4 py-3">إجمالي المبالغ</th><th className="px-4 py-3">العمولة</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => <tr key={row.label}><td className="px-4 py-3 font-black text-slate-800">{row.label}</td><td className="px-4 py-3 font-numeric font-bold">{row.count}</td><td className="px-4 py-3 font-numeric font-bold">{money(row.amount, currency)}</td><td className={`px-4 py-3 font-numeric font-black ${metric === "commission" ? "text-teal-700" : "text-slate-700"}`}>{money(row.commission, currency)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function OperationsTable({ rows, metric, currency }: { rows: OperationItem[]; metric: MetricKey; currency: string }) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200">
      <table className="min-w-[760px] w-full text-right text-xs">
        <thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">الخدمة</th><th className="px-4 py-3">الاتجاه</th><th className="px-4 py-3">المستخدم</th><th className="px-4 py-3">العميل</th><th className="px-4 py-3">المبلغ</th><th className="px-4 py-3">العمولة</th><th className="px-4 py-3">الوقت</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-black text-slate-800">{row.walletName}</td><td className="px-4 py-3 font-bold text-slate-600">{directionLabel[row.operationType]}</td><td className="px-4 py-3 font-bold text-slate-600">{row.userName}</td><td className="px-4 py-3 font-bold text-slate-500">{row.customerName || "—"}</td><td className="px-4 py-3 font-numeric font-black">{money(row.amount, currency)}</td><td className={`px-4 py-3 font-numeric font-black ${metric === "commission" ? "text-teal-700" : "text-slate-700"}`}>{money(row.commission, currency)}</td><td className="px-4 py-3 font-numeric font-bold text-slate-400">{new Date(row.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
  }
}
