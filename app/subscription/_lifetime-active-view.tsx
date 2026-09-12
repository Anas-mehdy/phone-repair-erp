import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Crown,
  History,
  Infinity,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  LIFETIME_MAINTENANCE_GRACE_DAYS,
  resolveLifetimeMaintenancePolicy,
} from "@/lib/subscription/lifetime-maintenance-policy";

export type LifetimeMaintenanceStatus = "LEGACY" | "FREE_FIRST_YEAR" | "PAID" | "DUE_SOON" | "OVERDUE";
export type LifetimeMaintenancePaymentView = {
  id: string;
  coverageStart: Date;
  coverageEnd: Date;
  amount: number;
  currencyCode: string;
  paidAt: Date;
  paymentMethod: string | null;
  paymentReference: string | null;
};

export function LifetimeActiveView({
  shopName,
  activatedAt,
  price,
  currencyCode,
  annualMaintenanceAmount,
  maintenanceCurrencyCode,
  maintenanceStartsAt,
  maintenanceStatus,
  nextMaintenanceDueAt,
  maintenanceDaysUntilDue,
  maintenancePayments,
}: {
  shopName: string;
  activatedAt: Date | null;
  price: number | null;
  currencyCode: string | null;
  annualMaintenanceAmount: number | null;
  maintenanceCurrencyCode: string | null;
  maintenanceStartsAt: Date | null;
  maintenanceStatus: LifetimeMaintenanceStatus;
  nextMaintenanceDueAt: Date | null;
  maintenanceDaysUntilDue: number | null;
  maintenancePayments: LifetimeMaintenancePaymentView[];
}) {
  const hasMaintenancePolicy = annualMaintenanceAmount != null && annualMaintenanceAmount > 0;
  const policy = hasMaintenancePolicy
    ? resolveLifetimeMaintenancePolicy({
        status: maintenanceStatus,
        nextDueAt: nextMaintenanceDueAt,
        daysUntilDue: maintenanceDaysUntilDue,
      })
    : null;
  const maintenanceExpired = policy?.status === "EXPIRED";
  const features = [
    "طلبات صيانة غير محدودة",
    "المبيعات ونقطة البيع",
    "الفواتير والدفعات والأقساط",
    "المستودع والمخزون",
    "دليل التوافقات",
    "التقارير والأرباح",
    "حتى 5 مستخدمين",
    hasMaintenancePolicy
      ? maintenanceExpired
        ? "الإصلاحات الأمنية والأساسية مستمرة؛ الدعم والميزات الجديدة تحتاج تجديد الصيانة"
        : "الصيانة والتحديثات والميزات الجديدة وفق الرسم السنوي المتفق عليه"
      : "التحديثات المستمرة وفق شروط الخطة عند التفعيل",
  ];

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">اشتراك مسار</span><h1 className="mt-2 text-2xl font-black text-slate-950">اشتراكي</h1></div><div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"><ShieldCheck className="h-4 w-4 text-emerald-600" />المتجر: {shopName}</div></div>

    {hasMaintenancePolicy ? <MaintenanceStatusBanner
      status={maintenanceStatus}
      amount={annualMaintenanceAmount!}
      currencyCode={maintenanceCurrencyCode || currencyCode || ""}
      nextDueAt={nextMaintenanceDueAt}
      daysUntilDue={maintenanceDaysUntilDue}
    /> : null}

    <section className="overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg shadow-amber-500/10">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_340px] lg:items-center">
        <div>
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950"><Crown className="h-6 w-6 fill-current" /></span><div><div className="flex items-center gap-2"><h2 className="text-xl font-black text-slate-950 sm:text-2xl">ترخيص مدى الحياة مفعل</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">ACTIVE</span></div><p className="mt-1 text-xs font-semibold leading-6 text-slate-600">ترخيص الاستخدام الأساسي لا ينتهي ولا يتوقف بسبب رسم الصيانة. {hasMaintenancePolicy ? `السنة الأولى للصيانة والتحديثات مجانية، وبعد كل استحقاق توجد مهلة ${LIFETIME_MAINTENANCE_GRACE_DAYS} يوم.` : "هذا الاشتراك مفعل وفق الشروط التي تم الاتفاق عليها عند التفعيل."}</p></div></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">{features.map((feature)=><div key={feature} className="flex items-center gap-2 rounded-xl border border-amber-100 bg-white/80 p-3 text-xs font-bold text-slate-800"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-3.5 w-3.5" /></span>{feature}</div>)}</div>
        </div>

        <aside className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white">
          <div className="flex items-center justify-center gap-2 text-amber-300"><Infinity className="h-5 w-5" /><span className="text-xs font-black">مدى الحياة</span></div>
          <div className="mt-4 text-center">{price != null ? <><div className="font-numeric text-4xl font-black">{price.toLocaleString()}</div><div className="mt-1 text-xs font-bold text-slate-400">{currencyCode || ""} — دفعة ترخيص واحدة</div></> : <div className="text-sm font-black">ترخيص استخدام دائم</div>}</div>

          {hasMaintenancePolicy ? <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
            <Wrench className="mx-auto mb-1 h-4 w-4 text-emerald-300" />
            <div className="text-[10px] font-black text-emerald-300">الصيانة والتحديث السنوي</div>
            <div className="mt-1 font-numeric text-lg font-black text-white">{annualMaintenanceAmount!.toLocaleString()} {maintenanceCurrencyCode || currencyCode || ""} <span className="text-xs font-bold text-slate-400">/ سنة</span></div>
            <div className="mt-1 text-[10px] font-bold text-slate-300">السنة الأولى مجانية</div>
            <div className="mt-1 text-[10px] font-bold text-slate-400">مهلة التجديد بعد كل استحقاق: {LIFETIME_MAINTENANCE_GRACE_DAYS} يوم</div>
            {maintenanceStartsAt ? <div className="mt-1 text-[10px] font-bold text-slate-400">أول استحقاق من {maintenanceStartsAt.toLocaleDateString("ar-SA")}</div> : null}
          </div> : null}

          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center text-[11px] font-bold text-slate-300"><Sparkles className="mx-auto mb-1 h-4 w-4 text-amber-300" />{activatedAt ? `مفعل منذ ${activatedAt.toLocaleDateString("ar-SA")}` : "اشتراك مدى الحياة فعال"}</div>
        </aside>
      </div>
    </section>

    {hasMaintenancePolicy ? <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2"><History className="h-5 w-5 text-slate-500" /><div><h3 className="text-sm font-black text-slate-900">سجل رسوم الصيانة والتحديث</h3><p className="mt-0.5 text-[11px] font-semibold text-slate-500">كل دفعة مسجلة توضح السنة التي تغطيها.</p></div></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">{maintenancePayments.length} دفعة</span>
      </div>
      {maintenancePayments.length === 0 ? <div className="px-5 py-8 text-center text-xs font-bold text-slate-400">لا توجد دفعات سنوية بعد. السنة الأولى مجانية.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-right text-xs"><thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500"><th className="p-3">المبلغ</th><th className="p-3">يغطي من</th><th className="p-3">حتى</th><th className="p-3">تاريخ الدفع</th><th className="p-3">وسيلة الدفع</th><th className="p-3">المرجع</th></tr></thead><tbody>{maintenancePayments.map((payment)=><tr key={payment.id} className="border-b border-slate-100 last:border-0"><td className="p-3 font-numeric font-black text-emerald-700">{payment.amount.toLocaleString()} {payment.currencyCode}</td><td className="p-3 font-semibold text-slate-700">{payment.coverageStart.toLocaleDateString("ar-SA")}</td><td className="p-3 font-semibold text-slate-700">{payment.coverageEnd.toLocaleDateString("ar-SA")}</td><td className="p-3 text-slate-500">{payment.paidAt.toLocaleDateString("ar-SA")}</td><td className="p-3 text-slate-500">{payment.paymentMethod || "-"}</td><td className="p-3 text-slate-500">{payment.paymentReference || "-"}</td></tr>)}</tbody></table></div>}
    </section> : null}
  </div>;
}

function MaintenanceStatusBanner({
  status,
  amount,
  currencyCode,
  nextDueAt,
  daysUntilDue,
}: {
  status: LifetimeMaintenanceStatus;
  amount: number;
  currencyCode: string;
  nextDueAt: Date | null;
  daysUntilDue: number | null;
}) {
  if (status === "LEGACY") return null;

  const policy = resolveLifetimeMaintenancePolicy({
    status,
    nextDueAt,
    daysUntilDue,
  });

  if (policy.status === "EXPIRED") {
    return <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" /><div><div className="text-sm font-black text-rose-900">انتهت مهلة الصيانة والتحديثات</div><p className="mt-1 text-xs font-semibold leading-6 text-rose-700">مر أكثر من {LIFETIME_MAINTENANCE_GRACE_DAYS} يوم على الاستحقاق. ترخيص مدى الحياة الأساسي ما زال فعالاً ويمكنك استخدام النظام وبياناتك كالمعتاد، لكن الدعم والميزات الجديدة المرتبطة بالصيانة تحتاج إلى التجديد. الإصلاحات الأمنية والأساسية تبقى متاحة.</p></div></div>{nextDueAt ? <div className="text-xs font-black text-rose-700">كان الاستحقاق {nextDueAt.toLocaleDateString("ar-SA")} — متأخر {policy.overdueDays} يوم</div> : null}</div>;
  }

  if (policy.status === "GRACE_PERIOD") {
    return <div className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-orange-600" /><div><div className="text-sm font-black text-orange-900">أنت ضمن مهلة التجديد</div><p className="mt-1 text-xs font-semibold text-orange-700">رسم الصيانة والتحديث السنوي {amount.toLocaleString()} {currencyCode} أصبح مستحقاً، لكن لديك مهلة {LIFETIME_MAINTENANCE_GRACE_DAYS} يوم. كامل الاستحقاقات المرتبطة بالصيانة تبقى فعالة خلال المهلة.</p></div></div><div className="text-xs font-black text-orange-700">متبقي {policy.graceDaysRemaining ?? 0} يوم من المهلة{policy.graceEndsAt ? ` — حتى ${policy.graceEndsAt.toLocaleDateString("ar-SA")}` : ""}</div></div>;
  }

  if (policy.status === "DUE_SOON") {
    return <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-5 w-5 text-amber-600" /><div><div className="text-sm font-black text-amber-900">موعد الرسم السنوي قريب</div><p className="mt-1 text-xs font-semibold text-amber-700">المبلغ القادم {amount.toLocaleString()} {currencyCode} للصيانة والتحديثات. بعد تاريخ الاستحقاق تبدأ مهلة {LIFETIME_MAINTENANCE_GRACE_DAYS} يوم.</p></div></div>{nextDueAt ? <div className="text-xs font-black text-amber-700">{nextDueAt.toLocaleDateString("ar-SA")}{daysUntilDue != null ? ` — بعد ${Math.max(0, daysUntilDue)} يوم` : ""}</div> : null}</div>;
  }

  if (policy.status === "FREE_FIRST_YEAR") {
    return <div className="flex flex-col gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-cyan-600" /><div><div className="text-sm font-black text-cyan-900">السنة الأولى للصيانة والتحديثات مجانية</div><p className="mt-1 text-xs font-semibold text-cyan-700">أول رسم سنوي سيكون {amount.toLocaleString()} {currencyCode} ابتداءً من السنة الثانية، وبعد الاستحقاق توجد مهلة {LIFETIME_MAINTENANCE_GRACE_DAYS} يوم.</p></div></div>{nextDueAt ? <div className="text-xs font-black text-cyan-700">أول استحقاق {nextDueAt.toLocaleDateString("ar-SA")}</div> : null}</div>;
  }

  return <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div><div className="text-sm font-black text-emerald-900">الصيانة والتحديثات مدفوعة</div><p className="mt-1 text-xs font-semibold text-emerald-700">الرسم السنوي الحالي مسجل ومدفوع.</p></div></div>{nextDueAt ? <div className="text-xs font-black text-emerald-700">التجديد القادم {nextDueAt.toLocaleDateString("ar-SA")}</div> : null}</div>;
}
