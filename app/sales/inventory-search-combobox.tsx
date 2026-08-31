"use client";

import { Loader2, PackageSearch, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { searchInventoryForSaleAction } from "./actions";

export type SaleInventoryOption = {
  id: string;
  name: string;
  sku: string | null;
  category?: string | null;
  quantity: number;
  unitPrice: string;
};

export function InventorySearchCombobox({
  value,
  selectedLabel,
  initialOptions,
  onSelect,
}: {
  value: string;
  selectedLabel: string;
  initialOptions: SaleInventoryOption[];
  onSelect: (item: SaleInventoryOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SaleInventoryOption[]>(initialOptions.slice(0, 20));
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      requestId.current += 1;
      setResults(initialOptions.slice(0, 20));
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          const matches = await searchInventoryForSaleAction(trimmed);
          if (requestId.current === currentRequest) setResults(matches);
        } catch {
          if (requestId.current === currentRequest) setResults([]);
        }
      });
    }, 140);

    return () => window.clearTimeout(timer);
  }, [query, initialOptions]);

  const displayValue = open ? query : value ? selectedLabel : "";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-10 w-full rounded-md border bg-background pr-9 pl-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={displayValue}
          placeholder="ابحث بالاسم، SKU أو التصنيف..."
          autoComplete="off"
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
            aria-label="إلغاء اختيار قطعة المخزون"
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

      {open ? (
        <div className="absolute z-50 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-xs font-bold text-slate-600 hover:bg-slate-50"
            onClick={() => {
              onSelect(null);
              setQuery("");
              setOpen(false);
            }}
          >
            <PackageSearch className="h-4 w-4 text-slate-400" />
            بند يدوي / خدمة خارجية
          </button>

          <div className="my-1 border-t border-slate-100" />

          {results.length === 0 && !isPending ? (
            <div className="px-3 py-6 text-center text-xs font-semibold text-slate-400">
              لا توجد قطعة مطابقة للبحث.
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-primary/5",
                  item.id === value && "bg-primary/5",
                )}
                onClick={() => {
                  onSelect(item);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-slate-800">{item.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-400">
                    {item.sku ? <span className="font-numeric">SKU: {item.sku}</span> : null}
                    {item.category ? <span>{item.category}</span> : null}
                  </div>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-[10px] font-black font-numeric",
                  item.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                )}>
                  المتاح: {item.quantity}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
