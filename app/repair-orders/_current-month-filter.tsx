"use client";

import { CalendarDays } from "lucide-react";
import { useRef } from "react";

export function CurrentMonthFilter({
  checked,
  monthStart,
  monthEnd,
}: {
  checked: boolean;
  monthStart?: string;
  monthEnd?: string;
}) {
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  const submitWithCurrentMonth = (enabled: boolean, checkbox: HTMLInputElement) => {
    const startInput = startRef.current;
    const endInput = endRef.current;

    if (enabled) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      if (startInput) {
        startInput.disabled = false;
        startInput.value = start.toISOString();
      }
      if (endInput) {
        endInput.disabled = false;
        endInput.value = end.toISOString();
      }
    } else {
      if (startInput) startInput.disabled = true;
      if (endInput) endInput.disabled = true;
    }

    checkbox.form?.requestSubmit();
  };

  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-teal-200/70 bg-teal-50/50 px-4 py-3 text-xs font-black text-teal-950 transition hover:border-teal-300 hover:bg-teal-50 dark:border-teal-900/70 dark:bg-teal-950/25 dark:text-teal-100 dark:hover:border-teal-800 dark:hover:bg-teal-950/40">
      <input
        type="checkbox"
        name="currentMonth"
        value="1"
        defaultChecked={checked}
        onChange={(event) => submitWithCurrentMonth(event.currentTarget.checked, event.currentTarget)}
        className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-teal-600"
      />
      <input ref={startRef} type="hidden" name="monthStart" defaultValue={monthStart ?? ""} disabled={!checked} />
      <input ref={endRef} type="hidden" name="monthEnd" defaultValue={monthEnd ?? ""} disabled={!checked} />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700 shadow-sm ring-1 ring-teal-100 dark:bg-slate-900 dark:text-teal-300 dark:ring-teal-900/70">
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block">إظهار تذاكر الشهر الحالي فقط</span>
        <span className="mt-0.5 block text-[10px] font-semibold text-teal-700/80 dark:text-teal-300/75">
          عند إلغاء التحديد ستظهر جميع التذاكر من كل الأشهر
        </span>
      </span>
    </label>
  );
}
