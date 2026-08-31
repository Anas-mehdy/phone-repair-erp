import { CirclePlay, ExternalLink, Lightbulb } from "lucide-react";

export const metadata = {
  title: "فيديو شرح مسار | مسار",
};

export default function TutorialPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-md shadow-violet-500/20">
            <CirclePlay className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-900">فيديو شرح مسار</h1>
            <p className="mt-1 text-sm font-medium leading-7 text-slate-600">
              شاهد الشرح الكامل لتتعرف على أقسام النظام وأهم الميزات وطريقة استخدام مسار في عملك اليومي.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
          <div className="relative aspect-video w-full">
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/Z6yl2VWgUT0?rel=0"
              title="فيديو شرح مسار"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4 text-xs font-bold text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 shrink-0 text-cyan-700" />
            <span>يمكنك العودة لهذا الفيديو في أي وقت من القائمة الجانبية.</span>
          </div>
          <a
            href="https://youtu.be/Z6yl2VWgUT0"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-cyan-700 hover:text-cyan-800"
          >
            فتح على YouTube
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
