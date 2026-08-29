import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, KeyRound } from "lucide-react";
import { passwordResetService } from "@/lib/services/passwordResetService";
import { ResetPasswordForm } from "./_form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تعيين كلمة مرور جديدة | مسار", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await passwordResetService.isTokenValid(token);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      <div className="pointer-events-none absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <section className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-7 shadow-2xl sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-slate-950">
          {valid ? <KeyRound className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
        </div>
        <h1 className="mt-5 text-center text-2xl font-black">{valid ? "تعيين كلمة مرور جديدة" : "الرابط غير صالح"}</h1>
        {valid ? (
          <>
            <p className="mt-2 text-center text-xs leading-6 text-slate-400">اختر كلمة مرور جديدة لحسابك. سيتم إغلاق الجلسات القديمة لحماية الحساب.</p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <div className="mt-6 space-y-5 text-center">
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-bold leading-6 text-amber-300">الرابط منتهي الصلاحية أو تم استخدامه سابقاً. اطلب رابطاً جديداً للمتابعة.</p>
            <Link href="/forgot-password" className="inline-flex items-center gap-1.5 font-bold text-teal-400 hover:text-teal-300"><ArrowRight className="h-4 w-4" />طلب رابط جديد</Link>
          </div>
        )}
      </section>
    </main>
  );
}
