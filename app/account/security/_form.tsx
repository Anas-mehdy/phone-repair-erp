"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { changePasswordAction, type PasswordActionState } from "@/app/actions/passwordActions";

const initialState: PasswordActionState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);
  return (
    <form action={action} className="max-w-xl space-y-4">
      {state.error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{state.error}</p> : null}
      <PasswordField name="currentPassword" label="كلمة المرور الحالية" autoComplete="current-password" minLength={1} />
      <PasswordField name="newPassword" label="كلمة المرور الجديدة" autoComplete="new-password" minLength={8} />
      <PasswordField name="passwordConfirmation" label="تأكيد كلمة المرور الجديدة" autoComplete="new-password" minLength={8} />
      <p className="text-[11px] font-semibold text-slate-500">كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف وأن تختلف عن الحالية.</p>
      <button disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 text-xs font-black text-white shadow-sm hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />{pending ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}</button>
    </form>
  );
}

function PasswordField({ name, label, autoComplete, minLength }: { name: string; label: string; autoComplete: string; minLength: number }) {
  return <div><label className="mb-1.5 block text-xs font-extrabold text-slate-600">{label}</label><input type="password" name={name} required minLength={minLength} autoComplete={autoComplete} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" /></div>;
}
