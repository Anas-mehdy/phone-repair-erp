"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Archive,
  Eye,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Layers,
  Cpu,
  Tv,
  Battery,
  Zap,
  Radio,
  Camera,
  Box,
  Lock,
  FileText,
  AlertOctagon,
  RefreshCw,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompatibilityRecord {
  id: string;
  compatibilityStatus: "VERIFIED" | "PROVISIONALLY_VERIFIED" | "UNVERIFIED" | "INCOMPATIBLE";
  compatibilityType: string;
  verificationLevel: string;
  technicalNotes: string | null;
  createdById: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt: string | null;
  device: {
    id: string;
    brand: string;
    commercialName: string;
    modelNumber: string;
    networkVariant: string | null;
    region: string | null;
    boardRevision: string | null;
    releaseYear: number | null;
  };
  part: {
    id: string;
    name: string;
    category: string;
    manufacturerCode: string | null;
    partAliases: string[];
    specifications: Record<string, unknown>;
  };
  evidenceCount: number;
  reviewCount: number;
  evidences: Array<{
    id: string;
    sourceType: string;
    sourceReference: string;
    evidenceDetails: string;
    verifiedBy: string;
    verifiedAt: string;
    createdAt: string;
  }>;
}

interface StatsData {
  total: number;
  verified: number;
  provisional: number;
  unverified: number;
  incompatible: number;
  archived: number;
  pendingReview: number;
  totalEvidences: number;
}

const CATEGORIES = [
  { id: "ALL", label: "جميع الفئات" },
  { id: "SCREEN", label: "الشاشات", icon: Tv },
  { id: "BATTERY", label: "البطاريات", icon: Battery },
  { id: "CHARGING_PORT", label: "منافذ الشحن", icon: Zap },
  { id: "IC_CHIP", label: "الآيسيات", icon: Radio },
  { id: "CAMERA", label: "الكاميرات", icon: Camera },
  { id: "BACK_GLASS", label: "الزجاج الخلفي", icon: Box },
];

const STATUS_FILTERS = [
  { id: "ALL", label: "جميع الحالات" },
  { id: "UNVERIFIED", label: "قيد المراجعة (Unverified)", color: "text-sky-400" },
  { id: "PROVISIONALLY_VERIFIED", label: "مراجعة أولية (Provisional)", color: "text-amber-400" },
  { id: "VERIFIED", label: "معتمد ونهائي (Verified)", color: "text-emerald-400" },
  { id: "INCOMPATIBLE", label: "غير متوافق (Incompatible)", color: "text-rose-400" },
];

export default function AdminCompatibilityGovernanceDashboard() {
  // Stats & Listing State
  const [stats, setStats] = useState<StatsData | null>(null);
  const [records, setRecords] = useState<CompatibilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [archiveFilter, setArchiveFilter] = useState<"ACTIVE" | "ARCHIVED" | "ALL">("ACTIVE");

  // Selected item detail modal
  const [selectedRecord, setSelectedRecord] = useState<CompatibilityRecord | null>(null);
  

  // Verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState("ENGINEERING_VERIFIED");
  const [verificationType, setVerificationType] = useState("DIRECT_REPLACEMENT");
  const [evidenceSourceType, setEvidenceSourceType] = useState("BOARDVIEW_SCHEMATIC");
  const [evidenceSourceRef, setEvidenceSourceRef] = useState("");
  const [evidenceDetails, setEvidenceDetails] = useState("");
  const [techNotes, setTechNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Incompatible modal state
  const [incompModalOpen, setIncompModalOpen] = useState(false);
  const [incompReason, setIncompReason] = useState("");

  // Fetch paginated admin records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      let url = `/api/admin/compatibility?page=${page}&limit=15`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (categoryFilter !== "ALL") url += `&category=${categoryFilter}`;
      if (archiveFilter === "ACTIVE") url += `&isArchived=false`;
      if (archiveFilter === "ARCHIVED") url += `&isArchived=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();

      if (json.success) {
        setStats(json.stats);
        setRecords(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalCount(json.pagination?.total || 0);
      }
    } catch (err: unknown) {
      console.error("Admin fetch error:", err);
      setActionError("فشل في تحميل سجلات التوافق الإدارية.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter, archiveFilter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Open detail view
  async function handleOpenDetail(record: CompatibilityRecord) {
    
    setSelectedRecord(record);
    try {
      const res = await fetch(`/api/admin/compatibility/${record.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.compatibility) {
          setSelectedRecord(json.compatibility);
        }
      }
    } catch (err) {
      console.error("Fetch detail error:", err);
    } finally {
      
    }
  }

  // Handle Verification Submit
  async function handleVerifySubmit() {
    if (!selectedRecord) return;
    if (!evidenceSourceRef.trim() || !evidenceDetails.trim()) {
      setActionError("يجب ملء المرجع الفني وتفاصيل الدليل قبل اعتماد التوافق.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/compatibility/${selectedRecord.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationLevel,
          compatibilityType: verificationType,
          technicalNotes: techNotes.trim() || undefined,
          evidence: {
            sourceType: evidenceSourceType,
            sourceReference: evidenceSourceRef.trim(),
            evidenceDetails: evidenceDetails.trim(),
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل اعتماد السجل.");
      }

      setActionSuccess(
        json.compatibility?.compatibilityStatus === "VERIFIED"
          ? "تم النشر بعد اكتمال اعتمادين مستقلين."
          : "تم تسجيل الاعتماد الأول. ما زال السجل بانتظار مدقق مستقل ثانٍ ولن يظهر للفنيين بعد."
      );
      setVerifyModalOpen(false);
      setSelectedRecord(json.compatibility);
      fetchRecords();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Mark Incompatible Submit
  async function handleIncompatibleSubmit() {
    if (!selectedRecord) return;
    if (!incompReason.trim()) {
      setActionError("السبب الفني لعدم التوافق إلزامي ولا يمكن تركه فارغاً.");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/compatibility/${selectedRecord.id}/incompatible`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: incompReason.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل تسجيل عدم التوافق.");
      }

      setActionSuccess("تم تسجيل السجل كغير متوافق (INCOMPATIBLE) بنجاح.");
      setIncompModalOpen(false);
      setSelectedRecord(json.compatibility);
      fetchRecords();
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Archive
  async function handleArchiveRecord(id: string) {
    if (!confirm("هل أنت متأكد من أرشفة سجل التوافق هذا؟ سيبقى محفوظاً في السجل التاريخي.")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/compatibility/${id}/archive`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess("تمت أرشفة السجل بنجاح.");
        if (selectedRecord?.id === id) {
          setSelectedRecord(json.compatibility);
        }
        fetchRecords();
      } else {
        setActionError(json.error || "تعذر أرشفة السجل.");
      }
    } catch (err) {
      console.error(err);
      setActionError("حدث خطأ أثناء محاولة الأرشفة.");
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Restore
  async function handleRestoreRecord(id: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/compatibility/${id}/restore`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess("تمت استعادة السجل بنجاح.");
        if (selectedRecord?.id === id) {
          setSelectedRecord(json.compatibility);
        }
        fetchRecords();
      } else {
        setActionError(json.error || "تعذر استعادة السجل.");
      }
    } catch (err) {
      console.error(err);
      setActionError("حدث خطأ أثناء محاولة الاستعادة.");
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusBadge(status: string, isArchived: boolean) {
    if (isArchived) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-black">
          <Archive className="h-3 w-3" />
          <span>مؤرشف (Archived)</span>
        </span>
      );
    }
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span>معتمد (Verified)</span>
          </span>
        );
      case "PROVISIONALLY_VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span>مراجعة أولية (Provisional)</span>
          </span>
        );
      case "UNVERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-black">
            <FileText className="h-3 w-3 text-sky-400" />
            <span>قيد التدقيق (Pending Review)</span>
          </span>
        );
      case "INCOMPATIBLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black">
            <XCircle className="h-3 w-3 text-rose-400" />
            <span>غير متوافق (Incompatible)</span>
          </span>
        );
      default:
        return <span className="text-slate-400 text-xs">{status}</span>;
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                لوحة حوكمة واعتماد التوافقات الهندسية (Admin Compatibility Governance)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                مراجعة واعتماد وتدقيق قاعدة المعرفة الهندسية لتوافقات الأجهزة وقطع الغيار وتطبيق مبدأ الفحص الرباعي (Four-Eyes).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={fetchRecords}
            disabled={loading}
            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold gap-1.5 h-9 rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-violet-400" : ""}`} />
            <span>تحديث البيانات</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts Banner */}
      {actionSuccess && (
        <div className="rounded-2xl bg-emerald-950/60 border border-emerald-800/80 p-4 text-xs font-bold text-emerald-300 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="rounded-2xl bg-rose-950/60 border border-rose-800/80 p-4 text-xs font-bold text-rose-300 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Metric Stat Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 relative overflow-hidden shadow-lg">
            <span className="text-[11px] font-bold text-slate-400">إجمالي السجلات</span>
            <div className="text-2xl font-black text-white font-numeric mt-2">{stats.total}</div>
            <div className="text-[10px] text-slate-500 mt-1">{stats.totalEvidences} دليلاً هندسياً</div>
          </div>

          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 relative overflow-hidden shadow-lg">
            <span className="text-[11px] font-bold text-emerald-400">معتمد (VERIFIED)</span>
            <div className="text-2xl font-black text-emerald-300 font-numeric mt-2">{stats.verified}</div>
            <div className="text-[10px] text-emerald-500 mt-1">معتمد ومحمي هندسياً</div>
          </div>

          <div className="rounded-2xl border border-sky-900/40 bg-sky-950/20 p-4 relative overflow-hidden shadow-lg">
            <span className="text-[11px] font-bold text-sky-400">بانتظار المراجعة</span>
            <div className="text-2xl font-black text-sky-300 font-numeric mt-2">{stats.unverified}</div>
            <div className="text-[10px] text-sky-500 mt-1">تتطلب تدقيق واعتماد</div>
          </div>

          <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 relative overflow-hidden shadow-lg">
            <span className="text-[11px] font-bold text-amber-400">مراجعة أولية (PROVISIONAL)</span>
            <div className="text-2xl font-black text-amber-300 font-numeric mt-2">{stats.provisional}</div>
            <div className="text-[10px] text-amber-500 mt-1">تحذير فحص يدوي</div>
          </div>

          <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4 relative overflow-hidden shadow-lg">
            <span className="text-[11px] font-bold text-rose-400">غير متوافق (INCOMPATIBLE)</span>
            <div className="text-2xl font-black text-rose-300 font-numeric mt-2">{stats.incompatible}</div>
            <div className="text-[10px] text-rose-500 mt-1">معرفة سلبية موثقة</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 relative overflow-hidden shadow-lg">
            <span className="text-[11px] font-bold text-slate-400">السجلات المؤرشفة</span>
            <div className="text-2xl font-black text-slate-300 font-numeric mt-2">{stats.archived}</div>
            <div className="text-[10px] text-slate-500 mt-1">تاريخية غير تشغيلية</div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 shadow-lg">
        <div className="grid gap-3 md:grid-cols-12">
          {/* Search bar */}
          <div className="relative md:col-span-4">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بموديل الجهاز، اسم القطعة، كود المصنع..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pr-10 pl-4 py-2.5 text-xs font-bold text-slate-200 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-200 focus:border-violet-500 focus:outline-none"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category filter */}
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-200 focus:border-violet-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Archive toggle */}
          <div className="md:col-span-2">
            <select
              value={archiveFilter}
              onChange={(e) => {
                setArchiveFilter(e.target.value as "ACTIVE" | "ARCHIVED" | "ALL");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="ACTIVE">النشطة فقط</option>
              <option value="ARCHIVED">المؤرشفة فقط</option>
              <option value="ALL">الكل</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Review Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">الجهاز (Device)</th>
                <th className="px-4 py-3.5">القطعة (Part)</th>
                <th className="px-4 py-3.5">الحالة</th>
                <th className="px-4 py-3.5">نوع التوافق</th>
                <th className="px-4 py-3.5">مستوى التحقق</th>
                <th className="px-4 py-3.5 text-center">الأدلة</th>
                <th className="px-4 py-3.5">تاريخ التدقيق</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-violet-400" />
                    <span className="block mt-2 text-xs font-bold">جاري تحميل سجلات التوافق...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Layers className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <span className="block text-xs font-bold text-slate-400">لم يتم العثور على سجلات مطابقة</span>
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-bold text-slate-200">
                      <div>{row.device.brand} {row.device.commercialName}</div>
                      <div className="font-mono text-[10px] text-amber-400/80 mt-0.5">{row.device.modelNumber}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-200">
                      <div>{row.part.name}</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {row.part.manufacturerCode || row.part.category}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(row.compatibilityStatus, row.isArchived)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{row.compatibilityType}</td>
                    <td className="px-4 py-3 font-bold text-slate-300">{row.verificationLevel}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-300">
                        <FileCheck className="h-3 w-3 text-violet-400" />
                        <span>{row.evidenceCount}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 font-numeric">
                      {row.verifiedAt ? new Date(row.verifiedAt).toLocaleDateString("ar-EG") : "قيد المراجعة"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenDetail(row)}
                        className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-[11px] font-bold h-7 px-2.5 rounded-lg gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>مراجعة وتدقيق</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-400 bg-slate-950/60">
          <div>
            إجمالي السجلات: <span className="font-bold text-white font-numeric">{totalCount}</span> (صفحة {page} من {totalPages})
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 bg-slate-900 border-slate-800 text-xs font-bold rounded-lg"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span>السابق</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3 bg-slate-900 border-slate-800 text-xs font-bold rounded-lg"
            >
              <span>التالي</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DETAIL AUDIT & REVIEW MODAL                                   */}
      {/* ------------------------------------------------------------- */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8 text-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">تفاصيل ومراجعة التوافق الهندسي</h3>
                  {getStatusBadge(selectedRecord.compatibilityStatus, selectedRecord.isArchived)}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">ID: {selectedRecord.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Immutability Protection Alert if VERIFIED */}
            {selectedRecord.compatibilityStatus === "VERIFIED" && !selectedRecord.isArchived && (
              <div className="rounded-2xl bg-emerald-950/40 border border-emerald-800/80 p-4 text-xs space-y-1">
                <div className="flex items-center gap-2 font-black text-emerald-300">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span>سجل معتمد ومحمي ضد التعديل المباشر (Immutable Verified Knowledge)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  تم اعتماد هذا التوافق هندسياً واجتيازه الفحص المزدوج وتوثيقه بأدلة مرجعية. لا يمكن تعديل بيانات الجهاز أو القطعة مباشرة لحماية أمان الصيانة.
                </p>
              </div>
            )}

            {selectedRecord.compatibilityStatus === "PROVISIONALLY_VERIFIED" && !selectedRecord.isArchived && (
              <div className="rounded-2xl bg-amber-950/40 border border-amber-800/80 p-4 text-xs space-y-1">
                <div className="flex items-center gap-2 font-black text-amber-300">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>اعتماد أولي فقط — {selectedRecord.reviewCount || 1} من 2</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  هذا السجل مخفي عن الفنيين ولن يُنشر قبل اعتماد مدقق مركزي مستقل ثانٍ.
                </p>
              </div>
            )}

            {/* Device & Part Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 text-xs">
                <div className="text-[11px] font-black text-slate-400 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-violet-400" />
                  <span>بيانات الجهاز المحدد:</span>
                </div>
                <div className="text-sm font-black text-white">
                  {selectedRecord.device.brand} {selectedRecord.device.commercialName}
                </div>
                <div className="font-mono text-amber-400 text-xs">{selectedRecord.device.modelNumber}</div>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1">
                  {selectedRecord.device.networkVariant && <span>شبكة: {selectedRecord.device.networkVariant}</span>}
                  {selectedRecord.device.region && <span>• منطقة: {selectedRecord.device.region}</span>}
                  {selectedRecord.device.boardRevision && <span>• بورد: {selectedRecord.device.boardRevision}</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 text-xs">
                <div className="text-[11px] font-black text-slate-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span>بيانات القطعة:</span>
                </div>
                <div className="text-sm font-black text-white">{selectedRecord.part.name}</div>
                <div className="font-mono text-slate-300 text-xs">
                  الكود المصنعي: {selectedRecord.part.manufacturerCode || "غير محدد"}
                </div>
                <div className="text-[10px] text-slate-400 pt-1">الفئة: {selectedRecord.part.category}</div>
              </div>
            </div>

            {/* Evidence Audit List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-violet-400" />
                  <span>الأدلة الفنية الموثقة ({selectedRecord.evidences.length}):</span>
                </div>
              </div>

              {selectedRecord.evidences.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                  لا توجد أدلة هندسية مرفقة حتى الآن.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRecord.evidences.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 space-y-2 text-xs shadow-inner"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black text-violet-300">الدليل #{i + 1} ({ev.sourceType})</span>
                        <span className="text-slate-500 font-numeric">{new Date(ev.verifiedAt).toLocaleDateString("ar-EG")}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-200">المرجع: {ev.sourceReference}</div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{ev.evidenceDetails}</p>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                        المدقق: <span className="font-mono text-slate-400">{ev.verifiedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Trail Info */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-xs space-y-2">
              <div className="text-[11px] font-black text-slate-400 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-slate-400" />
                <span>سجل التدقيق والحوكمة (Audit Trail):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 block">المنشئ (Created By):</span>
                  <span className="font-mono text-slate-200">{selectedRecord.createdById || "SYSTEM_SEED"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">المدقق المعتمد (Verified By):</span>
                  <span className="font-mono text-slate-200">{selectedRecord.verifiedById || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">تاريخ الإنشاء:</span>
                  <span className="font-numeric">{new Date(selectedRecord.createdAt).toLocaleDateString("ar-EG")}</span>
                </div>
              </div>
              {selectedRecord.technicalNotes && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span className="font-bold text-slate-300">ملاحظات فنية: </span>
                  {selectedRecord.technicalNotes}
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {selectedRecord.isArchived ? (
                  <Button
                    type="button"
                    onClick={() => handleRestoreRecord(selectedRecord.id)}
                    disabled={actionLoading}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
                  >
                    استعادة السجل (Restore)
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleArchiveRecord(selectedRecord.id)}
                    disabled={actionLoading}
                    className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl gap-1"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>أرشفة (Archive)</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedRecord.compatibilityStatus !== "INCOMPATIBLE" && !selectedRecord.isArchived && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIncompModalOpen(true)}
                    disabled={actionLoading}
                    className="border-rose-900 text-rose-400 bg-rose-950/30 hover:bg-rose-900/40 text-xs font-bold rounded-xl gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>تسجيل كغير متوافق</span>
                  </Button>
                )}

                {selectedRecord.compatibilityStatus !== "VERIFIED" && !selectedRecord.isArchived && (
                  <Button
                    type="button"
                    onClick={() => setVerifyModalOpen(true)}
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl gap-1.5 px-4 shadow-lg shadow-emerald-600/20"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>تسجيل اعتماد مستقل</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VERIFY CONFIRMATION & EVIDENCE MODAL                          */}
      {/* ------------------------------------------------------------- */}
      {verifyModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تسجيل مراجعة واعتماد مستقل</h3>
                <p className="text-xs text-slate-400">إضافة الدليل الفني وتطبيق مبدأ التدقيق المزدوج (Four-Eyes Gate)</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="font-black text-slate-200">
                  الجهاز: {selectedRecord.device.brand} {selectedRecord.device.commercialName} ({selectedRecord.device.modelNumber})
                </div>
                <div className="text-slate-400">القطعة: {selectedRecord.part.name}</div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">مستوى التحقق (Verification Level):</label>
                <select
                  value={verificationLevel}
                  onChange={(e) => setVerificationLevel(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-slate-200 focus:border-emerald-500"
                >
                  <option value="ENGINEERING_VERIFIED">مخطط هندسي معتمد (Engineering Verified)</option>
                  <option value="OEM_OFFICIAL">توثيق مصنعي رسمي (OEM Official)</option>
                  <option value="PHYSICAL_TEST_VERIFIED">فحص واختبار ميداني معتمد (Physical Test Verified)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع التوافق (Compatibility Type):</label>
                <select
                  value={verificationType}
                  onChange={(e) => setVerificationType(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-slate-200 focus:border-emerald-500"
                >
                  <option value="DIRECT_REPLACEMENT">بديل مباشر متطابق تماماً (Direct Replacement)</option>
                  <option value="FUNCTIONAL_EQUIVALENT">مكافئ وظيفي (Functional Equivalent)</option>
                  <option value="PHYSICAL_COMPATIBLE">تطابق فيزيائي (Physical Compatible)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">مصدر الدليل (Source Type):</label>
                <select
                  value={evidenceSourceType}
                  onChange={(e) => setEvidenceSourceType(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-slate-200 focus:border-emerald-500"
                >
                  <option value="BOARDVIEW_SCHEMATIC">مخطط بورد / Boardview Schematic</option>
                  <option value="OEM_SERVICE_MANUAL">دليل الصيانة الرسمي / OEM Service Manual</option>
                  <option value="PHYSICAL_TEST">اختبار ميداني حقيقي / Physical Test</option>
                  <option value="MANUFACTURER_PART_NO">كتالوج المصنع / Manufacturer Part No</option>
                  <option value="TRUSTED_SUPPLIER">مورد موثوق / Trusted Supplier</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">المرجع الهندسي للدليل (Source Reference):</label>
                <input
                  type="text"
                  value={evidenceSourceRef}
                  onChange={(e) => setEvidenceSourceRef(e.target.value)}
                  placeholder="مثال: Samsung Schematic Rev 1.2 Page 45 / ZXW Tool"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-slate-200 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">تفاصيل الدليل الفني (Evidence Details):</label>
                <textarea
                  value={evidenceDetails}
                  onChange={(e) => setEvidenceDetails(e.target.value)}
                  rows={2}
                  placeholder="بيان تطابق مسارات الطاقة، الفولتية، وأبعاد الموصل..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-slate-200 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">ملاحظات فنية إضافية (اختياري):</label>
                <input
                  type="text"
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  placeholder="أي توصيات أو شروط خاصة بالتركيب..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-slate-200 focus:border-emerald-500"
                />
              </div>
            </div>


            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVerifyModalOpen(false)}
                className="bg-slate-900 border-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleVerifySubmit}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl px-5 gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>تسجيل الاعتماد</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MARK INCOMPATIBLE MODAL                                       */}
      {/* ------------------------------------------------------------- */}
      {incompModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تسجيل عدم التوافق (INCOMPATIBLE)</h3>
                <p className="text-xs text-slate-400">حظر استخدام هذه القطعة هندسياً ومنع اقتراحها للفنيين</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="font-black text-slate-200">
                  الجهاز: {selectedRecord.device.brand} {selectedRecord.device.commercialName}
                </div>
                <div className="text-slate-400">القطعة: {selectedRecord.part.name}</div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  السبب الفني الهندسي لعدم التوافق (إلزامي):
                </label>
                <textarea
                  value={incompReason}
                  onChange={(e) => setIncompReason(e.target.value)}
                  rows={3}
                  placeholder="مثال: اختلاف عدد المسارات في فلكس الشاشة أو تباين في أبعاد حجرة البطارية..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs font-bold text-slate-200 focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIncompModalOpen(false)}
                className="bg-slate-900 border-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleIncompatibleSubmit}
                disabled={actionLoading}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl px-5 gap-1.5 shadow-lg shadow-rose-600/20"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>حظر التوافق</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
