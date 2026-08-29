"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Battery, Cable, Check, ChevronLeft, Frame,
  Loader2, PackageCheck, PanelsTopLeft, PlugZap, Radio, ScanLine, Search, ShieldCheck,
  SlidersHorizontal, Smartphone, Tv, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { EntitlementAlert } from "@/components/subscription/entitlement-alert";

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
  partCode: string | null;
  capacityMah: number | null;
  inventoryItems: {
    id: string;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    currency: string;
  }[];
}

type ActiveCategory =
  | "SCREEN" | "BATTERY" | "CHARGING_PORT" | "DISPLAY_CONNECTOR"
  | "POWER_FLEX" | "FRAME" | "BACK_COVER" | "TEMPERED_GLASS" | "TOUCH_GLASS";

interface CategoryMeta {
  id: ActiveCategory | "IC_CHIP";
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  searchExample: string;
  resultTitle: string;
  resultSubtitle: string;
  installWarning: string;
}

const CATEGORIES: CategoryMeta[] = [
  { id: "SCREEN", label: "الشاشات", description: "متاح", icon: Tv, enabled: true, searchExample: "Note 11 أو A52 أو iPhone 12", resultTitle: "الأجهزة المتوافقة", resultSubtitle: "تستخدم مجموعة الشاشة نفسها", installWarning: "قبل التركيب: قارن كود الشاشة والموصل والفريم مع القطعة القديمة." },
  { id: "BATTERY", label: "البطاريات", description: "متاح", icon: Battery, enabled: true, searchExample: "Vivo Y36 أو Redmi Note 11", resultTitle: "الأجهزة التي تستخدم هذه البطارية", resultSubtitle: "بحسب كود البطارية المسجل", installWarning: "قبل التركيب: طابق كود البطارية والفولت والموصل؛ السعة وحدها لا تكفي." },
  { id: "CHARGING_PORT", label: "منافذ الشحن", description: "متاح", icon: PlugZap, enabled: true, searchExample: "Redmi 10 أو Vivo Y20", resultTitle: "الأجهزة التي تستخدم منفذ الشحن نفسه", resultSubtitle: "تستخدم بوردة الشحن نفسها", installWarning: "قبل التركيب: قارن شكل البوردة والموصل والمايك والمكوّنات مع القطعة القديمة." },
  { id: "DISPLAY_CONNECTOR", label: "كونكترات الشاشة", description: "متاح", icon: Cable, enabled: true, searchExample: "Samsung A22 أو Redmi A1", resultTitle: "الأجهزة التي تستخدم الكونكتر نفسه", resultSubtitle: "ضمن مجموعة كونكتر الشاشة نفسها", installWarning: "قبل التركيب: طابق عدد الأرجل والاتجاه ومكان الكونكتر مع البوردة." },
  { id: "POWER_FLEX", label: "فلاتات الباور والصوت", description: "متاح", icon: SlidersHorizontal, enabled: true, searchExample: "Redmi Note 9 Pro أو Vivo Y20", resultTitle: "الأجهزة التي تستخدم الفلاتة نفسها", resultSubtitle: "ضمن مجموعة فلاتة الباور والصوت نفسها", installWarning: "قبل التركيب: قارن الموصل وطول الفلاتة وترتيب أزرار الباور والصوت." },
  { id: "FRAME", label: "الفريمات", description: "متاح", icon: Frame, enabled: true, searchExample: "Samsung A10 أو Redmi 8", resultTitle: "الأجهزة التي تستخدم الفريم نفسه", resultSubtitle: "ضمن مجموعة الفريم الأوسط نفسها", installWarning: "قبل التركيب: طابق فتحات الكاميرا والأزرار والكونكترات وأبعاد الفريم." },
  { id: "BACK_COVER", label: "الأغطية الخلفية", description: "متاح", icon: PanelsTopLeft, enabled: true, searchExample: "Poco X6 أو Samsung M55", resultTitle: "الأجهزة التي تستخدم الغطاء نفسه", resultSubtitle: "ضمن مجموعة الغطاء الخلفي نفسها", installWarning: "قبل التركيب: طابق فتحات الكاميرا والبصمة والأبعاد واللون المطلوب." },
  { id: "TEMPERED_GLASS", label: "لاصقات الحماية", description: "متاح", icon: ShieldCheck, enabled: true, searchExample: "Redmi 9 أو Vivo Y91", resultTitle: "الأجهزة التي تستخدم اللاصقة نفسها", resultSubtitle: "ضمن مجموعة قياس الحماية نفسها", installWarning: "قبل التركيب: قارن المقاس والحواف وفتحات الكاميرا والسماعة والحساسات." },
  { id: "TOUCH_GLASS", label: "زجاج اللمس / OCA", description: "متاح", icon: ScanLine, enabled: true, searchExample: "Moto G22 أو Vivo Y20", resultTitle: "الأجهزة التي تستخدم الزجاج نفسه", resultSubtitle: "ضمن مجموعة زجاج اللمس/OCA نفسها", installWarning: "قبل العمل: طابق المقاس والحواف والفتحات ونوع الشاشة؛ هذا القسم يحتاج خبرة صيانة شاشات." },
  { id: "IC_CHIP", label: "الآيسيات", description: "قريباً", icon: Radio, enabled: false, searchExample: "", resultTitle: "", resultSubtitle: "", installWarning: "" },
];

export default function TechnicianCompatibilityPage() {
  const [selectedCategory, setSelectedCategory] = useState<ActiveCategory>("SCREEN");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryResult[]>([]);
  const [selected, setSelected] = useState<DirectoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entitlementError, setEntitlementError] = useState<
    "SUBSCRIPTION_EXPIRED" | null
  >(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const searchDirectory = useCallback(async (value: string, category: ActiveCategory) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setEntitlementError(null);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    setEntitlementError(null);

    try {
      const response = await fetch(
        `/api/compatibility/directory?q=${encodeURIComponent(trimmed)}&dataset=${category}&limit=30`,
        { signal: abortRef.current.signal }
      );
      const payload = await response.json();

      if (response.status === 403 || payload.code === "SUBSCRIPTION_EXPIRED") {
        setEntitlementError("SUBSCRIPTION_EXPIRED");
        setResults([]);
        return;
      }

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
    debounceRef.current = setTimeout(() => searchDirectory(query, selectedCategory), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCategory, searchDirectory]);

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
    setEntitlementError(null);
  }

  function selectCategory(category: ActiveCategory) {
    setSelectedCategory(category);
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
    setEntitlementError(null);
  }

  const isBattery = selectedCategory === "BATTERY";
  const selectedMeta = CATEGORIES.find((category) => category.id === selectedCategory) || CATEGORIES[0];
  const PartIcon = selectedMeta.icon;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <PageHeader
        title="دليل توافق القطع"
        description="ابحث عن موديل الجهاز لتعرف القطع والأجهزة المتوافقة بسهولة."
      />

      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <div className="text-sm font-black">الدليل ما يزال قيد التطوير</div>
          <p className="mt-0.5 text-xs font-medium leading-5 text-amber-800">
            استخدم النتائج كدليل مساعد، وطابق كود القطعة قبل التركيب.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-black text-slate-900">نوع القطعة</h2>
          <p className="mt-0.5 text-xs font-medium text-slate-400">اختر القسم ثم ابحث عن الجهاز</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                disabled={!category.enabled}
                onClick={() => category.enabled && selectCategory(category.id as ActiveCategory)}
                className={`rounded-xl border p-3 text-right transition ${
                  isActive
                    ? "border-violet-400 bg-violet-50 ring-1 ring-violet-100"
                    : category.enabled
                      ? "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isActive
                      ? "bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white"
                      : "bg-white text-slate-400"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {isActive && <Check className="h-4 w-4 text-violet-600" />}
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
            ابحث داخل {selectedMeta.label}
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
              placeholder={`مثال: ${selectedMeta.searchExample}`}
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

        {entitlementError === "SUBSCRIPTION_EXPIRED" && (
          <div className="m-4">
            <EntitlementAlert
              code="SUBSCRIPTION_EXPIRED"
              customMessage="انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك."
              actionHref="/support"
              actionLabel="تواصل مع الدعم"
            />
          </div>
        )}

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
                          <div className="truncate text-[10px] font-bold text-violet-600">
                            {result.brandSection}{isBattery && result.partCode ? ` • ${result.partCode}` : ""}
                          </div>
                          <div className="mt-0.5 truncate text-sm font-black text-slate-900">{result.deviceName}</div>
                        </div>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
                          <Smartphone className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="font-black text-violet-700">
                          {isBattery && result.partCode ? result.partCode : `${result.compatibilityCount} أجهزة`}
                        </span>
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
                      <div className="text-xs font-bold text-violet-600">
                        {selected.brandSection} • {selectedMeta.label}
                      </div>
                      <h3 className="mt-1 text-2xl font-black text-slate-900">{selected.deviceName}</h3>
                      {isBattery && selected.partCode && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-violet-600 px-3 py-1 text-sm font-black text-white">
                            {selected.partCode}
                          </span>
                          {selected.capacityMah && (
                            <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">
                              {selected.capacityMah} mAh
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 px-4 py-2 text-center text-violet-700">
                      <div className="text-2xl font-black">{selected.compatibilityCount}</div>
                      <div className="text-[10px] font-bold">أجهزة</div>
                    </div>
                  </div>

                  <div className="pt-5">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700">
                        <PartIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          {selectedMeta.resultTitle}
                        </h4>
                        <p className="text-xs font-medium text-slate-400">
                          {selectedMeta.resultSubtitle}
                        </p>
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

                    {selected.inventoryItems.length > 0 ? (
                      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center gap-2 text-sm font-black text-emerald-900">
                          <PackageCheck className="h-5 w-5 text-emerald-600" />
                          متوفر في مخزونك
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {selected.inventoryItems.map((item) => (
                            <Link
                              key={item.id}
                              href={`/inventory/${item.id}`}
                              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3 transition hover:border-emerald-400 hover:shadow-sm"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-xs font-black text-slate-900">{item.name}</div>
                                <div className="mt-1 text-[10px] font-bold text-slate-400">{item.sku ? `SKU: ${item.sku}` : "عرض قطعة المخزون"}</div>
                              </div>
                              <div className="shrink-0 text-left">
                                <div className={`text-sm font-black ${item.quantity > 0 ? "text-emerald-700" : "text-rose-600"}`}>{item.quantity} قطعة</div>
                                <div className="mt-0.5 font-numeric text-[10px] font-bold text-slate-500">{item.unitPrice.toFixed(2)} {item.currency}</div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-xs font-black text-slate-800">لا توجد قطعة من مخزونك مرتبطة بهذه المجموعة</div>
                          <div className="mt-1 text-[10px] font-medium text-slate-500">يمكنك إضافة القطعة وربطها مباشرة بجميع الأجهزة الظاهرة أعلاه.</div>
                        </div>
                        <Link
                          href={`/inventory/new?groupId=${encodeURIComponent(selected.groupId)}&name=${encodeURIComponent(`${selectedMeta.label} ${selected.deviceName}`)}&category=${encodeURIComponent(selectedMeta.label)}`}
                          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-xs font-black text-white shadow-sm"
                        >
                          <PackageCheck className="h-4 w-4" />
                          إضافة وربط بالمخزون
                        </Link>
                      </div>
                    )}

                    <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium leading-6 text-slate-500">
                      {selectedMeta.installWarning}
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
                    ستظهر هنا مباشرة جميع الأجهزة التي تستخدم القطعة نفسها.
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
