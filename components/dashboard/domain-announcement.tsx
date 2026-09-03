"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe2, X } from "lucide-react";
import { APP_URL } from "@/lib/app-url";

const STORAGE_KEY = "massar_official_domain_announcement_dismissed";

export function DomainAnnouncement() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(window.localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  if (!isVisible) return null;

  function dismiss() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setIsVisible(false);
  }

  return (
    <section className="masar-domain-announcement relative overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-l from-teal-50 via-cyan-50/80 to-white px-4 py-3.5 shadow-sm sm:px-5">
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-teal-500 to-cyan-500" />
      <div className="flex items-start gap-3 pl-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
          <Globe2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-teal-950">العنوان الرسمي الجديد لمنصة مسار</p>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">
            أصبح بإمكانك الدخول إلى النظام من <span dir="ltr" className="font-black text-teal-800">massarerp.com</span>. رابط Vercel القديم سيبقى متاحاً مؤقتاً لضمان انتقال آمن.
          </p>
          <a
            href={APP_URL}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-teal-700 hover:text-teal-900"
          >
            فتح الدومين الرسمي
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="إخفاء الإعلان"
        className="absolute left-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
