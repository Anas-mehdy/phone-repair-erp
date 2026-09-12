import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpenText, CreditCard } from "lucide-react";
import { getAuthContext } from "@/lib/auth/context";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";

export default async function SupportLayout({ children }: { children: ReactNode }) {
  try {
    const auth = await getAuthContext({ allowRedirect: false });
    const access = await entitlementService.checkCanAccessPrioritySupport(auth.shop.id);

    if (!access.allowed && access.code === "LIFETIME_MAINTENANCE_EXPIRED") {
      return <div className="support-workspace mx-auto max-w-3xl py-8">
        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <h1 className="text-lg font-black text-slate-950">الدعم الفني المباشر يحتاج تجديد الصيانة السنوية</h1>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">ترخيص مدى الحياة الأساسي ما زال فعالاً، والنظام وبيانات متجرك والميزات الأساسية مستمرة بدون إيقاف. بعد انتهاء مهلة الـ30 يوم يتوقف استحقاق الدعم الفني المباشر والميزات الجديدة المرتبطة بالصيانة حتى تسجيل الدفعة السنوية.</p>
              <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">الإصلاحات الأمنية والتصحيحات الأساسية تبقى متاحة للجميع ولا يتم حجبها بسبب رسم الصيانة.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/subscription" className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-black text-white hover:bg-rose-500"><CreditCard className="h-4 w-4" />عرض حالة الرسم والتجديد</Link>
            <Link href="/help" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50"><BookOpenText className="h-4 w-4" />فتح مركز المساعدة</Link>
          </div>
        </div>
      </div>;
    }
  } catch (error) {
    console.error("[SupportMaintenanceGuard] Failed to resolve maintenance support access", error);
  }

  return <div className="support-workspace">{children}</div>;
}
