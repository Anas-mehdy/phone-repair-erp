import Link from "next/link";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { ForgotPasswordForm } from "./_form";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
      <section className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-7 shadow-2xl sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-slate-950">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-black">استعادة كلمة المرور</h1>
        <p className="mt-2 text-center text-xs leading-6 text-slate-400">أدخل بريد حسابك وسنرسل إليك رابطاً آمناً صالحاً لمدة 15 دقيقة.</p>
        <ForgotPasswordForm />
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5 text-xs">
          <Link href="/login" className="inline-flex items-center gap-1.5 font-bold text-teal-400 hover:text-teal-300"><ArrowRight className="h-4 w-4" />العودة لتسجيل الدخول</Link>
          <span className="inline-flex items-center gap-1 text-slate-500"><ShieldCheck className="h-3.5 w-3.5" />رابط لمرة واحدة</span>
        </div>
      </section>
    </main>
  );
}
