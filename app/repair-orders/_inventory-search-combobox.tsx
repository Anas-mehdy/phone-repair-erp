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
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-md border border-input bg-background pr-9 pl-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            onClick={() => finishSelection("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/20">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs font-semibold text-muted-foreground">
              لا توجد قطعة مطابقة للبحث.
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-right transition",
                  index === highlightedIndex ? "bg-accent text-accent-foreground ring-1 ring-border" : "hover:bg-accent hover:text-accent-foreground",
                  item.id === value && "bg-accent text-accent-foreground",
                )}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => finishSelection(item.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-foreground">{item.name}</div>
                  {item.sku ? (
                    <div className="mt-1 text-[10px] font-semibold text-muted-foreground font-numeric">SKU: {item.sku}</div>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-1 text-[10px] font-black font-numeric",
                    item.quantity > 0
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300",
                  )}
                >
                  المتاح: {item.quantity}
                </span>
              </button>
            ))
          )}

          {items.length > 20 && !query.trim() ? (
            <div className="border-t border-border px-3 py-2 text-center text-[10px] font-semibold text-muted-foreground">
              اكتب للبحث ضمن {items.length} منتجاً في المخزون.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
