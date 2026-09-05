"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type RepairInventorySearchOption = {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: string | number;
  unitCost: string | number | null;
};

export function RepairInventorySearchCombobox({
  value,
  selectedLabel,
  items,
  disabled = false,
  onSelect,
}: {
  value: string;
  selectedLabel: string;
  items: RepairInventorySearchOption[];
  disabled?: boolean;
  onSelect: (inventoryItemId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matchingItems = normalizedQuery
      ? items.filter((item) => {
          const searchable = `${item.name} ${item.sku ?? ""}`.toLocaleLowerCase();
          return searchable.includes(normalizedQuery);
        })
      : items;

    return matchingItems.slice(0, 20);
  }, [items, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  function finishSelection(inventoryItemId: string) {
    onSelect(inventoryItemId);
    setQuery("");
    setOpen(false);
    setHighlightedIndex(0);
  }

  const displayValue = open ? query : value ? selectedLabel : "";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-10 w-full rounded-md border bg-background pr-9 pl-9 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60"
          value={displayValue}
          disabled={disabled}
          placeholder="ابحث باسم القطعة أو SKU..."
          autoComplete="off"
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setHighlightedIndex(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              if (open && results.length > 0) finishSelection(results[highlightedIndex]?.id ?? results[0].id);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setHighlightedIndex((current) => results.length ? (current + 1) % results.length : 0);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setHighlightedIndex((current) => results.length ? (current - 1 + results.length) % results.length : 0);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        />

        {value && !disabled ? (
          <button
            type="button"
            aria-label="إلغاء اختيار قطعة المخزون"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => finishSelection("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs font-semibold text-slate-400">
              لا توجد قطعة مطابقة للبحث.
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-right",
                  index === highlightedIndex ? "bg-teal-50 ring-1 ring-teal-100" : "hover:bg-teal-50/70",
                  item.id === value && "bg-teal-50",
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => finishSelection(item.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-slate-800">{item.name}</div>
                  {item.sku ? (
                    <div className="mt-1 text-[10px] font-semibold text-slate-400 font-numeric">SKU: {item.sku}</div>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-1 text-[10px] font-black font-numeric",
                    item.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                  )}
                >
                  المتاح: {item.quantity}
                </span>
              </button>
            ))
          )}

          {items.length > 20 && !query.trim() ? (
            <div className="border-t border-slate-100 px-3 py-2 text-center text-[10px] font-semibold text-slate-400">
              اكتب للبحث ضمن {items.length} منتجاً في المخزون.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
