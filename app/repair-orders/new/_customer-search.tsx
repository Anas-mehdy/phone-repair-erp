"use client";

import { Loader2, Search, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { searchCustomersForRepairAction } from "../actions";

export type RepairCustomerOption = {
  id: string;
  name: string;
  phone: string | null;
};

export function RepairCustomerSearch({
  value,
  selectedCustomer,
  onSelect,
  disabled = false,
}: {
  value: string;
  selectedCustomer: RepairCustomerOption | null;
  onSelect: (customer: RepairCustomerOption | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<RepairCustomerOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      requestId.current += 1;
      setResults([]);
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const matches = await searchCustomersForRepairAction(trimmed);
          if (requestId.current === currentRequest) setResults(matches);
        } catch {
          if (requestId.current === currentRequest) setResults([]);
        }
      });
    }, 140);

    return () => window.clearTimeout(timer);
  }, [query]);

  const displayValue = open ? query : selectedCustomer?.name ?? "";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-10 w-full rounded-md border bg-background pr-9 pl-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={displayValue}
          placeholder="ابحث باسم العميل أو رقم الهاتف..."
          autoComplete="off"
          disabled={disabled}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
        {isPending ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        ) : value ? (
          <button
            type="button"
            aria-label="إلغاء اختيار العميل"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => {
              onSelect(null);
              setQuery("");
              setOpen(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
          {!query.trim() ? (
            <div className="px-3 py-5 text-center text-xs font-semibold text-slate-400">اكتب اسم العميل أو رقم هاتفه للبحث.</div>
          ) : results.length === 0 && !isPending ? (
            <div className="px-3 py-5 text-center text-xs font-semibold text-slate-400">لا يوجد عميل مطابق. أكمل إدخال بيانات عميل جديد أدناه.</div>
          ) : (
            results.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-primary/5",
                  customer.id === value && "bg-primary/5",
                )}
                onClick={() => {
                  onSelect(customer);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-slate-800">{customer.name}</div>
                    {customer.phone ? (
                      <div className="mt-0.5 text-[10px] font-semibold text-slate-400 font-numeric" dir="ltr">{customer.phone}</div>
                    ) : (
                      <div className="mt-0.5 text-[10px] font-semibold text-amber-500">لا يوجد رقم هاتف محفوظ</div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
