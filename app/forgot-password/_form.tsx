"use client";

import { useActionState } from "react";
import { Mail, Send } from "lucide-react";
import { requestPasswordResetAction, type PasswordActionState } from "@/app/actions/passwordActions";

const initialState: PasswordActionState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={action} className="mt-7 space-y-4">
      {state.error ? <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">{state.error}</p> : null}
      {state.success ? <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold leading-6 text-emerald-300">{state.success}</p> : null}
      <div>
        <label className="mb-2 block text-xs font-bold text-slate-300">البريد الإلكتروني</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input type="email" name="email" required dir="ltr" placeholder="name@example.com" className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-3 pr-10 text-sm text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>
      </div>
      <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-sm font-black text-slate-950 disabled:opacity-60">
        <Send className="h-4 w-4" />{pending ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
      </button>
    </form>
  );
}
