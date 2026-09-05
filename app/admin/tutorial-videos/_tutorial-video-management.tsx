"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, CirclePlay, ExternalLink, Save, Trash2, Youtube } from "lucide-react";
import { adminSaveTutorialVideoAction, type TutorialVideoActionState } from "./actions";

const INITIAL_TUTORIAL_VIDEO_ACTION_STATE: TutorialVideoActionState = { success: false };

export type TutorialVideoAdminItem = {
  categoryKey: string;
  title: string;
  description: string;
  youtubeUrl: string | null;
  isEnabled: boolean;
  updatedAt: string | null;
};

function VideoCard({ item, action, pending, actionState }: {
  item: TutorialVideoAdminItem;
  action: (payload: FormData) => void;
  pending: boolean;
  actionState: TutorialVideoActionState;
}) {
  const [url, setUrl] = useState(item.youtubeUrl ?? "");
  const [enabled, setEnabled] = useState(item.isEnabled);

  useEffect(() => {
    if (!actionState.success || actionState.categoryKey !== item.categoryKey) return;
    setUrl(actionState.normalizedUrl ?? "");
    setEnabled(Boolean(actionState.isEnabled));
  }, [actionState, item.categoryKey]);

  const messageForCard = actionState.categoryKey === item.categoryKey ? actionState : null;

  return (
    <form action={action} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10">
      <input type="hidden" name="categoryKey" value={item.categoryKey} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-white">{item.title}</h2>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">{item.description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${enabled && url ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
          {enabled && url ? "ظاهر للمستخدمين" : url ? "محفوظ ومخفي" : "بدون فيديو"}
        </span>
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-[10px] font-black text-slate-300">رابط YouTube</span>
        <div className="relative">
          <Youtube className="absolute right-3 top-3 h-4 w-4 text-red-400" />
          <input
            name="youtubeUrl"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://youtu.be/..."
            dir="ltr"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 pr-10 text-left font-mono text-xs text-slate-200 outline-none transition focus:border-cyan-500"
          />
        </div>
      </label>

      <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
        <input type="checkbox" name="isEnabled" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-4 w-4 accent-teal-500" />
        <span className="text-[11px] font-black text-slate-300">إظهار هذا الفيديو في صفحة شرح مسار</span>
      </label>

      {messageForCard?.message ? <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" />{messageForCard.message}</div> : null}
      {messageForCard?.error ? <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">{messageForCard.error}</div> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" name="intent" value="save" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-[11px] font-black text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"><Save className="h-4 w-4" />{pending ? "جارٍ الحفظ..." : "حفظ الفيديو"}</button>
        {url ? <button type="submit" name="intent" value="clear" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-[11px] font-black text-rose-300 hover:bg-rose-500/15 disabled:opacity-50"><Trash2 className="h-4 w-4" />حذف الرابط</button> : null}
        {url ? <a href={url} target="_blank" rel="noreferrer" className="mr-auto inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-700 px-3 text-[10px] font-black text-slate-300 hover:bg-slate-800"><ExternalLink className="h-3.5 w-3.5" />فتح الفيديو</a> : null}
      </div>
      {item.updatedAt ? <p className="mt-3 text-[9px] font-semibold text-slate-600">آخر تحديث: {new Date(item.updatedAt).toLocaleString("ar")}</p> : null}
    </form>
  );
}

export function TutorialVideoManagement({ initialItems }: { initialItems: TutorialVideoAdminItem[] }) {
  const [state, action, pending] = useActionState(adminSaveTutorialVideoAction, INITIAL_TUTORIAL_VIDEO_ACTION_STATE);
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-l from-violet-500/10 via-slate-900 to-cyan-500/10 p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300"><CirclePlay className="h-5 w-5" /></span>
          <div><h1 className="text-xl font-black text-white">فيديوهات شرح مسار</h1><p className="mt-1 max-w-3xl text-xs font-semibold leading-6 text-slate-400">أضف أو غيّر رابط YouTube لكل قسم بشكل مستقل. يمكن حفظ رابط وإخفاؤه مؤقتاً، أو حذف الرابط بالكامل بدون تعديل الكود أو إعادة نشر التطبيق.</p></div>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        {initialItems.map((item) => <VideoCard key={item.categoryKey} item={item} action={action} pending={pending} actionState={state} />)}
      </div>
    </div>
  );
}
