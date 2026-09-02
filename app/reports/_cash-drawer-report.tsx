"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, CircleDollarSign } from "lucide-react";
import { useSearchParams } from "next/navigation";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveRange(params: URLSearchParams) {
  const now = new Date();
  const end = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
  const preset = params.get("preset") || "month";
  if (preset === "today") return { start: addDays(end, -1), end };
  if (preset === "week") return { start: addDays(end, -7), end };
  if (preset === "year") return { start: new Date(now.getFullYear(), 0, 1), end };
  if (preset === "custom") {
    const startRaw = params.get("start");
    const endRaw = params.get("end");
    if (startRaw && endRaw) {
      const start = new Date(`${startRaw}T00:00:00`);
      const customEnd = addDays(new Date(`${endRaw}T00:00:00`), 1);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(customEnd.getTime()) && start < customEnd) return { start, end: customEnd };
    }
  }
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
}

function money(value: number) {
  return new Intl.NumberFormat("ar", { maximumFractionDigits: 2 }).format(value);
}

type Snapshot = { currentBalance: number; openingBalance: number; inflow: number; outflow: number; netMovement: number };

export function CashDrawerReportPanel() {
  const params = useSearchParams();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);
  const range = useMemo(() => resolveRange(params), [params]);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(`/api/cash-drawer/report?start=${encodeURIComponent(range.start.toISOString())}&end=${encodeURIComponent(range.end.toISOString())}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setData(payload))
      .catch((requestError) => { if (requestError?.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [range]);

  return (
    <section className="mt-7 overflow-hidden rounded-[22px] border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/45 shadow-[0_18px_50px_-38px_rgba(5,150,105,.35)]">
      <div className="flex items-start gap-3 border-b border-emerald-100 bg-gradient-to-l from-emerald-50 via-white to-teal-50 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Banknote className="h-5 w-5" /></span>
        <div><h3 className="text-[18px] font-black text-slate-900">حركة الدرج النقدي</h3><p className="mt-1 text-[14px] font-semibold text-slate-500">تعكس نفس الفترة المختارة أعلاه. هذه حركة سيولة ولا تُضاف تلقائياً إلى الربح.</p></div>
      </div>
      {error ? <div className="p-5 text-sm font-bold text-rose-600">تعذر تحميل حركة الدرج حالياً.</div> : !data ? <div className="p-5 text-sm font-bold text-slate-400">جاري تحميل حركة الدرج...</div> : (
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <Card label="الرصيد الحالي" value={data.currentBalance} icon={CircleDollarSign} cls="border-emerald-100 bg-emerald-50 text-emerald-700" />
          <Card label="دخول خلال الفترة" value={data.inflow} icon={ArrowDownLeft} cls="border-cyan-100 bg-cyan-50 text-cyan-700" />
          <Card label="خروج خلال الفترة" value={data.outflow} icon={ArrowUpRight} cls="border-rose-100 bg-rose-50 text-rose-700" />
          <Card label="صافي حركة الدرج" value={data.netMovement} icon={Banknote} cls={data.netMovement >= 0 ? "border-indigo-100 bg-indigo-50 text-indigo-700" : "border-amber-100 bg-amber-50 text-amber-700"} />
        </div>
      )}
    </section>
  );
}

function Card({ label, value, icon: Icon, cls }: { label: string; value: number; icon: typeof Banknote; cls: string }) {
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="flex items-center justify-between"><span className="text-[14px] font-black">{label}</span><Icon className="h-5 w-5" /></div><div className="mt-3 font-numeric text-[22px] font-black text-slate-950">{money(value)}</div></div>;
}
