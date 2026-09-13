import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { formatCurrency } from "@/lib/format";

export type Tone = "indigo" | "emerald" | "amber" | "rose" | "teal" | "orange" | "slate";

const toneClasses: Record<Tone, string> = {
  indigo: "border-indigo-100 bg-indigo-50/80 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-300",
  emerald: "border-emerald-100 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300",
  amber: "border-amber-100 bg-amber-50/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300",
  rose: "border-rose-100 bg-rose-50/80 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300",
  teal: "border-teal-100 bg-teal-50/80 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/20 dark:text-teal-300",
  orange: "border-orange-100 bg-orange-50/80 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/20 dark:text-orange-300",
  slate: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

export function ReportSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-black text-primary">{eyebrow}</p>
        <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">{title}</h2>
        <p className="text-[11px] font-bold leading-5 text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function SummaryCard({ label, helper, value, icon: Icon, tone, href, featured = false }: {
  label: string;
  helper: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  href: string;
  featured?: boolean;
}) {
  return (
    <Link href={href} className={`group rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${featured ? "ring-2 ring-emerald-500/15" : ""} ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black opacity-80">{label}</p>
          <p className="mt-2 break-words font-numeric text-xl font-black text-slate-950 dark:text-slate-50">{value}</p>
          <p className="mt-2 text-[9px] font-bold leading-4 opacity-70">{helper}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/75 shadow-sm ring-1 ring-black/[0.04] dark:bg-slate-950/40"><Icon className="h-5 w-5" /></span>
      </div>
    </Link>
  );
}

export function BalanceCard({ label, value, currency, icon: Icon, helper, href, emphasized = false }: { label: string; value: number; currency: string; icon: LucideIcon; helper: string; href: string; emphasized?: boolean }) {
  return (
    <Link href={href} className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${emphasized ? "border-teal-200 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black text-slate-500">{label}</p><p className="mt-2 font-numeric text-xl font-black text-slate-950 dark:text-slate-50">{formatCurrency(value, currency)}</p><p className="mt-2 text-[9px] font-bold text-slate-400">{helper}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"><Icon className="h-5 w-5" /></span></div>
    </Link>
  );
}

export function StatusCard({ label, value, currency, icon: Icon, helper, href, tone }: { label: string; value: number; currency: string; icon: LucideIcon; helper: string; href: string; tone: Tone }) {
  return (
    <Link href={href} className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black">{label}</p><p className="mt-2 font-numeric text-xl font-black text-slate-950 dark:text-slate-50">{formatCurrency(value, currency)}</p><p className="mt-2 text-[9px] font-bold opacity-70">{helper}</p></div><Icon className="h-5 w-5" /></div>
    </Link>
  );
}

export function BreakdownCard({ title, description, items, max, currency, empty }: { title: string; description: string; items: Array<{ label: string; value: number }>; max: number; currency: string; empty: string }) {
  return (
    <div className="erp-section">
      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-[10px] font-bold text-slate-400">{description}</p>
      <div className="mt-5 space-y-4">
        {items.length === 0 ? <p className="text-xs font-bold text-slate-400">{empty}</p> : items.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-xs"><span className="font-bold text-slate-600 dark:text-slate-300">{item.label}</span><span className="font-numeric font-black">{formatCurrency(item.value, currency)}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.min(100, (item.value / max) * 100))}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
