"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Cpu,
  Search,
  Layers,
  Zap,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Battery,
  Tv,
  Radio,
  Camera,
  Box,
  RotateCcw,
  Store,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  PackageX,
  PackageCheck,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

interface DeviceItem {
  id: string;
  brand: string;
  commercialName: string;
  modelNumber: string;
  networkVariant: string | null;
  region: string | null;
  releaseYear: number | null;
}

interface InventoryLocationDetail {
  inventoryItemId: string;
  shopId: string;
  shopName?: string;
  sku: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  location?: string | null;
}

interface EvidenceDetail {
  id: string;
  sourceType: string;
  sourceReference: string;
  evidenceDetails: string;
  verifiedBy: string;
  verifiedAt: string;
}

interface CompatiblePartItem {
  partId: string;
  partName: string;
  category: string;
  manufacturerCode: string | null;
  partAliases: string[];
  screenSpecification: {
    quality: string;
    qualityLabel: string;
    technology: string;
    technologyLabel: string;
    frame: string;
    frameLabel: string;
    supplier: string;
    supplierProductCode: string | null;
    unresolvedClaims: string[];
  } | null;
  compatibilityId: string;
  compatibilityStatus: "VERIFIED" | "PROVISIONALLY_VERIFIED" | "UNVERIFIED" | "INCOMPATIBLE";
  compatibilityType: string;
  verificationLevel: string;
  technicalNotes: string | null;
  verifiedAt: string | null;
  evidenceCount: number;
  corroboratedSourceCount: number;
  verificationMethod: string | null;
  evidences?: EvidenceDetail[];
  isVerified: boolean;
  isProvisional: boolean;
  requiresManualVerification: boolean;
  warning: string | null;
  totalAvailableQuantity: number;
  inStock: boolean;
  inventoryItems: InventoryLocationDetail[];
}

interface InventoryMatchResponse {
  success: boolean;
  device: DeviceItem;
  totalCompatibleParts: number;
  inStockPartsCount: number;
  outOfStockPartsCount: number;
  results: CompatiblePartItem[];
  error?: string;
}

const CATEGORIES = [
  { id: "ALL", label: "كل القطع", description: "بحث شامل في جميع الأنواع", icon: Layers },
  { id: "SCREEN", label: "الشاشات", description: "شاشات كاملة ولوحات عرض", icon: Tv },
  { id: "BATTERY", label: "البطاريات", description: "بطاريات ودوائر الحماية", icon: Battery },
  { id: "CHARGING_PORT", label: "منافذ الشحن", description: "قواعد وفلاتات الشحن", icon: Zap },
  { id: "CONNECTOR", label: "الفلاتات والموصلات", description: "FPC وموصلات الربط", icon: Cpu },
  { id: "IC_CHIP", label: "الآيسيات والدوائر", description: "طاقة وإشارة وتحكم", icon: Radio },
  { id: "CAMERA", label: "الكاميرات", description: "كاميرات ومستشعرات", icon: Camera },
  { id: "HOUSING_FRAME", label: "الهياكل والفريمات", description: "فريمات وهياكل تثبيت", icon: Box },
  { id: "OTHER", label: "قطع أخرى", description: "قطع موثقة غير مصنفة", icon: Layers },
];

export default function TechnicianCompatibilityPage() {
  // State for search & device selection
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingDevices, setIsSearchingDevices] = useState(false);
  const [deviceResults, setDeviceResults] = useState<DeviceItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // State for compatible inventory results
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [inventoryResponse, setInventoryResponse] = useState<InventoryMatchResponse | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [includeOutOfStock, setIncludeOutOfStock] = useState<boolean>(true);

  // Expandable evidence state
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Set<string>>(new Set());

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Debounced Device Search via GET /api/compatibility/devices
  const fetchDevices = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDeviceResults([]);
      setIsSearchingDevices(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearchingDevices(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/compatibility/devices?q=${encodeURIComponent(trimmed)}&limit=30`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const json = await res.json();
      if (json.success && Array.isArray(json.results)) {
        setDeviceResults(json.results as DeviceItem[]);
      } else {
        setDeviceResults([]);
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        console.error("Device search error:", err);
        setSearchError("تعذر إتمام البحث عن الأجهزة. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsSearchingDevices(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!selectedDevice && searchQuery.trim().length > 0) {
      debounceTimerRef.current = setTimeout(() => {
        fetchDevices(searchQuery);
      }, 250);
    } else if (!searchQuery.trim()) {
      setDeviceResults([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, selectedDevice, fetchDevices]);

  // 2. Fetch Compatible Inventory for Selected Device via GET /api/compatibility/inventory
  const fetchCompatibleInventory = useCallback(
    async (device: DeviceItem, category: string, outOfStock: boolean) => {
      setIsLoadingInventory(true);
      setInventoryError(null);

      try {
        let url = `/api/compatibility/inventory?deviceId=${encodeURIComponent(device.id)}&includeOutOfStock=${outOfStock}`;
        if (category !== "ALL") {
          url += `&category=${encodeURIComponent(category)}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Error ${res.status}`);
        }

        const data: InventoryMatchResponse = await res.json();
        setInventoryResponse(data);
      } catch (err: unknown) {
        console.error("Compatible inventory error:", err);
        setInventoryError((err as Error).message || "حدث خطأ أثناء جلب قطع الغيار المتوافقة.");
        setInventoryResponse(null);
      } finally {
        setIsLoadingInventory(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedDevice) {
      fetchCompatibleInventory(selectedDevice, selectedCategory, includeOutOfStock);
    }
  }, [selectedDevice, selectedCategory, includeOutOfStock, fetchCompatibleInventory]);

  // 3. Selection & Reset Handlers
  function handleSelectDevice(device: DeviceItem) {
    // Clear previous results immediately to prevent stale states
    setInventoryResponse(null);
    setExpandedEvidenceIds(new Set());
    setSelectedDevice(device);
    setDeviceResults([]);
  }

  function handleResetDevice() {
    setSelectedDevice(null);
    setInventoryResponse(null);
    setSearchQuery("");
    setDeviceResults([]);
    setExpandedEvidenceIds(new Set());
  }

  function toggleEvidenceExpand(partId: string) {
    setExpandedEvidenceIds((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  }

  function formatVerificationLevel(level: string): string {
    switch (level) {
      case "OEM_OFFICIAL":
        return "توثيق مصنعي رسمي (OEM Official)";
      case "ENGINEERING_VERIFIED":
        return "موثّق بمخطط هندسي معتمد (Engineering Verified)";
      case "PHYSICAL_TEST_VERIFIED":
        return "فحص واختبار ميداني معتمد (Physical Test Verified)";
      case "TECHNICIAN_REPORTED":
        return "تقرير فني قيد التدقيق (Technician Reported)";
      case "SUPPLIER_CATALOG":
        return "كتالوج مورد معتمد (Supplier Catalog)";
      default:
        return level;
    }
  }

  function formatCompatibilityType(type: string): string {
    switch (type) {
      case "DIRECT_REPLACEMENT":
        return "بديل مباشر متطابق تماماً (Direct Replacement)";
      case "FUNCTIONAL_EQUIVALENT":
        return "مكافئ وظيفي (Functional Equivalent)";
      case "PHYSICAL_COMPATIBLE":
        return "تطابق فيزيائي (Physical Compatible)";
      case "REQUIRES_MODIFICATION":
        return "يتطلب تعديل فني بسيط (Requires Modification)";
      case "PARTIAL_COMPATIBILITY":
        return "توافق جزئي (Partial Compatibility)";
      default:
        return type;
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="دليل التوافقات والمخزون الذكي"
        description="اختر موديل الهاتف لمعرفة كافة القطع المتوافقة هندسياً والمتاحة حالياً في مخزون الورشة فورياً."
      />

      <div
        role="alert"
        className="rounded-2xl border-2 border-amber-500 bg-amber-50 px-5 py-6 text-center shadow-sm"
      >
        <div className="flex items-center justify-center gap-3 text-amber-900">
          <AlertTriangle className="h-8 w-8 shrink-0" />
          <h2 className="text-2xl font-black sm:text-3xl">هذه الصفحة ما تزال قيد التطوير</h2>
        </div>
        <p className="mx-auto mt-3 max-w-3xl text-sm font-bold leading-7 text-amber-900 sm:text-base">
          نتائج التوافقات الحالية تجريبية وغير مكتملة. يُمنع الاعتماد عليها لتركيب أي قطعة قبل التحقق اليدوي من فني مختص،
          إلى أن تنتهي مراجعة قاعدة البيانات واعتماد مصادرها الهندسية.
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: DEVICE SELECTION / SEARCH BAR                       */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        {!selectedDevice ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">1. اختر نوع القطعة</div>
                  <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                    سيُطبّق القسم على النتائج بعد اختيار الجهاز
                  </div>
                </div>
                {selectedCategory !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ALL")}
                    className="text-[11px] font-black text-primary hover:text-primary/80"
                  >
                    إلغاء التحديد
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      aria-pressed={isActive}
                      className={`group min-h-[92px] rounded-2xl border p-3 text-right transition ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/15"
                          : "border-slate-200 bg-slate-50/60 hover:border-primary/40 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          isActive ? "bg-primary text-white" : "bg-white text-slate-500 border border-slate-200"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {isActive && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="mt-2 text-xs font-black text-slate-900">{cat.label}</div>
                      <div className="mt-0.5 text-[10px] font-bold text-slate-400">{cat.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-2">
              <label htmlFor="device-search-input" className="text-xs font-black text-slate-800 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>2. ابحث عن جهاز العميل بالاسم أو رقم الموديل:</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                (مثال: SM-A525F أو A12 أو Redmi Note 10S أو iPhone 12)
              </span>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="device-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اكتب رقم الموديل، الكود، أو الاسم التجاري..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pr-10 pl-10 py-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 shadow-2xs transition"
                autoFocus
              />
              {isSearchingDevices && (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
              )}
              {searchQuery && !isSearchingDevices && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {searchError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Candidate Devices List */}
            {deviceResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  الأجهزة المطابقة ({deviceResults.length}):
                </div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {deviceResults.map((dev) => (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => handleSelectDevice(dev)}
                      className="text-right p-3.5 rounded-xl border border-slate-200 hover:border-primary/60 hover:bg-primary/5 bg-slate-50/50 transition flex flex-col justify-between gap-2 group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-slate-900 group-hover:text-primary transition">
                            {dev.brand} {dev.commercialName}
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 font-mono mt-0.5">
                            {dev.modelNumber}
                          </div>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-black text-slate-700 shadow-2xs">
                          {dev.brand}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        {dev.networkVariant && <span>{dev.networkVariant}</span>}
                        {dev.region && <span>• {dev.region}</span>}
                        {dev.releaseYear && <span>• {dev.releaseYear}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.trim().length > 0 && !isSearchingDevices && deviceResults.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500 space-y-1">
                <Smartphone className="h-6 w-6 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-700">لم يتم العثور على أجهزة مطابقة مباشرة</div>
                <div className="text-[11px] text-slate-400">
                  تأكد من كتابة كود الموديل بدقة (مثل SM-A525F أو Note 10S).
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Selected Device Header Banner */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  الجهاز المحدد للفحص والمطابقة:
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                  {selectedDevice.brand} {selectedDevice.commercialName}
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mt-1 font-mono">
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-amber-400">
                    {selectedDevice.modelNumber}
                  </span>
                  {selectedDevice.networkVariant && <span>• {selectedDevice.networkVariant}</span>}
                  {selectedDevice.region && <span>• {selectedDevice.region}</span>}
                  {selectedDevice.releaseYear && <span>• {selectedDevice.releaseYear}</span>}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleResetDevice}
              className="bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs font-bold shrink-0 rounded-xl gap-1.5 h-10 px-4"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>تغيير الجهاز</span>
            </Button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: FILTERS & CONTROLS (Active when device selected)   */}
      {/* ------------------------------------------------------------- */}
      {selectedDevice && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 border border-slate-200/70 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Out-of-stock toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none shrink-0 px-2 py-1">
              <input
                type="checkbox"
                checked={includeOutOfStock}
                onChange={(e) => setIncludeOutOfStock(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
              />
              <span>إظهار القطع غير المتوفرة بالمخزون</span>
            </label>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SECTION 3: COMPATIBLE INVENTORY RESULTS                       */}
          {/* ------------------------------------------------------------- */}
          {isLoadingInventory ? (
            /* Loading Skeleton Grid */
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs animate-pulse space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-slate-200 rounded-md" />
                    <div className="h-5 w-20 bg-slate-100 rounded-md" />
                  </div>
                  <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
                  <div className="h-16 bg-slate-50 rounded-xl" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : inventoryError ? (
            /* Error State */
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
              <h4 className="text-sm font-black text-rose-900">تعذر تحميل بيانات التوافقات</h4>
              <p className="text-xs text-rose-700 max-w-md mx-auto font-medium">{inventoryError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchCompatibleInventory(selectedDevice, selectedCategory, includeOutOfStock)}
                className="text-xs font-bold border-rose-300 text-rose-800 bg-white hover:bg-rose-50"
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : inventoryResponse && inventoryResponse.results.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span>
                    القطع المتوافقة هندسياً:{" "}
                    <span className="text-slate-900 font-black">{inventoryResponse.totalCompatibleParts}</span>
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <PackageCheck className="h-4 w-4" />
                    <span>متوفر بالورشة: {inventoryResponse.inStockPartsCount}</span>
                  </span>
                  {inventoryResponse.outOfStockPartsCount > 0 && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <PackageX className="h-4 w-4" />
                      <span>غير متوفر: {inventoryResponse.outOfStockPartsCount}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {inventoryResponse.results.map((part) => {
                  const isEvidenceExpanded = expandedEvidenceIds.has(part.partId);

                  return (
                    <div
                      key={part.partId}
                      className={`rounded-2xl border bg-white p-5 shadow-2xs flex flex-col justify-between gap-4 transition-all duration-200 ${
                        part.isVerified
                          ? "border-slate-200/90 hover:border-emerald-500/50 hover:shadow-xs"
                          : "border-amber-300 bg-amber-50/10 hover:border-amber-400"
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Header: Verification Badge & In-Stock Status */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {/* Status Badge */}
                          {part.isVerified ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-black shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>✓ موثّق ومعتمد</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 text-xs font-black shadow-2xs">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                              <span>توافق سوقي — مؤيد من {part.corroboratedSourceCount} مصادر</span>
                            </span>
                          )}

                          {/* Inventory Stock Badge */}
                          {part.inStock ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-white px-2.5 py-1 text-xs font-black shadow-2xs">
                              <PackageCheck className="h-3.5 w-3.5" />
                              <span>متوفر ({part.totalAvailableQuantity})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 text-xs font-bold">
                              <PackageX className="h-3.5 w-3.5" />
                              <span>غير متوفر بالمخزون</span>
                            </span>
                          )}
                        </div>

                        {/* Part Name & Manufacturer Code */}
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                            {part.partName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {part.manufacturerCode && (
                              <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md">
                                الكود: {part.manufacturerCode}
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              الفئة: {part.category}
                            </span>
                          </div>
                        </div>

                        {part.screenSpecification && (
                          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className="rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-black text-white">
                                {part.screenSpecification.qualityLabel}
                              </span>
                              <span className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-bold text-sky-900">
                                {part.screenSpecification.technologyLabel}
                              </span>
                              <span className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-bold text-sky-900">
                                {part.screenSpecification.frameLabel}
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-sky-800">
                              المصدر: {part.screenSpecification.supplier}
                              {part.screenSpecification.supplierProductCode
                                ? ` • كود العرض: ${part.screenSpecification.supplierProductCode}`
                                : ""}
                            </div>
                          </div>
                        )}

                        {/* Provisional Warning Banner if needed */}
                        {part.requiresManualVerification && (
                          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900 space-y-1">
                            <div className="flex items-center gap-1.5 font-black text-amber-800">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>تحذير هندسي هام:</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-amber-800/90 font-medium">
                              {part.warning || "يتطلب المطابقة اليدوية للقطعة وفحص الأبعاد والموصل قبل التركيب."}
                            </p>
                          </div>
                        )}

                        {/* Compatibility & Verification Metadata Box */}
                        <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-bold">نوع التوافق:</span>
                            <span className="font-black text-slate-800">
                              {formatCompatibilityType(part.compatibilityType)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-bold">مستوى التحقق:</span>
                            <span className="font-bold text-slate-700">
                              {formatVerificationLevel(part.verificationLevel)}
                            </span>
                          </div>
                          {part.technicalNotes && (
                            <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-medium leading-relaxed">
                              <span className="font-black text-slate-700">ملاحظات فنية: </span>
                              {part.technicalNotes}
                            </div>
                          )}
                        </div>

                        {/* Inventory Location Details Box */}
                        {part.inventoryItems.length > 0 ? (
                          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 space-y-2">
                            <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                              <Store className="h-3.5 w-3.5 text-emerald-700" />
                              <span>مواقع التخزين والكميات بالورشة:</span>
                            </div>
                            <div className="space-y-1.5">
                              {part.inventoryItems.map((inv) => (
                                <div
                                  key={inv.inventoryItemId}
                                  className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                                    <span className="font-bold text-slate-800">
                                      {inv.location || "الرف الرئيسي"}
                                    </span>
                                    {inv.sku && (
                                      <span className="font-mono text-[10px] text-slate-400">
                                        [{inv.sku}]
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {inv.unitPrice > 0 && (
                                      <span className="text-[11px] font-black text-slate-700">
                                        ${inv.unitPrice.toFixed(2)}
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-xs">
                                      {inv.quantity} قطع
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 p-2.5 text-center text-xs font-bold text-slate-400">
                            لا توجد كميات حالية مسجلة في المخزون
                          </div>
                        )}
                      </div>

                      {/* Footer: Verification Evidence Expand Button */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleEvidenceExpand(part.partId)}
                          className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 transition py-1"
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            <span>تفاصيل التوثيق والأدلة المرجعية ({part.evidenceCount})</span>
                          </span>
                          {isEvidenceExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {isEvidenceExpanded && (
                          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs space-y-2 animate-in fade-in duration-150">
                            <div className="text-[11px] font-black text-slate-700">
                              سجل التحقق المعتمد (Verification Audit):
                            </div>
                            <div className="space-y-1.5 text-[11px] text-slate-600">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">تاريخ الاعتماد:</span>
                                <span className="font-bold">
                                  {part.verifiedAt ? new Date(part.verifiedAt).toLocaleDateString("ar-EG") : "غير محدد"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">مستوى التدقيق:</span>
                                <span className="font-bold">{part.verificationLevel}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">عدد الأدلة الموثقة:</span>
                                <span className="font-bold">{part.evidenceCount} دليلاً هندسياً</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Empty State: No compatible parts */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
              <Cpu className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                لا توجد قطع غيار متوافقة موثقة مطابقة للفلتر
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {selectedCategory !== "ALL"
                  ? "جرب اختيار 'جميع الفئات' أو تفعيل خيار إظهار القطع غير المتوفرة بالمخزون."
                  : "لم يتم تسجيل أي توافق معتمد لهذا الجهاز حتى الآن في قاعدة البيانات."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
