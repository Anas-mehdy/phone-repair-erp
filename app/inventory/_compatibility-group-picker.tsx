"use client";

import { Link2, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type DatasetKey =
  | "SCREEN"
  | "BATTERY"
  | "CHARGING_PORT"
  | "DISPLAY_CONNECTOR"
  | "POWER_FLEX"
  | "FRAME"
  | "BACK_COVER"
  | "TEMPERED_GLASS"
  | "TOUCH_GLASS";

export type CompatibilityGroupSelection = {
  groupId: string;
  brandSection: string;
  deviceName: string;
  compatibleDevices: { id: string; name: string }[];
  dataset: DatasetKey;
};

type SearchResult = Omit<CompatibilityGroupSelection, "dataset">;

const DATASETS: { value: DatasetKey; label: string }[] = [
  { value: "SCREEN", label: "شاشة" },
  { value: "BATTERY", label: "بطارية" },
  { value: "CHARGING_PORT", label: "منفذ شحن" },
  { value: "DISPLAY_CONNECTOR", label: "كونكتر شاشة" },
  { value: "POWER_FLEX", label: "فلاتة باور وصوت" },
  { value: "FRAME", label: "فريم" },
  { value: "BACK_COVER", label: "غطاء خلفي" },
  { value: "TEMPERED_GLASS", label: "لاصقة حماية" },
  { value: "TOUCH_GLASS", label: "زجاج لمس / OCA" },
];

export function CompatibilityGroupPicker({
  initialSelection,
}: {
  initialSelection?: CompatibilityGroupSelection | null;
}) {
  const [dataset, setDataset] = useState<DatasetKey>(initialSelection?.dataset || "SCREEN");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<CompatibilityGroupSelection | null>(initialSelection || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const controller = new AbortController();
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/compatibility/directory?q=${encodeURIComponent(query.trim())}&dataset=${dataset}&limit=12`,
          { signal: controller.signal },
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "تعذر البحث في دليل التوافقات.");
        setResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") {
          setError((searchError as Error).message || "تعذر البحث.");
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [dataset, query, selected]);

  function suggestFromItemName(button: HTMLButtonElement) {
    const form = button.closest("form");
    const nameInput = form?.querySelector<HTMLInputElement>('input[name="name"]');
    if (nameInput?.value.trim()) setQuery(nameInput.value.trim());
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-l from-violet-50/70 to-fuchsia-50/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-sm">
          <Link2 className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-black text-slate-900">ربط بدليل التوافقات</h3>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            اختياري — يتيح للنظام إظهار هذه القطعة وكميتها عند البحث عن أي جهاز متوافق معها.
          </p>
        </div>
      </div>

      {selected ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="compatibilityGroupIds" value={selected.groupId} />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black text-emerald-700">مرتبط بنجاح • {selected.brandSection}</div>
              <div className="mt-1 text-sm font-black text-slate-900">
                {selected.compatibleDevices.map((device) => device.name).join("، ")}
              </div>
              <div className="mt-2 text-[11px] font-medium text-slate-500">
                ستظهر القطعة في مخزون التوافقات لجميع هذه الأجهزة.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              aria-label="إلغاء الربط"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[190px_1fr_auto]">
            <select
              value={dataset}
              onChange={(event) => setDataset(event.target.value as DatasetKey)}
              className="erp-input"
            >
              {DATASETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute right-3 top-3.5 h-4 w-4 text-violet-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="erp-input pr-9"
                placeholder="ابحث عن الجهاز، مثال: Samsung A10"
              />
              {loading && <Loader2 className="absolute left-3 top-3.5 h-4 w-4 animate-spin text-violet-500" />}
            </div>
            <button
              type="button"
              onClick={(event) => suggestFromItemName(event.currentTarget)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 text-xs font-black text-violet-700 hover:bg-violet-50"
            >
              <Sparkles className="h-4 w-4" />
              اقتراح من الاسم
            </button>
          </div>

          {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
          {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
            <div className="rounded-lg bg-white/70 px-3 py-3 text-center text-xs font-medium text-slate-500">لم نجد مجموعة مطابقة. جرّب جزءًا أقصر من اسم الجهاز.</div>
          )}
          {results.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map((result) => (
                <button
                  key={result.groupId}
                  type="button"
                  onClick={() => setSelected({ ...result, dataset })}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-right hover:border-violet-400 hover:bg-violet-50"
                >
                  <div className="text-[10px] font-black text-violet-600">{result.brandSection}</div>
                  <div className="mt-1 text-xs font-black text-slate-900">
                    {result.compatibleDevices.map((device) => device.name).join("، ")}
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-slate-400">اضغط لاختيار هذه المجموعة</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
