"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpenText, ChevronLeft, CircleHelp, Headphones, Search, X } from "lucide-react";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  HELP_CATEGORY_LABELS,
  getContextualHelpArticles,
  helpContextKeyForPath,
} from "@/lib/help/catalog";

const HIDDEN_PREFIXES = ["/admin", "/help", "/support", "/tutorial", "/onboarding"];

export function ContextualHelp() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const contextKey = useMemo(() => helpContextKeyForPath(pathname), [pathname]);
  const articles = useMemo(() => getContextualHelpArticles(pathname, 3), [pathname]);

  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;

  function openPanel() {
    setOpen(true);
    captureClientEvent(ANALYTICS_EVENTS.CONTEXTUAL_HELP_OPENED, {
      context_key: contextKey,
      article_count: articles.length,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label="فتح مساعدة هذه الصفحة"
        title="مساعدة هذه الصفحة"
        className="fixed bottom-[92px] right-4 z-[57] flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-200 bg-white text-teal-700 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-teal-50 lg:bottom-6 lg:left-44 lg:right-auto dark:border-teal-900 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-teal-950/50"
      >
        <CircleHelp className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-start bg-slate-950/35 p-3 backdrop-blur-[1px] sm:items-stretch sm:p-0" onMouseDown={() => setOpen(false)}>
          <aside
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:h-full sm:rounded-none sm:rounded-r-3xl dark:border-slate-800 dark:bg-slate-950"
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="مساعدة هذه الصفحة"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 dark:border-slate-800 dark:from-teal-950/30 dark:via-slate-950 dark:to-cyan-950/20">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black text-teal-700 dark:text-teal-300"><CircleHelp className="h-4 w-4" />مساعدة هذه الصفحة</div>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">{HELP_CATEGORY_LABELS[contextKey]}</h2>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">إجابات قصيرة مرتبطة بالمكان الذي تعمل فيه الآن.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" aria-label="إغلاق المساعدة"><X className="h-4 w-4" /></button>
            </div>

            <div className="max-h-[68vh] space-y-3 overflow-y-auto p-4 sm:max-h-none sm:h-[calc(100%-170px)]">
              {articles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/help/${article.slug}`}
                  onClick={() => {
                    captureClientEvent(ANALYTICS_EVENTS.CONTEXTUAL_HELP_ARTICLE_CLICKED, {
                      context_key: contextKey,
                      article_slug: article.slug,
                    });
                    setOpen(false);
                  }}
                  className="group block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:bg-teal-50/40 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="text-[13px] font-black leading-6 text-slate-900 group-hover:text-teal-800 dark:text-slate-100 dark:group-hover:text-teal-300">{article.title}</h3><p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{article.summary}</p></div>
                    <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-teal-600" />
                  </div>
                  <div className="mt-2 text-[9px] font-bold text-slate-400">حوالي {article.estimatedMinutes} دقيقة</div>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
              <Link href={`/help?category=${contextKey}`} onClick={() => setOpen(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-[11px] font-black text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"><Search className="h-3.5 w-3.5" />بحث في المساعدة</Link>
              <Link href="/support" onClick={() => { captureClientEvent(ANALYTICS_EVENTS.HELP_SUPPORT_ESCALATED, { source: "contextual_help", context_key: contextKey }); setOpen(false); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Headphones className="h-3.5 w-3.5" />الدعم الفني</Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
