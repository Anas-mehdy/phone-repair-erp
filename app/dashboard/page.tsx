import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  FileText,
  Plus,
  Receipt,
  ShoppingCart,
  Wrench,
  ArrowUpRight,
  Clock,
  Sparkles,
  ChevronLeft,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { dashboardService } from "@/lib/services/dashboardService";
import { DashboardUpdatesSection } from "@/components/dashboard/dashboard-updates-section";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let metrics: Awaited<ReturnType<typeof dashboardService.getDashboardMetrics>>;
  let activity: Awaited<ReturnType<typeof dashboardService.getRecentActivity>>;
  let shopContext: Awaited<ReturnType<typeof getCurrentShopContext>>;

  try {
    shopContext = await getCurrentShopContext();
    const { shopId } = shopContext;
    [metrics, activity] = await Promise.all([
      dashboardService.getDashboardMetrics(shopId),
      dashboardService.getRecentActivity(shopId),
    ]);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  const currency = shopContext.currency || "SAR";

  const todayStr = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const metricCards = [
    {
      label: "طلبات صيانة مفتوحة",
      helper: "أجهزة قيد العمل بالورشة",
      value: metrics.openRepairOrdersCount,
      icon: Wrench,
      accent: "text-teal-600 bg-teal-50 border-teal-100",
      iconBg: "from-teal-500 to-teal-700",
    },
    {
      label: "جاهزة للتسليم",
      helper: "تم إنجازها وبانتظار العميل",
      value: metrics.readyForDeliveryCount,
      icon: CheckCircle2,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
      iconBg: "from-emerald-500 to-emerald-700",
    },
    {
      label: "طلبات استلمت اليوم",
      helper: "تذاكر صيانة جديدة مسجلة",
      value: metrics.repairOrdersCreatedToday,
      icon: Plus,
      accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
      iconBg: "from-indigo-500 to-indigo-700",
    },
    {
      label: "طلبات سلمت اليوم",
      helper: "أجهزة استلمها أصحابها",
      value: metrics.deliveredToday,
      icon: CheckCircle2,
      accent: "text-sky-600 bg-sky-50 border-sky-100",
      iconBg: "from-sky-500 to-sky-700",
    },
    {
      label: "مبيعات اليوم",
      helper: "إيرادات نقاط البيع والقطع",
      value: formatCurrency(metrics.salesRevenueToday, currency),
      icon: ShoppingCart,
      accent: "text-amber-600 bg-amber-50 border-amber-100",
      iconBg: "from-amber-500 to-amber-700",
    },
    {
      label: "فواتير غير مكتملة",
      helper: "فواتير بانتظار التحصيل",
      value: metrics.unpaidInvoicesCount,
      icon: FileText,
      accent: "text-orange-600 bg-orange-50 border-orange-100",
      iconBg: "from-orange-500 to-orange-700",
    },
    {
      label: "مبالغ مستحقة",
      helper: "أرصدة متبقية للتحصيل",
      value: formatCurrency(metrics.unpaidBalanceTotal, currency),
      icon: Receipt,
      accent: "text-rose-600 bg-rose-50 border-rose-100",
      iconBg: "from-rose-500 to-rose-700",
    },
    {
      label: "تنبيهات المخزون",
      helper: "قطع قاربت على النفاد",
      value: metrics.lowStockItemsCount,
      icon: Boxes,
      accent: "text-red-600 bg-red-50 border-red-100",
      iconBg: "from-red-500 to-red-700",
    },
  ];

  // Attention indicators logic
  const hasAttentionItems =
    metrics.readyForDeliveryCount > 0 ||
    metrics.lowStockItemsCount > 0 ||
    metrics.unpaidInvoicesCount > 0;

  return (
    <div className="space-y-8">
      {/* SaaS Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/50 bg-gradient-to-br from-teal-800 via-primary to-teal-900 p-6 text-white shadow-lg shadow-teal-950/10">
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-teal-600/10 blur-2xl" />
        <div className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-amber-500/5 blur-2xl" />
        
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{shopContext.shopName}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">أهلاً بك، {shopContext.userName} 👋</h2>
            <p className="max-w-xl text-xs font-medium leading-relaxed text-slate-100/90">
              تابع وأدر أعمال الصيانة اليومية، وتفقد المبيعات وسجل الأجهزة وحركات المخزون والمقبوضات المالية بكل سهولة ودقة.
            </p>
            <div className="pt-1 text-[11px] font-bold text-teal-200/90 flex items-center gap-1.5 font-numeric">
              <Clock className="h-3.5 w-3.5 text-teal-300" />
              <span>توقيت النظام: {todayStr}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Button asChild className="bg-white text-primary hover:bg-slate-50 font-bold shadow-md rounded-xl text-xs h-11 px-5 border-0">
              <Link href="/repair-orders/new">
                <Plus className="h-4.5 w-4.5 ml-1.5" aria-hidden="true" />
                طلب صيانة جديد
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold rounded-xl text-xs h-11 px-5">
              <Link href="/sales/new">
                <ShoppingCart className="h-4.5 w-4.5 ml-1.5" />
                عملية بيع POS جديدة
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className="erp-card erp-card-hover p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  {card.helper}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.iconBg} text-white shadow-md shadow-slate-200`}
              >
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-5 flex items-baseline justify-between">
              <p className="font-numeric text-3xl font-black text-slate-900 tracking-tight">
                {card.value}
              </p>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${card.accent}`}>
                مؤشر حي
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Needs Attention Alert Cockpit */}
      {hasAttentionItems ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-r-4 border-amber-500 pr-3.5">
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            <h3 className="text-sm font-extrabold text-slate-900">يحتاج انتباهك وإجراء اليوم</h3>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.readyForDeliveryCount > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 flex flex-col justify-between hover:bg-emerald-50/80 transition">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center rounded-md bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-850">
                    أجهزة جاهزة للتسليم
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    يوجد <span className="font-extrabold text-slate-900 font-numeric">{metrics.readyForDeliveryCount}</span> جهاز مكتمل الصيانة بانتظار تواصلك مع العميل وسداد المستحقات.
                  </p>
                </div>
                <div className="mt-4 pt-1">
                  <Button asChild size="sm" variant="outline" className="border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-100 font-bold text-xs h-8 rounded-lg shadow-xs">
                    <Link href="/repair-orders">
                      تصفية الأجهزة الجاهزة
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {metrics.lowStockItemsCount > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 flex flex-col justify-between hover:bg-rose-50/80 transition">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center rounded-md bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold text-rose-850">
                    نقص في المخزون
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    يوجد <span className="font-extrabold text-slate-900 font-numeric">{metrics.lowStockItemsCount}</span> قطع غيار بلغت أو تخطت حد إعادة الطلب. يرجى توريدها عاجلاً.
                  </p>
                </div>
                <div className="mt-4 pt-1">
                  <Button asChild size="sm" variant="outline" className="border-rose-300 text-rose-800 bg-white hover:bg-rose-100 font-bold text-xs h-8 rounded-lg shadow-xs">
                    <Link href="/inventory?lowStockOnly=true">
                      طلب توريد مخزون
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {metrics.unpaidInvoicesCount > 0 && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-5 flex flex-col justify-between hover:bg-orange-50/80 transition">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center rounded-md bg-orange-100 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold text-orange-850">
                    فواتير ومستحقات غير محصلة
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    توجد <span className="font-extrabold text-slate-900 font-numeric">{metrics.unpaidInvoicesCount}</span> فواتير معلقة بإجمالي متبقي <span className="font-extrabold text-slate-900 font-numeric">{formatCurrency(metrics.unpaidBalanceTotal, currency)}</span> بانتظار تحصيلها وسدادها.
                  </p>
                </div>
                <div className="mt-4 pt-1">
                  <Button asChild size="sm" variant="outline" className="border-orange-300 text-orange-800 bg-white hover:bg-orange-100 font-bold text-xs h-8 rounded-lg shadow-xs">
                    <Link href="/invoices">
                      متابعة تحصيل الدفعات
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Dedicated Updates & Features Bulletin Section */}
      <DashboardUpdatesSection />

      {/* Main activities feeds and actions */}
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Activity feeds */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ActivityCard title="آخر تذاكر صيانة" icon={Wrench} iconColor="text-teal-600 bg-teal-50">
            {activity.repairOrders.length === 0 ? (
              <EmptyActivity href="/repair-orders/new" label="طلب صيانة جديد" />
            ) : (
              activity.repairOrders.map((repairOrder) => (
                <ActivityItem
                  key={repairOrder.id}
                  href={`/repair-orders/${repairOrder.id}`}
                  title={repairOrder.ticketNumber}
                  description={`${repairOrder.customer?.name ?? "عميل سريع"} - ${repairOrder.deviceBrand ?? ""} ${repairOrder.deviceModel ?? ""}`}
                  meta={formatDate(repairOrder.createdAt)}
                />
              ))
            )}
          </ActivityCard>

          <ActivityCard title="آخر عمليات البيع" icon={ShoppingCart} iconColor="text-amber-600 bg-amber-50">
            {activity.sales.length === 0 ? (
              <EmptyActivity href="/sales/new" label="عملية بيع جديدة" />
            ) : (
              activity.sales.map((sale) => (
                <ActivityItem
                  key={sale.id}
                  href={`/sales/${sale.id}`}
                  title={sale.receiptNumber ?? "إيصال بيع"}
                  description={`${sale.customer?.name ?? "عميل نقدي"} - إجمالي: ${formatCurrency(sale.total, currency)}`}
                  meta={formatDate(sale.soldAt)}
                />
              ))
            )}
          </ActivityCard>

          <ActivityCard title="آخر الفواتير المصدرة" icon={FileText} iconColor="text-orange-600 bg-orange-50">
            {activity.invoices.length === 0 ? (
              <EmptyActivity href="/invoices" label="عرض الفواتير" />
            ) : (
              activity.invoices.map((invoice) => (
                <ActivityItem
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  title={invoice.invoiceNumber}
                  description={`${invoice.customer?.name ?? "عميل سريع"} - متبقي: ${formatCurrency(invoice.balanceDue, currency)}`}
                  meta={formatDate(invoice.issuedAt)}
                />
              ))
            )}
          </ActivityCard>
        </div>

        {/* Quick action visual cards sidebar */}
        <aside className="erp-section flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <ArrowRightLeft className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
              <h3 className="font-bold text-slate-800 text-sm">إجراءات سريعة</h3>
            </div>
            
            <div className="mt-5 space-y-3">
              <QuickActionCard
                href="/repair-orders/new"
                title="فتح تذكرة صيانة"
                description="تسجيل واستلام جهاز جديد"
                icon={Wrench}
                iconBg="bg-teal-500"
              />
              <QuickActionCard
                href="/sales/new"
                title="تسجيل عملية POS"
                description="بيع مباشر لقطع وإكسسوارات"
                icon={ShoppingCart}
                iconBg="bg-amber-500"
              />
              <QuickActionCard
                href="/inventory/new"
                title="إضافة للمستودع"
                description="إدخال صنف أو قطعة جديدة"
                icon={Boxes}
                iconBg="bg-indigo-500"
              />
              <QuickActionCard
                href="/invoices"
                title="مراجعة المقبوضات"
                description="سداد الفواتير المعلقة"
                icon={Receipt}
                iconBg="bg-rose-500"
              />
              <QuickActionCard
                href="/customers"
                title="سجل العملاء"
                description="مراجعة حسابات وبيانات العملاء"
                icon={CheckCircle2}
                iconBg="bg-slate-500"
              />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function ActivityCard({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  children: ReactNode;
}) {
  return (
    <div className="erp-section flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200 mb-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}>
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function ActivityItem({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white hover:shadow-xs"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-900 font-numeric">{title}</p>
        <span className="shrink-0 font-numeric text-[10px] font-bold text-slate-500">{meta}</span>
      </div>
      <p className="mt-1 line-clamp-1 text-xs text-slate-600 leading-normal font-medium">
        {description}
      </p>
    </Link>
  );
}

function EmptyActivity({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
      <p className="text-xs text-slate-600 font-medium">لا توجد عمليات مؤخراً.</p>
      <Button asChild variant="outline" size="sm" className="mt-3 font-bold text-xs h-8 px-3.5 border-slate-300 shadow-xs rounded-lg">
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon: Icon,
  iconBg,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white transition-all duration-200 hover:border-primary/40 hover:-translate-x-1 hover:bg-slate-50/80 group shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} text-white shadow-xs`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="text-right">
          <p className="text-xs font-extrabold text-slate-900 group-hover:text-primary transition">{title}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{description}</p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-primary transition ml-1" />
    </Link>
  );
}
