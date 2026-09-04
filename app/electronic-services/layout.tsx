import type { ReactNode } from "react";
import { Layers3, Play, WalletCards } from "lucide-react";
import Link from "next/link";

export default function ElectronicServicesLayout({ children }: { children: ReactNode }) {
  return <div>
    <nav className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85" aria-label="تنقل الخدمات الإلكترونية">
      <Link href="/electronic-services" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-slate-600 transition hover:bg-teal-50 hover:text-teal-700 dark:text-slate-300 dark:hover:bg-teal-950/30 dark:hover:text-teal-300"><WalletCards className="h-3.5 w-3.5" />المزودون والأرصدة</Link>
      <Link href="/electronic-services/new" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-l from-teal-600 to-cyan-600 px-3 text-[10px] font-black text-white shadow-sm"><Play className="h-3.5 w-3.5" />تنفيذ خدمة</Link>
      <Link href="/electronic-services/templates" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"><Layers3 className="h-3.5 w-3.5" />الخدمات المحفوظة</Link>
    </nav>
    {children}
  </div>;
}
