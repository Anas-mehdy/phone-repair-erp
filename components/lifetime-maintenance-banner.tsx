import Link from "next/link";
import { AlertTriangle, CalendarClock, ShieldCheck, Wrench } from "lucide-react";
import {
  LIFETIME_MAINTENANCE_GRACE_DAYS,
  resolveLifetimeMaintenancePolicy,
} from "@/lib/subscription/lifetime-maintenance-policy";

export function LifetimeMaintenanceBanner({
  status,
  amount,
  currencyCode,
  dueAt,
  daysUntilDue,
}: {
  status: "DUE_SOON" | "OVERDUE";
  amount: number;
  currencyCode: string;
  dueAt: Date;
  daysUntilDue: number;
}) {
  const policy = resolveLifetimeMaintenancePolicy({
    status,
    nextDueAt: dueAt,
    daysUntilDue,
  });
  const inGrace = policy.status === "GRACE_PERIOD";
  const expired = policy.status === "EXPIRED";

  return <div className={`border-b px-4 py-2.5 ${expired ? "border-rose-200 bg-rose-50 text-rose-900" : inGrace ? "border-orange-200 bg-orange-50 text-orange-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
    <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs font-bold sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        {expired ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> : inGrace ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /> : <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
        <span>
          {expired
            ? "انتهت مهلة تجديد الصيانة والتحديثات"
            : inGrace
              ? `رسم الصيانة والتحديث السنوي مستحق — أنت ضمن مهلة ${LIFETIME_MAINTENANCE_GRACE_DAYS} يوم`
              : "موعد رسم الصيانة والتحديث السنوي قريب"}
          {" — "}{amount.toLocaleString()} {currencyCode}
          {expired
            ? ". ترخيص مدى الحياة الأساسي ما زال فعالاً، لكن الدعم والميزات الجديدة المرتبطة بالصيانة تحتاج إلى التجديد. الإصلاحات الأمنية والأساسية تستمر للجميع."
            : inGrace
              ? `، متبقي ${policy.graceDaysRemaining ?? 0} يوم من المهلة. يبقى النظام وكامل الاستحقاقات الحالية فعالة خلال المهلة.`
              : `، الاستحقاق بعد ${Math.max(0, daysUntilDue)} يوم (${dueAt.toLocaleDateString("ar-SA")}).`}
        </span>
      </div>
      <Link href="/subscription" className={`inline-flex shrink-0 items-center gap-1 rounded-lg border bg-white px-3 py-1.5 font-black ${expired ? "border-rose-200 text-rose-700" : inGrace ? "border-orange-200 text-orange-700" : "border-amber-200 text-amber-700"}`}>
        <Wrench className="h-3.5 w-3.5" />
        {expired ? "تجديد الصيانة" : "تفاصيل الاشتراك"}
      </Link>
    </div>
  </div>;
}
