"use client";

import { useState } from "react";
import { Copy, Link2, UserPlus } from "lucide-react";
import { partnerCreateClientInvitationAction } from "./actions";

type InvitationItem = {
  id: string;
  clientName: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export function PartnerClientOnboarding({ partnerCode, invitations }: { partnerCode: string; invitations: InvitationItem[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const publicPath = `/register/partner/${encodeURIComponent(partnerCode)}`;

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(null); setInviteUrl(null);
    const result = await partnerCreateClientInvitationAction(new FormData(event.currentTarget));
    setLoading(false);
    if (!result.success || !result.token) { setMessage(result.error || "تعذر إنشاء الدعوة."); return; }
    const url = `${window.location.origin}/partner-invite/${result.token}`;
    setInviteUrl(url);
    setMessage("تم إنشاء دعوة العميل. انسخ الرابط وأرسله للعميل.");
    event.currentTarget.reset();
  }

  async function copy(text: string) {
    const absolute = text.startsWith("http") ? text : `${window.location.origin}${text}`;
    await navigator.clipboard.writeText(absolute);
    setMessage("تم نسخ الرابط.");
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 text-base font-black"><UserPlus className="h-5 w-5 text-teal-400" /> إضافة عميل جديد</h2>
        <p className="mt-1 text-xs font-bold text-slate-500">أنشئ دعوة خاصة. العميل يسجل متجره ويُربط بحسابك تلقائياً من أول لحظة.</p>
        <form onSubmit={createInvite} className="mt-4 space-y-3">
          <input name="clientName" required minLength={2} placeholder="اسم العميل" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" />
          <input name="email" type="email" required placeholder="البريد الإلكتروني للعميل" dir="ltr" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" />
          <button disabled={loading} className="w-full rounded-xl bg-teal-500 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50">{loading ? "جاري الإنشاء..." : "إنشاء دعوة التسجيل"}</button>
        </form>
        {inviteUrl ? <div className="mt-3 flex gap-2"><input readOnly value={inviteUrl} dir="ltr" className="min-w-0 flex-1 rounded-xl border border-teal-500/30 bg-slate-950 px-3 py-2 text-xs text-teal-200" /><button onClick={() => copy(inviteUrl)} className="rounded-xl border border-slate-700 px-3"><Copy className="h-4 w-4" /></button></div> : null}
        {message ? <div className="mt-3 text-xs font-bold text-teal-300">{message}</div> : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 text-base font-black"><Link2 className="h-5 w-5 text-cyan-400" /> رابط التسجيل العام الخاص بك</h2>
        <p className="mt-1 text-xs font-bold text-slate-500">استخدمه لأي عميل جديد. أي متجر يُنشأ من هذا الرابط يرتبط بك تلقائياً.</p>
        <div className="mt-4 flex gap-2"><input readOnly value={publicPath} dir="ltr" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs" /><button onClick={() => copy(publicPath)} className="rounded-xl bg-slate-800 px-4 text-xs font-black">نسخ</button></div>
        <div className="mt-5 border-t border-slate-800 pt-4">
          <div className="mb-2 text-xs font-black text-slate-300">آخر الدعوات</div>
          <div className="max-h-44 space-y-2 overflow-y-auto">
            {invitations.slice(0, 8).map((i) => <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 p-2.5 text-xs"><div><div className="font-black">{i.clientName}</div><div className="text-slate-500" dir="ltr">{i.email}</div></div><span className={i.status === "USED" ? "text-emerald-400" : i.status === "PENDING" ? "text-amber-400" : "text-slate-500"}>{i.status === "USED" ? "سجّل" : i.status === "PENDING" ? "بانتظار التسجيل" : "منتهية"}</span></div>)}
            {invitations.length === 0 ? <div className="text-xs font-bold text-slate-600">لا توجد دعوات حتى الآن.</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
