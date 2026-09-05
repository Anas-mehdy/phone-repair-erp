"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CirclePlay, X } from "lucide-react";
import { markTutorialBannerSeenAction } from "@/app/actions/tutorialActions";

export function TutorialOnboarding({ initialShowBanner }: { initialShowBanner: boolean }) {
  const pathname = usePathname();
  const [showBanner, setShowBanner] = useState(initialShowBanner);

  useEffect(() => {
    if (!initialShowBanner) return;
    void markTutorialBannerSeenAction().catch(() => undefined);
  }, [initialShowBanner]);

  if (pathname !== "/dashboard") return null;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
      {showBanner && (
        <section className="mb-4 flex flex-col gap-4 rounded-2xl border border-violet-200 bg-gradient-to-l from-violet-50 via-white to-cyan-50 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-md shadow-violet-500/20">
              <CirclePlay className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-900">جديد على مسار؟ ابدأ من هنا</p>
              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-600">
                اختر القسم الذي تحتاجه وافتح شروحات مسار الخاص به مباشرة: الصيانة، المبيعات، المخزون، المالية وغيرها.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/tutorial"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-violet-700"
            >
              <CirclePlay className="h-4 w-4" />
              شاهد فيديو الشرح
            </Link>
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              aria-label="إغلاق بانر فيديو الشرح"
              title="إغلاق"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
            <CirclePlay className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-black text-slate-900">تحتاج شرح سريع لقسم معيّن؟</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500">فيديو مستقل لكل قسم من أقسام مسار، متاح لك في أي وقت.</p>
          </div>
        </div>
        <Link href="/tutorial" className="text-xs font-black text-cyan-700 hover:text-cyan-800">
          فتح مكتبة شروحات مسار ←
        </Link>
      </section>
    </div>
  );
}
