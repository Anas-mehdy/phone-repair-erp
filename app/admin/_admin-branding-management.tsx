"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Monitor,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  adminClearDarkModeLogoAction,
  adminUploadDarkModeLogoAction,
  type BrandingActionState,
} from "./branding-actions";

const INITIAL_STATE: BrandingActionState = { success: false };

interface AdminBrandingManagementProps {
  hasCustomDarkLogo: boolean;
  initialLogoUpdatedAt: string | null;
}

export function AdminBrandingManagement({
  hasCustomDarkLogo,
  initialLogoUpdatedAt,
}: AdminBrandingManagementProps) {
  const [uploadState, uploadAction, uploadPending] = useActionState(
    adminUploadDarkModeLogoAction,
    INITIAL_STATE,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    adminClearDarkModeLogoAction,
    INITIAL_STATE,
  );
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [serverLogoSrc, setServerLogoSrc] = useState(
    hasCustomDarkLogo
      ? `/api/branding/dark-logo?v=${encodeURIComponent(initialLogoUpdatedAt ?? "current")}`
      : "/masar-logo.png",
  );

  useEffect(() => {
    if (!uploadState.success || !uploadState.version) return;
    setServerLogoSrc(
      `/api/branding/dark-logo?v=${encodeURIComponent(uploadState.version)}`,
    );
    setSelectedFileName(null);
    setLocalPreview(null);
  }, [uploadState.success, uploadState.version]);

  useEffect(() => {
    if (!clearState.success) return;
    setServerLogoSrc("/masar-logo.png");
    setSelectedFileName(null);
    setLocalPreview(null);
  }, [clearState.success]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const previewSrc = localPreview ?? serverLogoSrc;
  const isBusy = uploadPending || clearPending;
  const hasCustomLogoNow = serverLogoSrc.startsWith("/api/branding/dark-logo");

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-900/80 shadow-xl shadow-black/10">
      <div className="flex flex-col gap-4 border-b border-slate-800 bg-gradient-to-l from-cyan-500/10 via-slate-900 to-violet-500/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <ImageIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-black text-white">هوية الدارك مود</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              ارفع لوغو مستقل يظهر فقط في الوضع الداكن داخل لوحة التحكم.
            </p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[11px] font-black text-slate-300">
          <Monitor className="h-4 w-4 text-cyan-400" />
          {hasCustomLogoNow ? "لوغو مخصص مفعّل" : "يستخدم اللوغو الافتراضي"}
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <form action={uploadAction} className="space-y-4">
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 px-5 py-7 text-center transition hover:border-cyan-500/60 hover:bg-cyan-500/[0.04]">
              <UploadCloud className="h-8 w-8 text-cyan-400 transition group-hover:-translate-y-0.5" />
              <span className="mt-3 text-sm font-black text-white">
                {selectedFileName ?? "اختر لوغو الدارك مود"}
              </span>
              <span className="mt-1 text-[11px] font-semibold text-slate-500">
                PNG أو WebP أو JPG — بحد أقصى 900KB
              </span>
              <span className="mt-1 text-[11px] font-semibold text-amber-300/80">
                الأفضل صورة شفافة ومقصوصة حول اللوغو بدون فراغات كبيرة.
              </span>
              <input
                type="file"
                name="darkLogo"
                accept="image/png,image/webp,image/jpeg,.png,.webp,.jpg,.jpeg"
                required
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFileName(file?.name ?? null);
                  setLocalPreview((previous) => {
                    if (previous) URL.revokeObjectURL(previous);
                    return file ? URL.createObjectURL(file) : null;
                  });
                }}
              />
            </label>

            <button
              type="submit"
              disabled={isBusy || !selectedFileName}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-l from-teal-500 to-cyan-500 px-5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" />
              {uploadPending ? "جارٍ الرفع..." : "رفع واعتماد اللوغو"}
            </button>
          </form>

          {hasCustomLogoNow ? (
            <form action={clearAction}>
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-black text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {clearPending ? "جارٍ الحذف..." : "حذف اللوغو المخصص"}
              </button>
            </form>
          ) : null}

          {uploadState.message ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {uploadState.message}
            </div>
          ) : null}
          {uploadState.error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {uploadState.error}
            </div>
          ) : null}
          {clearState.message ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {clearState.message}
            </div>
          ) : null}
          {clearState.error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {clearState.error}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-black text-slate-300">معاينة على خلفية الدارك مود</p>
          <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1220] p-5 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt="معاينة لوغو مسار للدارك مود"
              className="max-h-32 max-w-full object-contain"
            />
          </div>
          <p className="text-[11px] leading-5 font-semibold text-slate-500">
            المعاينة تعرض الملف كما هو. إذا ظهر صغيراً، قص الفراغات الشفافة حول اللوغو قبل رفعه.
          </p>
        </div>
      </div>
    </section>
  );
}
