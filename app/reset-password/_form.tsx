"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { resetPasswordAction, type PasswordActionState } from "@/app/actions/passwordActions";

const initialState: PasswordActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={action} className="mt-7 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error ? <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-300">{state.error}</p> : null}
      <PasswordField name="password" label="كلمة المرور الجديدة" />
      <PasswordField name="passwordConfirmation" label="تأكيد كلمة المرور" />
      <p className="text-[11px] leading-5 text-slate-500">استخدم 8 أحرف على الأقل، ويفضل مزج الحروف والأرقام.</p>
      <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-sm font-black text-slate-950 disabled:opacity-60">
        <LockKeyhole className="h-4 w-4" />{pending ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
      </button>
    </form>
  );
}

function PasswordField({ name, label }: { name: string; label: string }) {
  return <div><label className="mb-2 block text-xs font-bold text-slate-300">{label}</label><input type="password" name={name} required minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" /></div>;
}
