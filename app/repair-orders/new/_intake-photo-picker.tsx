"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

async function prepareImage(file: File): Promise<File> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error("اختر صورة بصيغة JPG أو PNG أو WebP.");
  }
  // Canvas produces a smaller JPEG and strips device metadata (including GPS).
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذر تجهيز الصورة على هذا الجهاز.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.72, 0.58]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size > 0 && blob.size <= MAX_BYTES) {
        return new File([blob], "repair-intake.jpg", { type: "image/jpeg" });
      }
    }
    throw new Error("الصورة كبيرة جداً. جرّب صورة أخرى أو قرّب الجهاز بالكاميرا.");
  } finally {
    bitmap.close();
  }
}

export function IntakePhotoPicker({
  photo,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  photo: File | null;
  onChange: (photo: File | null) => void;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function pick(file?: File) {
    if (!file || disabled || busy) return;
    setError("");
    setBusy(true);
    onBusyChange(true);
    try {
      onChange(await prepareImage(file));
    } catch (cause) {
      onChange(null);
      setError(cause instanceof Error ? cause.message : "تعذر تجهيز الصورة.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-indigo-300 bg-white/80 p-4">
      <div>
        <h4 className="text-sm font-bold text-slate-800">صورة الجهاز عند الاستلام <span className="font-normal text-slate-500">(اختياري)</span></h4>
        <p className="mt-1 text-xs text-slate-600">وثّق حالة الجهاز عند الاستلام. تُحفظ الصورة داخل التذكرة، ولا تظهر للعميل في رابط التتبع.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}>
          <Camera className="h-4 w-4" />
          تصوير الجهاز
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={disabled || busy} onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void pick(file);
          }} />
        </label>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 ${disabled || busy ? "pointer-events-none opacity-50" : ""}`}>
          <ImagePlus className="h-4 w-4" />
          اختيار صورة
          <input type="file" accept="image/*" className="sr-only" disabled={disabled || busy} onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void pick(file);
          }} />
        </label>
        {photo && !busy ? (
          <button type="button" disabled={disabled} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-rose-700 hover:bg-rose-50" onClick={() => onChange(null)}>
            <Trash2 className="h-4 w-4" />
            إزالة الصورة
          </button>
        ) : null}
      </div>
      {busy ? <p role="status" className="flex items-center gap-2 text-xs text-indigo-700"><Loader2 className="h-4 w-4 animate-spin" />جارٍ تجهيز الصورة...</p> : null}
      {error ? <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p> : null}
      {preview ? (
        <div className="relative max-w-[320px] overflow-hidden rounded-xl border border-slate-200">
          <Image src={preview} alt="معاينة صورة الجهاز قبل الحفظ" width={640} height={480} unoptimized className="h-auto max-h-64 w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
