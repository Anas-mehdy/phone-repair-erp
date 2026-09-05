import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpenText, CheckCircle2, Clock3, Lightbulb } from "lucide-react";
import { HelpArticleTracker } from "@/components/help/help-article-tracker";
import { HelpSupportLink } from "@/components/help/help-support-link";
import { HELP_ARTICLES, HELP_CATEGORY_LABELS, getHelpArticle } from "@/lib/help/catalog";

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <HelpArticleTracker slug={article.slug} category={article.category} />
      <Link href={`/help?category=${article.category}`} className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-700 hover:text-teal-800 dark:text-teal-300"><ArrowRight className="h-3.5 w-3.5" />العودة إلى {HELP_CATEGORY_LABELS[article.category]}</Link>

      <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <header className="border-b border-slate-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 sm:p-7 dark:border-slate-800 dark:from-teal-950/25 dark:via-slate-950 dark:to-cyan-950/20"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white"><BookOpenText className="h-5 w-5" /></span><div><div className="text-[10px] font-black text-teal-700 dark:text-teal-300">{HELP_CATEGORY_LABELS[article.category]}</div><h1 className="mt-1 text-xl font-black leading-8 text-slate-950 dark:text-slate-50">{article.title}</h1><p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{article.summary}</p><div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><Clock3 className="h-3.5 w-3.5" />حوالي {article.estimatedMinutes} دقيقة</div></div></div></header>

        <div className="space-y-6 p-5 sm:p-7">
          <section><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">الخطوات</h2><div className="mt-3 space-y-3">{article.steps.map((step, index) => <div key={step} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/50"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-teal-600 font-numeric text-[11px] font-black text-white">{index + 1}</span><p className="pt-1 text-xs font-semibold leading-6 text-slate-700 dark:text-slate-300">{step}</p></div>)}</div></section>

          {article.tips?.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300"><Lightbulb className="h-4 w-4" />ملاحظة مهمة</div><div className="mt-2 space-y-1.5">{article.tips.map((tip) => <div key={tip} className="flex items-start gap-2 text-[11px] font-semibold leading-5 text-amber-900/80 dark:text-amber-200/80"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tip}</div>)}</div></section> : null}

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 sm:flex-row dark:border-slate-800">{article.cta ? <Link href={article.cta.href} className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-4 text-[11px] font-black text-white hover:bg-teal-700">{article.cta.label}</Link> : null}<HelpSupportLink articleSlug={article.slug} /></div>
        </div>
      </article>
    </div>
  );
}
