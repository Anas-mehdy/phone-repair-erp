"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Battery, Box, Check, ChevronLeft, Cpu, Layers,
  Loader2, Radio, Search, Smartphone, Tv, X, Zap,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";

interface DirectoryDevice {
  id: string;
  name: string;
}
interface DirectoryResult {
  id: string;
  groupId: string;
  deviceName: string;
  brandSection: string;
  compatibilityCount: number;
  compatibleDevices: DirectoryDevice[];
}

const CATEGORIES = [
  { id: "SCREEN", label: "الشاشات", description: "متاح الآن", icon: Tv, enabled: true },
  { id: "BATTERY", label: "البطاريات", description: "قريباً", icon: Battery, enabled: false },
  { id: "CHARGING_PORT", label: "منافذ الشحن", description: "قريباً", icon: Zap, enabled: false },
  { id: "CONNECTOR", label: "الفلاتات والموصلات", description: "قريباً", icon: Cpu, enabled: false },
  { id: "IC_CHIP", label: "الآيسيات", description: "قريباً", icon: Radio, enabled: false },
  { id: "HOUSING_FRAME", label: "الفريمات", description: "قريباً", icon: Box, enabled: false },
  { id: "OTHER", label: "قطع أخرى", description: "قريباً", icon: Layers, enabled: false },
];

export default function TechnicianCompatibilityPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryResult[]>([]);
  const [selected, setSelected] = useState<DirectoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const searchDirectory = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/compatibility/directory?q=${encodeURIComponent(trimmed)}&limit=30`,
        { signal: abortRef.current.signal }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر إتمام البحث.");
      setResults(Array.isArray(payload.results) ? payload.results : []);
    } catch (searchError) {
      if ((searchError as Error).name !== "AbortError") {
        setError((searchError as Error).message || "تعذر إتمام البحث.");
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchDirectory(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchDirectory]);

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <PageHeader
        title="دليل توافق القطع"
        description="ابحث عن موديل الجهاز لتعرف الأجهزة التي تستخدم الشاشة نفسها."
      />

      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <div className="text-sm font-black">الدليل ما يزال قيد التطوير</div>
          <p className="mt-0.5 text-xs font-medium leading-5 text-amber-800">
            استخدم النتائج كدليل مساعد، وطابق رقم موديل الشاشة قبل التركيب.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-black text-slate-900">نوع القطعة</h2>
          <p className="mt-0.5 text-xs font-medium text-slate-400">اختر القسم ثم ابحث عن الجهاز</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                disabled={!category.enabled}
                className={`rounded-xl border p-3 text-right transition ${
                  category.enabled
                    ? "border-violet-400 bg-violet-50 ring-1 ring-violet-100"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    category.enabled
                      ? "bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white"
                      : "bg-white text-slate-400"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {category.enabled && <Check className="h-4 w-4 text-violet-600" />}
                </div>
                <div className="mt-2 text-xs font-black text-slate-900">{category.label}</div>
                <div className="mt-0.5 text-[10px] font-bold text-slate-400">{category.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <label htmlFor="compatibility-search" className="mb-2 block text-xs font-black text-slate-700">
            ابحث داخل الشاشات
          </label>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-600" />
            <input
              id="compatibility-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
              placeholder="مثال: Note 11 أو A52 أو iPhone 12"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
              autoFocus
            />
            {loading ? (
              <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-600" />
            ) : query ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="مسح البحث"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        {query.trim().length >= 2 && !loading && !error && results.length === 0 && (
          <div className="p-10 text-center">
            <Smartphone className="mx-auto h-9 w-9 text-slate-300" />
            <div className="mt-3 text-sm font-black text-slate-700">لم نجد هذا الموديل</div>
            <div className="mt-1 text-xs font-medium text-slate-400">جرّب كتابة جزء أقصر من الاسم أو رقم الموديل.</div>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid min-h-[420px] lg:grid-cols-[310px_1fr]">
            <aside className="border-b border-slate-200 bg-slate-50/60 p-3 lg:border-b-0 lg:border-l">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="text-sm font-black text-slate-900">{results.length} نتيجة</div>
                <div className="text-[11px] font-bold text-slate-400">اختر جهازاً</div>
              </div>
              <div className="max-h-[520px] space-y-2 overflow-y-auto pl-1">
                {results.map((result) => {
                  const active = selected?.id === result.id;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => setSelected(result)}
                      className={`w-full rounded-xl border p-3 text-right transition ${
                        active
                          ? "border-violet-500 bg-gradient-to-l from-violet-50 to-fuchsia-50/60 shadow-sm"
                          : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[10px] font-bold text-violet-600">{result.brandSection}</div>
                          <div className="mt-0.5 truncate text-sm font-black text-slate-900">{result.deviceName}</div>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
                          <Smartphone className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="font-black text-violet-700">{result.compatibilityCount} أجهزة</span>
                        <ChevronLeft className="h-4 w-4 text-fuchsia-500" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="p-5 sm:p-7">
              {selected ? (
                <div>
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="text-xs font-bold text-violet-600">{selected.brandSection} • شاشات</div>
                      <h3 className="mt-1 text-2xl font-black text-slate-900">{selected.deviceName}</h3>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 px-4 py-2 text-center text-violet-700">
                      <div className="text-2xl font-black">{selected.compatibilityCount}</div>
                      <div className="text-[10px] font-bold">أجهزة</div>
                    </div>
                  </div>

                  <div className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
                        <Tv className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-base font-black text-slate-900">الأجهزة المتوافقة</h4>
                        <p className="text-xs font-medium text-slate-400">تستخدم مجموعة الشاشة نفسها</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {selected.compatibleDevices.map((device) => (
                        <div
                          key={device.id}
                          className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-violet-200 bg-gradient-to-l from-violet-50/80 to-fuchsia-50/40 px-3 py-2.5"
                        >
                          <span className="text-sm font-black text-slate-800">{device.name}</span>
                          <Check className="h-4 w-4 shrink-0 text-fuchsia-600" />
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium leading-6 text-slate-500">
                      قبل التركيب: قارن كود الشاشة والموصل والفريم مع القطعة القديمة.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[330px] flex-col items-center justify-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600">
                    <Smartphone className="h-7 w-7" />
                  </span>
                  <h3 className="mt-4 text-base font-black text-slate-800">اختر جهازاً من نتائج البحث</h3>
                  <p className="mt-1 max-w-sm text-xs font-medium leading-5 text-slate-400">
                    ستظهر هنا مباشرة جميع الأجهزة التي تستخدم الشاشة نفسها.
                  </p>
                </div>
              )}
            </main>
          </div>
        )}

        {!query && (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600">
              <Search className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-base font-black text-slate-800">اكتب اسم الجهاز للبدء</h3>
            <p className="mt-1 text-xs font-medium text-slate-400">يمكنك كتابة الاسم كاملاً أو جزءاً منه.</p>
          </div>
        )}
      </section>
    </div>
  );
}
