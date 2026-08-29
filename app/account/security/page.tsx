import { KeyRound, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getAuthContext } from "@/lib/auth/context";
import { ChangePasswordForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const auth = await getAuthContext();

  return (
    <div className="space-y-6">
      <PageHeader title="أمان الحساب" description="تغيير كلمة المرور وحماية جلسات الدخول الخاصة بحسابك." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="erp-card p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100"><KeyRound className="h-5 w-5" /></span>
            <div><h2 className="text-sm font-black text-slate-900">تغيير كلمة المرور</h2><p className="mt-1 text-[11px] font-semibold text-slate-500">الحساب: <span dir="ltr">{auth.user.email}</span></p></div>
          </div>
          <ChangePasswordForm />
        </section>
        <aside className="rounded-3xl border border-cyan-100 bg-gradient-to-b from-cyan-50 to-white p-6">
          <ShieldCheck className="h-8 w-8 text-teal-700" />
          <h3 className="mt-4 text-sm font-black text-slate-900">ماذا يحدث بعد التغيير؟</h3>
          <ul className="mt-3 space-y-3 text-xs font-semibold leading-6 text-slate-600">
            <li>• يتم تسجيل خروجك من الجهاز الحالي.</li>
            <li>• تُلغى جميع جلسات الدخول القديمة.</li>
            <li>• تسجّل دخولك مجدداً بالكلمة الجديدة.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
