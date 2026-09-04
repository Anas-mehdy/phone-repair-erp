"use client";

import { CalendarDays } from "lucide-react";

export function CurrentMonthFilter({ checked }: { checked: boolean; monthStart?: string; monthEnd?: string }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-200/70 bg-teal-50/50 px-4 py-3 text-xs font-black text-teal-950 transition hover:border-teal-300 hover:bg-teal-50 dark:border-teal-900/70 dark:bg-teal-950/25 dark:text-teal-100 dark:hover:border-teal-800 dark:hover:bg-teal-950/40">
      <input
        type="checkbox"
        name="currentMonth"
        value="1"
        defaultChecked={checked}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-teal-600"
      />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm ring-1 ring-teal-100 dark:bg-slate-900 dark:text-teal-300 dark:ring-teal-900/70">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block">إظهار تذاكر الشهر الحالي فقط</span>
        <span className="mt-0.5 block text-[10px] font-semibold text-teal-700/80 dark:text-teal-300/75">
          الشهر يُحسب حسب توقيت بلد المتجر
        </span>
      </span>
    </label>
  );
}
