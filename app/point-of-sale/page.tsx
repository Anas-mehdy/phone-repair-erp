import Link from "next/link";
import {
  Code2,
  ShoppingCart,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SaleForm } from "@/app/sales/sale-form";
import { CreateRepairOrderForm } from "@/app/repair-orders/new/_create-form";
import { SoftwareServiceForm } from "@/app/software-services/_software-service-form";
import { ElectronicServiceExecutionForm } from "@/app/electronic-services/new/_service-form";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext, type CurrentShopContext } from "@/lib/current-shop";
import { pointOfSaleReturnPath, type PointOfSaleTabKey } from "@/lib/point-of-sale";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { inventoryService } from "@/lib/services/inventoryService";
import { repairOrderService } from "@/lib/services/repairOrderService";
import { supplierService } from "@/lib/services/supplierService";
import { softwareServiceService } from "@/lib/services/softwareServiceService";
import { electronicServiceTransactionService } from "@/lib/services/electronicServiceTransactionService";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
    transaction?: string;
    entitlement?: string;
  }>;
};

type PointOfSaleTab = {
  key: PointOfSaleTabKey;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: string;
  tone: "indigo" | "cyan" | "violet" | "amber";
};

const tabs: PointOfSaleTab[] = [
  { key: "sale", label: "بيع مباشر", description: "بيع قطعة أو إكسسوار من نظام المبيعات الحالي.", icon: ShoppingCart, permission: "sales:create", tone: "indigo" },
  { key: "repair", label: "تذكرة صيانة", description: "استلام جهاز وفتح تذكرة صيانة جديدة.", icon: Wrench, permission: "repairs:create", tone: "cyan" },
  { key: "software", label: "خدمة سوفتوير", description: "تنفيذ خدمة سوفتوير باستخدام نفس المحرك الحالي.", icon: Code2, permission: "sales:create", tone: "violet" },
  { key: "electronic", label: "خدمة إلكترونية", description: "شحن وفواتير وخدمات مزودي الرصيد.", icon: Zap, permission: "electronic_services:execute", tone: "amber" },
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

async function renderSaleForm(context: CurrentShopContext, key: string) {
  const [inventoryItems, wallets] = await Promise.all([
    inventoryService.listInventoryItems(context.shopId),
    financialTransferService.listWallets(context.shopId),
  ]);

  return (
    <SaleForm
      key={key}
      currency={context.currency}
      inventoryItems={inventoryItems.map((item) => ({ id: item.id, name: item.name, sku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice.toString() }))}
      wallets={wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: Number(wallet.currentBalance) }))}
      returnTo={pointOfSaleReturnPath("sale")}
    />
  );
}

async function renderRepairForm(context: CurrentShopContext, key: string) {
  const canAssign = context.permissions.includes("repairs:assign");
  const [suppliers, inventoryItems, technicians] = await Promise.all([
    supplierService.listSuppliers(context.shopId),
    inventoryService.listInventoryItems(context.shopId),
    canAssign ? repairOrderService.listAssignableTechnicians(context.shopId) : Promise.resolve([]),
  ]);

  return (
    <CreateRepairOrderForm
      key={key}
      suppliers={suppliers}
      inventoryItems={inventoryItems.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        unitCost: item.unitCost ? item.unitCost.toString() : null,
      }))}
      currency={context.currency}
      technicians={technicians}
      returnTo={pointOfSaleReturnPath("repair")}
      cancelHref={pointOfSaleReturnPath("repair")}
    />
  );
}

async function renderSoftwareForm(context: CurrentShopContext, key: string) {
  const [catalog, wallets] = await Promise.all([
    softwareServiceService.listCatalog(context.shopId),
    financialTransferService.listWallets(context.shopId),
  ]);

  return (
    <SoftwareServiceForm
      key={key}
      catalog={catalog.map((item) => ({
        id: item.id,
        name: item.name,
        defaultPrice: item.defaultPrice?.toString() ?? null,
        defaultCost: item.defaultCost?.toString() ?? null,
      }))}
      wallets={wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: Number(wallet.currentBalance) }))}
      currency={context.currency || "SAR"}
      returnTo={pointOfSaleReturnPath("software")}
    />
  );
}

async function renderElectronicForm(context: CurrentShopContext, key: string) {
  const data = await electronicServiceTransactionService.getExecutionData(context.shopId);
  const providers = data.providers.map((provider) => ({ id: provider.id, name: provider.name, currentBalance: Number(provider.currentBalance), currencyCode: provider.currencyCode }));

  if (providers.length === 0) {
    return (
      <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-8 text-center dark:border-amber-900/70 dark:bg-amber-950/25">
        <Zap className="mx-auto h-8 w-8 text-amber-500" />
        <h3 className="mt-3 text-sm font-black text-amber-900 dark:text-amber-200">أضف مزود خدمة أولاً</h3>
        <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">لا يمكن تنفيذ خدمة إلكترونية بدون مزود ورصيد مرتبط به.</p>
        <Button asChild className="mt-4 rounded-xl bg-amber-600 text-xs font-black text-white hover:bg-amber-700"><Link href="/electronic-services">إدارة المزودين</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <ElectronicServiceExecutionForm
        key={key}
        providers={providers}
        templates={data.templates.map((template) => ({
          id: template.id,
          providerId: template.providerId,
          providerName: template.providerName,
          currencyCode: template.currencyCode,
          providerBalance: Number(template.providerBalance),
          name: template.name,
          category: template.category,
          faceValue: template.faceValue == null ? null : Number(template.faceValue),
          providerCost: Number(template.providerCost),
          customerCharge: Number(template.customerCharge),
        }))}
        customers={data.customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }))}
        wallets={data.wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, currentBalance: Number(wallet.currentBalance) }))}
        defaultCurrency={context.currency}
        returnTo={pointOfSaleReturnPath("electronic")}
      />
    </div>
  );
}

async function renderActiveForm(tab: PointOfSaleTabKey, context: CurrentShopContext, key: string) {
  if (tab === "sale") return renderSaleForm(context, key);
  if (tab === "repair") return renderRepairForm(context, key);
  if (tab === "software") return renderSoftwareForm(context, key);
  return renderElectronicForm(context, key);
}

export default async function PointOfSalePage({ searchParams }: Props) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const availableTabs = tabs.filter((tab) => context.permissions.includes(tab.permission));
  const requested = tabs.find((tab) => tab.key === query.tab);
  const activeTab = availableTabs.find((tab) => tab.key === requested?.key) ?? availableTabs[0] ?? null;
  const ActiveIcon = activeTab?.icon ?? ShoppingCart;
  const formKey = `${activeTab?.key ?? "none"}-${query.transaction ?? "new"}`;
  const form = activeTab ? await renderActiveForm(activeTab.key, context, formKey) : null;

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-teal-50/55 px-5 py-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/20 sm:px-6">
        <div aria-hidden className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-700/10" />
        <div className="relative flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-600/20"><ShoppingCart className="h-6 w-6" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-200 bg-white/80 px-2.5 py-1 text-[10px] font-black text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300">مركز العمليات اليومية</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Sparkles className="h-3 w-3 text-cyan-500" /> نفس محركات مسار، في مكان واحد</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[28px]">نقطة البيع</h1>
            <p className="mt-1.5 max-w-3xl text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">نفّذ البيع والصيانة والسوفتوير والخدمات الإلكترونية من صفحة واحدة. كل عملية تستخدم نفس الفورم والمحرك والمحاسبة الموجودة في قسمها الأصلي.</p>
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
              <Link key={tab.key} href={pointOfSaleReturnPath(tab.key)} aria-current={active ? "page" : undefined} className={cn("flex min-h-[70px] items-center gap-3 rounded-2xl border px-3 py-3 transition", active ? palette.active : "border-transparent bg-slate-50/70 text-slate-600 hover:border-slate-200 hover:bg-white dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900")}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", palette.icon)}><Icon className="h-4.5 w-4.5" /></span>
                <span className="min-w-0"><span className="block text-[12px] font-black">{tab.label}</span><span className="mt-0.5 block truncate text-[9px] font-semibold opacity-65">عملية جديدة</span></span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {query.saved && activeTab ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">تم تسجيل {activeTab.label} بنجاح. الفورم أصبح جاهزاً للعملية التالية بدون مغادرة نقطة البيع.</div>
      ) : null}
      {query.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">{query.error}</div>
      ) : null}
      {query.entitlement ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">تعذر إنشاء العملية بسبب حدود الاشتراك الحالية. بياناتك محفوظة ويمكنك مراجعة الاشتراك أو التواصل مع الدعم.</div>
      ) : null}

      {activeTab ? (
        <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[activeTab.tone].icon)}><ActiveIcon className="h-4.5 w-4.5" /></span>
                <div><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{activeTab.label}</h2><p className="mt-0.5 text-[10px] font-semibold text-slate-400">{activeTab.description}</p></div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">نفس النظام الحالي</span>
            </div>
          </div>
          <div className="p-4 sm:p-6">{form}</div>
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
