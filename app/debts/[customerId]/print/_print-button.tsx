"use client";

import { Printer } from "lucide-react";

export function PrintStatementButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800"
    >
      <Printer className="h-4 w-4" /> طباعة / حفظ PDF
    </button>
  );
}
