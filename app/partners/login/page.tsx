"use client";

import { useState } from "react";
import { Handshake, Loader2, Lock, Mail } from "lucide-react";
import { partnerLoginAction } from "../actions";

export default function PartnerLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await partnerLoginAction(new FormData(event.currentTarget));
    if (result && !result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-white flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-300 border border-teal-500/20">
            <Handshake className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black">بوابة وكلاء مسار</h1>
          <p className="mt-2 text-xs font-semibold text-slate-400">إدارة العملاء وطلبات تفعيل الاشتراكات</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
          {error ? (
            <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-black text-slate-300">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                <input name="email" type="email" required dir="ltr" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pr-10 pl-3 text-sm outline-none focus:border-teal-500" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black text-slate-300">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                <input name="password" type="password" required className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pr-10 pl-3 text-sm outline-none focus:border-teal-500" />
              </div>
            </div>
            <button disabled={loading} type="submit" className="flex h-12 w-full items-center justify-center rounded-xl bg-teal-500 text-sm font-black text-slate-950 transition hover:bg-teal-400 disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "دخول البوابة"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] font-semibold leading-5 text-slate-500">
            حسابات الوكلاء تُنشأ من إدارة مسار فقط. لا تستخدم بيانات دخول متجر العميل هنا.
          </p>
        </div>
      </div>
    </div>
  );
}
