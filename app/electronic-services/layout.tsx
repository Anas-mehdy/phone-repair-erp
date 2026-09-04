import type { ReactNode } from "react";
import { BarChart3, Layers3, Play, Scale, WalletCards } from "lucide-react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/context";

export default async function ElectronicServicesLayout({ children }: { children: ReactNode }) {
  const auth = await requirePermission("electronic_services:read");
  const canExecute = auth.permissions.includes("electronic_services:execute");
  const canManage = auth.permissions.includes("electronic_services:manage");
  const canReports = auth.permissions.includes("reports:read");

  return <div>
    <nav className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85" aria-label="تنقل الخدمات الإلكترونية">
      <Link href="/electronic-services" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-slate-600 transition hover:bg-teal-50 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-teal-950/30 dark:hover:text-teal-300"><WalletCards className="h-3.5 w-3.5" />المزودون والأرصدة</Link>
      {canExecute ? <Link href="/electronic-services/new" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-l from-teal-600 to-cyan-600 px-3 text-[10px] font-black text-white shadow-sm"><Play className="h-3.5 w-3.5" />تنفيذ خدمة</Link> : null}
      {canManage ? <Link href="/electronic-services/templates" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"><Layers3 className="h-3.5 w-3.5" />الخدمات المحفوظة</Link> : null}
      {canManage ? <Link href="/electronic-services/reconcile" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/30"><Scale className="h-3.5 w-3.5" />مطابقة الأرصدة</Link> : null}
      {canReports ? <Link href="/electronic-services/reports" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/30"><BarChart3 className="h-3.5 w-3.5" />التقارير</Link> : null}
    </nav>
    {children}
  </div>;
}
