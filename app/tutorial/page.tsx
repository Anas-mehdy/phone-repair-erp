import {
  ArrowLeftRight,
  Banknote,
  BookOpenText,
  Boxes,
  CalendarClock,
  ChartNoAxesCombined,
  CirclePlay,
  Code2,
  ExternalLink,
  PlayCircle,
  ShoppingCart,
  Wrench,
  Youtube,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { tutorialVideoService } from "@/lib/services/tutorialVideoService";
import {
  getTutorialVideoCategory,
  type TutorialVideoIcon,
} from "@/lib/tutorial/categories";
import { TutorialVideoTracker } from "./_tutorial-video-tracker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "شرح نظام مسار | مسار",
};

const ICONS: Record<TutorialVideoIcon, LucideIcon> = {
  WRENCH: Wrench,
  SHOPPING_CART: ShoppingCart,
  CODE: Code2,
  ZAP: Zap,
  BOXES: Boxes,
  CALENDAR: CalendarClock,
  BOOK: BookOpenText,
  BANKNOTE: Banknote,
  TRANSFER: ArrowLeftRight,
  CHART: ChartNoAxesCombined,
};

type TutorialPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function TutorialPage({ searchParams }: TutorialPageProps) {
  const params = await searchParams;
  const settings = await tutorialVideoService.getSettings();
  const requested = getTutorialVideoCategory(params.category);
  const firstAvailable = settings.find((item) => item.isEnabled && item.embedUrl) ?? null;
  const active =
    (requested ? settings.find((item) => item.categoryKey === requested.key) : null) ??
    firstAvailable ??
    settings[0];
  const availableCount = settings.filter((item) => item.isEnabled && item.embedUrl).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-cyan-50/50 to-teal-50/60 p-5 shadow-sm dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-md shadow-violet-500/20">
              <CirclePlay className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 sm:text-2xl">شرح نظام مسار</h1>
              <p className="mt-1 max-w-2xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                اختر القسم الذي تريد شرحه وشاهد الفيديو الخاص به مباشرة بدون الحاجة لمشاهدة شرح طويل لكل النظام.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/90 bg-white/80 px-4 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
            <div className="font-numeric text-xl font-black text-teal-700 dark:text-teal-300">{availableCount}/10</div>
            <div className="mt-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">فيديو متاح حالياً</div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {settings.map((item) => {
          const Icon = ICONS[item.icon];
          const selected = item.categoryKey === active.categoryKey;
          const available = Boolean(item.isEnabled && item.embedUrl);
          return (
            <Link
              key={item.categoryKey}
              href={`/tutorial?category=${encodeURIComponent(item.categoryKey)}#tutorial-video`}
              className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                selected
                  ? "border-teal-300 bg-teal-50 shadow-sm ring-1 ring-teal-100 dark:border-teal-700 dark:bg-teal-950/45 dark:ring-teal-800"
                  : "border-slate-200 bg-white hover:border-teal-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    selected
                      ? "bg-teal-600 text-white dark:bg-teal-500"
                      : "bg-slate-50 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700 dark:bg-slate-950 dark:text-slate-300 dark:group-hover:bg-teal-950/70 dark:group-hover:text-teal-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-black ${
                    available
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  {available ? "متوفر" : "قريباً"}
                </span>
              </div>
              <h2 className="mt-4 text-xs font-black text-slate-900 dark:text-slate-50">{item.title}</h2>
              <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
            </Link>
          );
        })}
      </section>

      <section
        id="tutorial-video"
        className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-teal-700 dark:text-teal-300">
              <PlayCircle className="h-4 w-4" /> الفيديو المحدد
            </div>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-slate-50">{active.title}</h2>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{active.description}</p>
          </div>
          {active.youtubeUrl && active.isEnabled ? (
            <a
              href={active.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950/80"
            >
              <Youtube className="h-4 w-4" /> فتح على YouTube <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>

        {active.isEnabled && active.embedUrl ? (
          <>
            <TutorialVideoTracker categoryKey={active.categoryKey} />
            <div className="bg-black p-0 sm:p-4">
              <div className="relative aspect-video w-full overflow-hidden sm:rounded-2xl">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={active.embedUrl}
                  title={`شرح ${active.title} في مسار`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-5 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <CirclePlay className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-sm font-black text-slate-800 dark:text-slate-100">فيديو هذا القسم لم يُضف بعد</h3>
            <p className="mt-2 max-w-md text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">
              سيظهر الفيديو هنا تلقائياً فور إضافته من لوحة إدارة مسار.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
