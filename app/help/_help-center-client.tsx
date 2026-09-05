"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { BookOpenText, ChevronLeft, Headphones, Search, Sparkles } from "lucide-react";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  HELP_ARTICLES,
  HELP_CATEGORY_LABELS,
  searchHelpArticles,
  type HelpCategory,
} from "@/lib/help/catalog";

const CATEGORIES = Object.keys(HELP_CATEGORY_LABELS) as HelpCategory[];

export function HelpCenterClient({ initialCategory }: { initialCategory: HelpCategory | null }) {
  const [category, setCategory] = useState<HelpCategory | null>(initialCategory);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchHelpArticles(query, category), [query, category]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    setQuery(next);
    const count = searchHelpArticles(next, category).length;
    captureClientEvent(ANALYTICS_EVENTS.HELP_SEARCH_USED, {
      has_query: Boolean(next),
      category: category ?? "ALL",
      results_count: count,
    });
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:from-teal-950/25 dark:via-slate-950 dark:to-cyan-950/20">
        <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white"><BookOpenText className="h-6 w-6" /></span><div><div className="flex items-center gap-1 text-[10px] font-black text-teal-700 dark:text-teal-300"><Sparkles className="h-3.5 w-3.5" />حل المشكلة قبل ما توقف شغلك</div><h1 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl dark:text-slate-50">مركز مساعدة مسار</h1><p className="mt-1 max-w-2xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">ابحث عن الخطوة التي تحتاجها. الشروحات قصيرة ومبنية على طريقة عمل النظام الفعلية، وإذا ما لقيت جوابك تقدر تنتقل للدعم مباشرة.</p></div></div>
        <form onSubmit={submitSearch} className="mt-5 flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" /><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="مثال: ليش نقص رصيد المحفظة؟ أو كيف أرسل تتبع الجهاز؟" className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-xs font-semibold text-slate-800 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" /></div><button type="submit" className="h-11 rounded-xl bg-slate-900 px-5 text-xs font-black text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950">بحث</button></form>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setCategory(null); setQuery(""); }} className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${category === null ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>كل المواضيع</button>
        {CATEGORIES.map((key) => <button key={key} type="button" onClick={() => { setCategory(key); setQuery(""); }} className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${category === key ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{HELP_CATEGORY_LABELS[key]}</button>)}
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{query ? "نتائج البحث" : category ? HELP_CATEGORY_LABELS[category] : "كل الشروحات"}</h2><p className="mt-1 text-[10px] font-semibold text-slate-400">{results.length} موضوع متاح</p></div></div>
        {results.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{results.map((article) => <Link key={article.slug} href={`/help/${article.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-teal-800"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[9px] font-black text-teal-700 dark:text-teal-300">{HELP_CATEGORY_LABELS[article.category]}</div><h3 className="mt-1 text-[13px] font-black leading-6 text-slate-900 group-hover:text-teal-800 dark:text-slate-100 dark:group-hover:text-teal-300">{article.title}</h3></div><ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-slate-300 group-hover:text-teal-600" /></div><p className="mt-2 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{article.summary}</p><div className="mt-3 text-[9px] font-bold text-slate-400">حوالي {article.estimatedMinutes} دقيقة</div></Link>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40"><Search className="mx-auto h-6 w-6 text-slate-300" /><h3 className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">ما لقينا موضوع مطابق</h3><p className="mt-1 text-xs font-semibold text-slate-400">جرّب كلمات أبسط، أو انتقل للدعم الفني إذا المشكلة توقف شغلك.</p></div>}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/50"><div><h2 className="text-xs font-black text-slate-900 dark:text-slate-100">ما لقيت جوابك؟</h2><p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">انتقل للدعم الفني واذكر الصفحة والخطوة التي توقفت عندها.</p></div><Link href="/support" onClick={() => captureClientEvent(ANALYTICS_EVENTS.HELP_SUPPORT_ESCALATED, { source: "help_center", context_key: category ?? "ALL" })} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-[11px] font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-300"><Headphones className="h-4 w-4" />التواصل مع الدعم</Link></section>
    </div>
  );
}
