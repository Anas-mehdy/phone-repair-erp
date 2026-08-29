import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import {
  CalendarClock,
  Check,
  Clock3,
  Crown,
  Infinity as InfinityIcon,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import {
  SubscriptionExpiredBanner,
  SubscriptionGracePeriodBanner,
} from "@/components/subscription/entitlement-alert";
import { requirePermission } from "@/lib/auth/context";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";
import { subscriptionService } from "@/lib/services/subscriptionService";

export const dynamic = "force-dynamic";

const SUPPORT_PHONE = "905350215375";

const planDetails = {
  [SubscriptionPlan.BASIC]: {
    name: "الخطة الأساسية",
    description: "كل أقسام مسار لورشة صغيرة وبحدود شهرية واضحة.",
    icon: ShieldCheck,
    features: [
      "100 تذكرة صيانة شهرياً",
      "مستخدم واحد (المالك)",
      "10 عمليات بحث توافق يومياً",
      "جميع أقسام النظام والفواتير والطباعة",
    ],
  },
  [SubscriptionPlan.PROFESSIONAL]: {
    name: "الخطة الاحترافية",
    description: "تشغيل كامل بلا حدود للنمو والموظفين والعمليات.",
    icon: Crown,
    features: [
      "تذاكر صيانة غير محدودة",
      "مستخدمون وموظفون بلا حدود",
      "بحث توافقات غير محدود",
      "جميع أقسام النظام والتقارير المتقدمة",
    ],
  },
};

const statusLabels: Record<SubscriptionStatus, { label: string; className: string }> = {
  TRIALING: { label: "فترة تجريبية", className: "border-cyan-200 bg-cyan-50 text-cyan-800" },
  ACTIVE: { label: "نشط", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  GRACE_PERIOD: { label: "مهلة تجديد", className: "border-amber-200 bg-amber-50 text-amber-800" },
  EXPIRED: { label: "منتهي", className: "border-rose-200 bg-rose-50 text-rose-800" },
  CANCELED: { label: "ملغي", className: "border-slate-200 bg-slate-100 text-slate-700" },
};

type SubscriptionPageProps = {
  searchParams: Promise<{ interval?: string }>;
};

export default async function SubscriptionPage({ searchParams }: SubscriptionPageProps) {
  // Authorization: shopId is resolved server-side from verified Auth Context only
  const auth = await requirePermission("subscription:manage");
  const params = await searchParams;
  const interval =
    params.interval === "annual"
      ? SubscriptionBillingInterval.ANNUAL
      : SubscriptionBillingInterval.SIX_MONTHS;

  // Parallel server-side fetch: subscription overview + live entitlement usage
  const [overview, entitlement] = await Promise.all([
    subscriptionService.getSubscriptionOverview(auth.shop.id),
    entitlementService.getEntitlementContext(auth.shop.id),
  ]);

  const effectiveStatus = entitlement.subscription.effectiveStatus;
  const status = statusLabels[effectiveStatus as SubscriptionStatus] || statusLabels.EXPIRED;
  const isTrial = effectiveStatus === "TRIALING";
  const isExpired = effectiveStatus === "EXPIRED" || effectiveStatus === "CANCELED";
  const isGracePeriod = effectiveStatus === "GRACE_PERIOD";
  const isBasic = entitlement.subscription.effectivePlan === "BASIC";

  const remainingLabel =
    overview.remainingMilliseconds > 0
      ? `${overview.remainingDays} يوم و${overview.remainingHours} ساعة`
      : "انتهت المدة";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="إدارة الخطة"
        title="اشتراكي في مسار"
        description="تابع حالة اشتراك متجرك، استهلاك الحدود الفعلية، واختر الخطة والسعر المناسبين لبلدك."
      />

      {/* Expiration or Grace Period Alerts */}
      {isExpired && <SubscriptionExpiredBanner />}
      {isGracePeriod && (
        <SubscriptionGracePeriodBanner remainingDays={overview.remainingDays} />
      )}

      {/* Main Status Hero Card */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>
                {status.label}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
                {overview.countryFlag} الأسعار المخصصة لـ {overview.countryName}
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-black sm:text-3xl">
              {planDetails[overview.plan]?.name || "خطة مسار"}
            </h2>

            <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-300">
              {isTrial
                ? "تستخدم الآن جميع مزايا الخطة الاحترافية مجاناً خلال الفترة التجريبية."
                : isExpired
                ? "انتهت الفترة التجريبية. اختر الخطة المناسبة لمتابعة إنشاء عمليات جديدة."
                : isGracePeriod
                ? "اشتراك متجرك في مهلة التجديد. يرجى تجديد الخطة للاستمرار بلا انقطاع."
                : "اشتراك متجرك نشط ويمكنك متابعة العمل بصورة طبيعية."}
            </p>

            {isTrial && (
              <div className="mt-6 max-w-2xl">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-cyan-100">
                  <span>تقدم الفترة التجريبية</span>
                  <span>{remainingLabel} متبقية</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-teal-400 transition-all duration-500"
                    style={{ width: `${Math.max(3, 100 - overview.trialProgress)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid min-w-[240px] gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <SummaryRow icon={Clock3} label="الوقت المتبقي" value={remainingLabel} />
            <SummaryRow
              icon={CalendarClock}
              label={isTrial ? "نهاية التجربة" : "نهاية الاشتراك"}
              value={formatDateTime(isTrial ? overview.trialEndsAt : overview.currentPeriodEndsAt)}
            />
            <SummaryRow icon={Crown} label="المتجر" value={overview.shopName} />
          </div>
        </div>
      </section>

      {/* Live Usage & Entitlements Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">حدود واستهلاك الخطة</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            متابعة فورية لاستهلاك متجرك من تذاكر الصيانة والبحث والمستخدمين.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Card 1: Repair Orders */}
          <UsageCard
            icon={Wrench}
            title="تذاكر الصيانة"
            isUnlimited={!isBasic}
            currentValue={entitlement.usage.repairOrdersThisMonth}
            limitValue={100}
            periodLabel="هذا الشهر"
            unlimitedSubtext={`${entitlement.usage.repairOrdersThisMonth} تذكرة منشأة هذا الشهر`}
            colorScheme="teal"
          />

          {/* Card 2: Compatibility Search */}
          <UsageCard
            icon={Search}
            title="بحث التوافقات"
            isUnlimited={!isBasic}
            currentValue={entitlement.usage.compatibilitySearchesToday}
            limitValue={10}
            periodLabel="اليوم"
            unlimitedSubtext={`${entitlement.usage.compatibilitySearchesToday} عملية بحث اليوم`}
            colorScheme="cyan"
          />

          {/* Card 3: Users & Seats */}
          <UsageCard
            icon={Users}
            title="المستخدمون والمقاعد"
            isUnlimited={!isBasic}
            currentValue={entitlement.usage.activeSeats}
            limitValue={1}
            periodLabel="المقاعد النشطة"
            unlimitedSubtext={`${entitlement.usage.activeSeats} مستخدمين نشطين حالياً`}
            colorScheme="indigo"
          />
        </div>
      </section>

      {/* Plan Selection & WhatsApp Upgrade Section */}
      <section id="plans-section" className="space-y-5 pt-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">اختر الخطة المناسبة</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              الأسعار التالية مخصصة لبلد متجرك، وتتضمن تفعيلاً فورياً وتأكيداً مباشراً.
            </p>
          </div>
          <div className="inline-flex w-fit rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-xs">
            <Link
              href="/subscription?interval=six-months"
              className={`rounded-xl px-5 py-2 text-xs font-black transition ${
                interval === SubscriptionBillingInterval.SIX_MONTHS
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              6 أشهر
            </Link>
            <Link
              href="/subscription?interval=annual"
              className={`rounded-xl px-5 py-2 text-xs font-black transition ${
                interval === SubscriptionBillingInterval.ANNUAL
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              سنة كاملة (أفضل قيمة)
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {[SubscriptionPlan.BASIC, SubscriptionPlan.PROFESSIONAL].map((plan) => {
            const details = planDetails[plan];
            const Icon = details.icon;
            const price = overview.prices.find(
              (item) => item.plan === plan && item.billingInterval === interval
            );
            const isProfessional = plan === SubscriptionPlan.PROFESSIONAL;
            const durationLabel =
              interval === SubscriptionBillingInterval.ANNUAL ? "سنة كاملة" : "6 أشهر";
            const priceLabel = price
              ? formatCurrency(price.amount, price.currencyCode)
              : "تواصل معنا";
            const message = `مرحباً، أريد الاشتراك في ${details.name} (${durationLabel}) بسعر ${priceLabel} لمتجري (${overview.shopName}) على مسار.`;
            const whatsappUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;

            return (
              <article
                key={plan}
                className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-sm sm:p-7 ${
                  isProfessional
                    ? "border-teal-300 bg-gradient-to-br from-teal-50/70 via-white to-cyan-50/50 ring-2 ring-teal-500/10"
                    : "border-slate-200 bg-white"
                }`}
              >
                {isProfessional && (
                  <span className="absolute left-5 top-5 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-1 text-[10px] font-black text-white shadow-xs">
                    الأكثر قيمة وطلباً
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isProfessional
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{details.name}</h3>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                        {details.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-end gap-2 border-y border-slate-100 py-5">
                    <strong
                      className="text-3xl font-black tracking-tight text-slate-950"
                      dir="ltr"
                    >
                      {priceLabel}
                    </strong>
                    <span className="pb-1 text-xs font-bold text-slate-500">
                      / {durationLabel}
                    </span>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {details.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2.5 text-xs font-bold text-slate-700"
                      >
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full ${
                            isProfessional
                              ? "bg-teal-100 text-teal-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7">
                  <Button
                    asChild
                    className={`h-12 w-full rounded-2xl text-sm font-black shadow-sm ${
                      isProfessional
                        ? "bg-teal-600 hover:bg-teal-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    <a href={whatsappUrl} target="_blank" rel="noreferrer">
                      <MessageCircle className="ml-2 h-4 w-4" />
                      طلب الاشتراك عبر واتساب
                    </a>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Trust & Guarantee Section */}
      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-3">
        <TrustItem
          icon={ShieldCheck}
          title="لا تغيير تلقائي"
          text="لن تتغير خطتك أو تُسحب أي دفعة دون طلبك وتأكيدك المباشر."
        />
        <TrustItem
          icon={MessageCircle}
          title="تأكيد بشري مباشر"
          text="نؤكد الخطة والسعر ووسيلة الدفع المناسبة لبلدك معك مباشرة."
        />
        <TrustItem
          icon={Sparkles}
          title="تفعيل واضح وفوري"
          text="يظهر تاريخ التفعيل ونهاية الاشتراك فور اعتماده في هذه الصفحة."
        />
      </section>
    </div>
  );
}

function UsageCard({
  icon: Icon,
  title,
  isUnlimited,
  currentValue,
  limitValue,
  periodLabel,
  unlimitedSubtext,
  colorScheme,
}: {
  icon: typeof Wrench;
  title: string;
  isUnlimited: boolean;
  currentValue: number;
  limitValue: number;
  periodLabel: string;
  unlimitedSubtext: string;
  colorScheme: "teal" | "cyan" | "indigo";
}) {
  const percentage = Math.min(100, Math.round((currentValue / limitValue) * 100));
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const colorStyles = {
    teal: {
      bg: "bg-teal-50 text-teal-700 border-teal-200",
      bar: isAtLimit ? "bg-rose-500" : isNearLimit ? "bg-amber-500" : "bg-teal-600",
    },
    cyan: {
      bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
      bar: isAtLimit ? "bg-rose-500" : isNearLimit ? "bg-amber-500" : "bg-cyan-600",
    },
    indigo: {
      bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      bar: isAtLimit ? "bg-rose-500" : isNearLimit ? "bg-amber-500" : "bg-indigo-600",
    },
  }[colorScheme];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-700">{title}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${colorStyles.bg}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4">
        {isUnlimited ? (
          <div>
            <div className="flex items-center gap-1.5">
              <InfinityIcon className="h-5 w-5 text-teal-600" />
              <span className="text-2xl font-black text-slate-900">غير محدود</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">{unlimitedSubtext}</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{currentValue}</span>
              <span className="text-xs font-bold text-slate-500">
                / {limitValue} {periodLabel}
              </span>
            </div>

            {/* Simple Clean Progress Bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorStyles.bar}`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>{percentage}% مستهلك</span>
              <span>{Math.max(0, limitValue - currentValue)} متبقي</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <p className="mt-0.5 text-xs font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-4">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
      <div>
        <h3 className="text-xs font-black text-slate-900">{title}</h3>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
