import Link from "next/link";
import {
  Code2,
  Layers3,
  ShoppingCart,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PointOfSaleTabKey = "sale" | "repair" | "software" | "electronic";
type Props = { searchParams: Promise<{ tab?: string }> };

type PointOfSaleTab = {
  key: PointOfSaleTabKey;
  label: string;
  description: string;
  legacyHref: string;
  icon: LucideIcon;
  permission: string;
  tone: "indigo" | "cyan" | "violet" | "amber";
};

const tabs: PointOfSaleTab[] = [
  {
    key: "sale",
    label: "بيع مباشر",
    description: "بيع قطعة أو إكسسوار من نظام المبيعات الحالي.",
    legacyHref: "/sales/new",
    icon: ShoppingCart,
    permission: "sales:create",
    tone: "indigo",
  },
  {
    key: "repair",
    label: "تذكرة صيانة",
    description: "استلام جهاز وفتح تذكرة صيانة جديدة.",
    legacyHref: "/repair-orders/new",
    icon: Wrench,
    permission: "repairs:create",
    tone: "cyan",
  },
  {
    key: "software",
    label: "خدمة سوفتوير",
    description: "تنفيذ خدمة سوفتوير باستخدام نفس المحرك الحالي.",
    legacyHref: "/software-services/new",
    icon: Code2,
    permission: "sales:create",
    tone: "violet",
  },
  {
    key: "electronic",
    label: "خدمة إلكترونية",
    description: "شحن وفواتير وخدمات مزودي الرصيد.",
    legacyHref: "/electronic-services/new",
    icon: Zap,
    permission: "electronic_services:execute",
    tone: "amber",
  },
];

const toneClasses = {
  indigo: {
    active: "border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm dark:border-indigo-800 dark:bg-indigo-950/35 dark:text-indigo-200",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300",
  },
  cyan: {
    active: "border-cyan-300 bg-cyan-50 text-cyan-800 shadow-sm dark:border-cyan-800 dark:bg-cyan-950/35 dark:text-cyan-200",
    icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300",
  },
  violet: {
    active: "border-violet-300 bg-violet-50 text-violet-800 shadow-sm dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-200",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300",
  },
  amber: {
    active: "border-amber-300 bg-amber-50 text-amber-800 shadow-sm dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-200",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
  },
} as const;

export default async function PointOfSalePage({ searchParams }: Props) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const availableTabs = tabs.filter((tab) => context.permissions.includes(tab.permission));
  const requested = tabs.find((tab) => tab.key === query.tab);
  const activeTab = availableTabs.find((tab) => tab.key === requested?.key) ?? availableTabs[0] ?? null;
  const ActiveIcon = activeTab?.icon ?? ShoppingCart;

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-teal-50/55 px-5 py-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/20 sm:px-6">
        <div aria-hidden className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-700/10" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-600/20">
            <ShoppingCart className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-200 bg-white/80 px-2.5 py-1 text-[10px] font-black text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300">مركز العمليات اليومية</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Sparkles className="h-3 w-3 text-cyan-500" /> نفس محركات مسار، في مكان واحد</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[28px]">نقطة البيع</h1>
            <p className="mt-1.5 max-w-3xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">بدّل بين أنواع العمليات من نفس الصفحة. في المرحلة التالية سيتم إدخال الفورمز الحالية هنا كما هي، بدون إنشاء نظام بيع جديد أو تغيير أي حركة محاسبية.</p>
          </div>
        </div>
      </section>

      {availableTabs.length > 0 ? (
        <nav className="grid grid-cols-2 gap-2 rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-4" aria-label="أنواع عمليات نقطة البيع">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab?.key === tab.key;
            const palette = toneClasses[tab.tone];
            return (
              <Link
                key={tab.key}
                href={`/point-of-sale?tab=${tab.key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[70px] items-center gap-3 rounded-2xl border px-3 py-3 transition",
                  active
                    ? palette.active
                    : "border-transparent bg-slate-50/70 text-slate-600 hover:border-slate-200 hover:bg-white dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900",
                )}
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", palette.icon)}><Icon className="h-4.5 w-4.5" /></span>
                <span className="min-w-0"><span className="block text-[12px] font-black">{tab.label}</span><span className="mt-0.5 block truncate text-[9px] font-semibold opacity-65">عملية جديدة</span></span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {activeTab ? (
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[activeTab.tone].icon)}><ActiveIcon className="h-4.5 w-4.5" /></span>
                <div><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{activeTab.label}</h2><p className="mt-0.5 text-[10px] font-semibold text-slate-400">{activeTab.description}</p></div>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">المرحلة 1 — الهيكل</span>
            </div>
          </div>

          <div className="flex min-h-[360px] items-center justify-center px-5 py-12 sm:px-6">
            <div className="max-w-xl text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300"><Layers3 className="h-6 w-6" /></span>
              <h3 className="mt-4 text-base font-black text-slate-900 dark:text-slate-100">مكان الفورم جاهز</h3>
              <p className="mt-2 text-[11px] font-semibold leading-6 text-slate-500 dark:text-slate-400">هذه المنطقة ستحتوي نفس الفورم الموجود حالياً في صفحة العملية الأصلية. لن ننسخ المحاسبة أو ننشئ Server Actions جديدة؛ سنعيد استخدام نفس المكونات والمحركات الحالية.</p>
              <Button asChild variant="outline" className="mt-5 h-10 rounded-xl px-4 text-[11px] font-black">
                <Link href={activeTab.legacyHref}>فتح النموذج الحالي مؤقتاً</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-8 text-center dark:border-amber-900/70 dark:bg-amber-950/25">
          <h2 className="text-sm font-black text-amber-900 dark:text-amber-200">لا توجد عمليات متاحة لهذا الحساب</h2>
          <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">نقطة البيع تعرض فقط العمليات التي يملك الموظف صلاحية تنفيذها.</p>
        </section>
      )}
    </div>
  );
}
