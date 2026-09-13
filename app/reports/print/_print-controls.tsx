"use client";

import { ArrowRight, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PrintControls() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
        <ArrowRight className="h-4 w-4" /> رجوع
      </button>
      <div className="text-center">
        <p className="text-sm font-black text-slate-900">نسخة PDF / الطباعة</p>
        <p className="text-[11px] font-semibold text-slate-500">اضغط حفظ كـ PDF من نافذة الطباعة.</p>
      </div>
      <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
        <Printer className="h-4 w-4" /> طباعة / حفظ PDF
      </button>
    </div>
  );
}
