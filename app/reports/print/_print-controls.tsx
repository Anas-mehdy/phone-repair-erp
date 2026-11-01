"use client";

import { ArrowRight, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function PrintControls({ title }: { title: string }) {
  const router = useRouter();
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
  async function print() {
    setPrinting(true);
    try {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      window.print();
    } finally { setPrinting(false); }
  }
  return (
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
        <ArrowRight className="h-4 w-4" /> رجوع
      </button>
      <div className="text-center">
        <p className="text-sm font-black text-slate-900">نسخة PDF / الطباعة</p>
        <p className="text-sm font-semibold text-slate-500">راجع التقرير، ثم اختر «حفظ بتنسيق PDF» من نافذة الطباعة. المقاس A4.</p>
      </div>
      <button type="button" onClick={print} disabled={printing} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
        <Printer className="h-4 w-4" /> {printing ? "جارٍ تجهيز الخطوط..." : "طباعة / حفظ PDF"}
      </button>
    </div>
  );
}
