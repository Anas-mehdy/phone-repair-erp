import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardTone = "brand" | "info" | "support" | "warning" | "success" | "danger" | "neutral";

const toneStyles: Record<DashboardTone, { card: string; icon: string; value: string; badge: string }> = {
  brand: {
    card: "border-teal-100 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/70",
    icon: "bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-teal-600/15",
    value: "text-teal-950",
    badge: "border-teal-100 bg-teal-50 text-teal-700",
  },
  info: {
    card: "border-cyan-100 bg-gradient-to-br from-cyan-50/75 to-white",
    icon: "bg-cyan-100 text-cyan-700",
    value: "text-cyan-950",
    badge: "border-cyan-100 bg-cyan-50 text-cyan-700",
  },
  support: {
    card: "border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white",
    icon: "bg-indigo-100 text-indigo-700",
    value: "text-indigo-950",
    badge: "border-indigo-100 bg-indigo-50 text-indigo-700",
  },
  warning: {
    card: "border-amber-100 bg-gradient-to-br from-amber-50/80 to-white",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-950",
    badge: "border-amber-100 bg-amber-50 text-amber-700",
  },
  success: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50/75 to-white",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-950",
    badge: "border-emerald-100 bg-emerald-50 text-emerald-700",
  },
  danger: {
    card: "border-rose-100 bg-gradient-to-br from-rose-50/75 to-white",
    icon: "bg-rose-100 text-rose-700",
    value: "text-rose-950",
    badge: "border-rose-100 bg-rose-50 text-rose-700",
  },
  neutral: {
    card: "border-slate-200 bg-gradient-to-br from-slate-50/90 to-white",
    icon: "bg-slate-100 text-slate-600",
    value: "text-slate-950",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

export function DashboardStatCard({ href, label, helper, value, icon: Icon, tone = "brand" }: { href: string; label: string; helper: string; value: ReactNode; icon: LucideIcon; tone?: DashboardTone }) {
  const styles = toneStyles[tone];
  return (
    <Link href={href} className={cn("group flex min-h-[158px] flex-col justify-between rounded-[18px] border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-100", styles.card)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[16px] font-black text-slate-800 transition group-hover:text-teal-800">{label}</p>
          <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-500">{helper}</p>
        </div>
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm", styles.icon)}><Icon className="h-5 w-5" /></span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className={cn("font-numeric text-[28px] font-black tracking-tight", styles.value)}>{value}</p>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] font-black", styles.badge)}>فتح القسم <ArrowUpRight className="h-3.5 w-3.5" /></span>
      </div>
    </Link>
  );
}

export function DashboardSection({ title, description, icon: Icon, children, actions, className }: { title: string; description?: string; icon: LucideIcon; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("masar-surface overflow-hidden", className)}>
      <div className="masar-section-header">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/15"><Icon className="h-5 w-5" /></span>
          <div><h2 className="masar-section-title">{title}</h2>{description ? <p className="masar-section-description">{description}</p> : null}</div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DashboardAttentionCard({ title, description, href, action, tone = "warning" }: { title: string; description: ReactNode; href: string; action: string; tone?: "success" | "warning" | "danger" }) {
  const styles = toneStyles[tone];
  return (
    <article className={cn("flex min-h-[178px] flex-col justify-between rounded-2xl border p-5 shadow-sm", styles.card)}>
      <div>
        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[14px] font-black", styles.badge)}>{title}</span>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-slate-700">{description}</p>
      </div>
      <Button asChild variant="outline" className="mt-4 h-10 w-fit rounded-xl border-white/80 bg-white px-4 text-[14px] font-black text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">
        <Link href={href}>{action}<ChevronLeft className="mr-1 h-4 w-4" /></Link>
      </Button>
    </article>
  );
}

export function DashboardActivityCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="masar-surface h-full overflow-hidden">
      <div className="flex items-center gap-3 border-b border-teal-100/70 bg-gradient-to-l from-teal-50/80 via-white to-cyan-50/60 px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-4.5 w-4.5" /></span>
        <h3 className="text-[17px] font-black text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

export function DashboardActivityItem({ href, title, description, meta }: { href: string; title: string; description: string; meta: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-slate-200/80 bg-slate-50/55 p-3.5 transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-sm">
      <div className="flex items-center justify-between gap-3"><p className="font-numeric text-[15px] font-black text-slate-900">{title}</p><span className="shrink-0 font-numeric text-[13px] font-bold text-slate-400">{meta}</span></div>
      <p className="mt-1 line-clamp-1 text-[14px] font-semibold leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

export function DashboardEmptyActivity({ href, label }: { href: string; label: string }) {
  return (
    <div className="masar-empty-state min-h-36 p-5"><p className="text-[15px] font-semibold text-slate-500">لا توجد عمليات مؤخراً.</p><Button asChild variant="outline" className="mt-3 h-9 rounded-xl border-teal-200 bg-white px-3.5 text-[14px] font-black text-teal-700 hover:bg-teal-50"><Link href={href}>{label}</Link></Button></div>
  );
}

export function DashboardQuickAction({ href, title, description, icon: Icon, tone = "brand" }: { href: string; title: string; description: string; icon: LucideIcon; tone?: DashboardTone }) {
  const styles = toneStyles[tone];
  return (
    <Link href={href} className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/85 p-3.5 transition hover:-translate-x-0.5 hover:border-teal-200 hover:bg-teal-50/55">
      <div className="flex items-center gap-3"><span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", styles.icon)}><Icon className="h-4.5 w-4.5" /></span><div><p className="text-[15px] font-black text-slate-900 transition group-hover:text-teal-800">{title}</p><p className="mt-0.5 text-[13px] font-semibold text-slate-500">{description}</p></div></div>
      <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-teal-700" />
    </Link>
  );
}
