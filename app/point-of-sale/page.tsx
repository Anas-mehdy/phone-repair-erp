import Link from "next/link";
import {
  ArrowLeftRight,
  CheckCircle2,
  Code2,
  ExternalLink,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ElectronicServiceExecutionForm } from "@/app/electronic-services/new/_service-form";
import { CreateRepairOrderForm } from "@/app/repair-orders/new/_create-form";
import { SaleForm } from "@/app/sales/sale-form";
import { SaleOnboardingQuickForm } from "./_onboarding-sale-form";
import { SoftwareServiceForm } from "@/app/software-services/_software-service-form";
import { TransferForm } from "@/app/transfers/_transfer-form";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext, type CurrentShopContext } from "@/lib/current-shop";
import { pointOfSaleReturnPath, type PointOfSaleTabKey } from "@/lib/point-of-sale";
import { prisma } from "@/lib/prisma";
import { electronicServiceTransactionService } from "@/lib/services/electronicServiceTransactionService";
import { bankAccountService } from "@/lib/services/bankAccountService";
import { financialTransferService } from "@/lib/services/financialTransferService";
import { inventoryService } from "@/lib/services/inventoryService";
import { repairOrderService } from "@/lib/services/repairOrderService";
import { softwareServiceService } from "@/lib/services/softwareServiceService";
import { supplierService } from "@/lib/services/supplierService";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
    transaction?: string;
    entitlement?: string;
    onboarding?: string;
  }>;
};

type PointOfSaleTab = {
  key: PointOfSaleTabKey;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: string;
  tone: "indigo" | "cyan" | "violet" | "amber" | "emerald";
};

const tabs: PointOfSaleTab[] = [
  { key: "sale", label: "بيع منتج", description: "بيع قطع وإكسسوارات وإصدار فاتورة.", icon: ShoppingCart, permission: "sales:create", tone: "indigo" },
  { key: "repair", label: "استلام صيانة", description: "استلم الجهاز وسجّل المشكلة.", icon: Wrench, permission: "repairs:create", tone: "cyan" },
  { key: "software", label: "خدمة سوفتوير", description: "تفليش، فك قفل وخدمات البرامج.", icon: Code2, permission: "sales:create", tone: "violet" },
  { key: "electronic", label: "خدمة إلكترونية", description: "شحن رصيد ودفع فواتير.", icon: Zap, permission: "electronic_services:execute", tone: "amber" },
  { key: "wallet", label: "المحافظ", description: "إيداع وسحب وتحويل رصيد.", icon: ArrowLeftRight, permission: "sales:create", tone: "emerald" },
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
  emerald: {
    active: "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-200",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
  },
} as const;

function operationRecordHref(tab: PointOfSaleTabKey, transaction?: string) {
  if (!transaction) return null;
  if (tab === "sale") return `/sales/${transaction}`;
  if (tab === "repair") return `/repair-orders/${transaction}`;
  if (tab === "software") return `/software-services/${transaction}`;
  if (tab === "wallet") return `/transfers/${transaction}`;
  return "/electronic-services";
}

function operationRecordLabel(tab: PointOfSaleTabKey) {
  if (tab === "electronic") return "فتح سجل الخدمات";
  if (tab === "wallet") return "فتح تفاصيل التحويل";
  return "فتح تفاصيل العملية";
}

async function renderSaleForm(context: CurrentShopContext, key: string) {
  const [inventoryItems, wallets, bankAccounts] = await Promise.all([
    inventoryService.listInventoryItems(context.shopId),
    financialTransferService.listWallets(context.shopId),
    bankAccountService.listAccounts(context.shopId),
  ]);

  return (
    <SaleForm
      key={key}
      currency={context.currency}
      inventoryItems={inventoryItems.map((item) => ({ id: item.id, name: item.name, sku: item.sku, quantity: item.quantity, unitCost: item.unitCost?.toString() ?? null, giftAllowed: item.giftAllowed, unitPrice: item.unitPrice.toString() }))}
      wallets={wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, balance: Number(wallet.currentBalance) }))}
      bankAccounts={bankAccounts.map((account) => ({ id: account.id, name: account.name, bankName: account.bankName, balance: Number(account.currentBalance) }))}
      returnTo={pointOfSaleReturnPath("sale")}
      simpleMode
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
      simpleMode
    />
  );
}

async function renderSoftwareForm(context: CurrentShopContext, key: string) {
  const [catalog, wallets, bankAccounts] = await Promise.all([
    softwareServiceService.listCatalog(context.shopId),
    financialTransferService.listWallets(context.shopId),
    bankAccountService.listAccounts(context.shopId),
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
      bankAccounts={bankAccounts.map((account) => ({ id: account.id, name: account.name, bankName: account.bankName, balance: Number(account.currentBalance) }))}
      currency={context.currency || "SAR"}
      returnTo={pointOfSaleReturnPath("software")}
      simpleMode
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
        <Button asChild className="mt-4 rounded-xl bg-amber-600 text-xs font-black text-white hover:bg-amber-700"><Link href="/electronic-services" target="_blank" rel="noreferrer">إدارة المزودين</Link></Button>
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
        bankAccounts={data.bankAccounts.map((account) => ({ id: account.id, name: account.name, bankName: account.bankName, currentBalance: Number(account.currentBalance) }))}
        defaultCurrency={context.currency}
        returnTo={pointOfSaleReturnPath("electronic")}
        simpleMode
      />
    </div>
  );
}

async function renderWalletForm(context: CurrentShopContext, key: string) {
  const [wallets, customers] = await Promise.all([
    financialTransferService.listWallets(context.shopId),
    prisma.customer.findMany({
      where: { shopId: context.shopId, deletedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  if (wallets.length === 0) {
    return (
      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-8 text-center dark:border-emerald-900/70 dark:bg-emerald-950/25">
        <ArrowLeftRight className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-300" />
        <h3 className="mt-3 text-sm font-black text-emerald-900 dark:text-emerald-200">أضف محفظة أولاً</h3>
        <p className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">لا يمكن تسجيل تحويل قبل إنشاء محفظة مالية واحدة على الأقل.</p>
        <Button asChild className="mt-4 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700"><Link href="/transfers" target="_blank" rel="noreferrer">إدارة المحافظ</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <TransferForm
        key={key}
        wallets={wallets.map((wallet) => ({
          id: wallet.id,
          name: wallet.name,
          balance: Number(wallet.currentBalance),
          depositCommission: Number(wallet.defaultDepositCommission),
          withdrawalCommission: Number(wallet.defaultWithdrawalCommission),
        }))}
        customers={customers}
        currency={context.currency || "SAR"}
        returnTo={pointOfSaleReturnPath("wallet")}
      />
    </div>
  );
}

async function renderActiveForm(tab: PointOfSaleTabKey, context: CurrentShopContext, key: string) {
  if (tab === "sale") return renderSaleForm(context, key);
  if (tab === "repair") return renderRepairForm(context, key);
  if (tab === "software") return renderSoftwareForm(context, key);
  if (tab === "wallet") return renderWalletForm(context, key);
  return renderElectronicForm(context, key);
}

export default async function PointOfSalePage({ searchParams }: Props) {
  const query = await searchParams;
  const context = await getCurrentShopContext();
  const availableTabs = tabs.filter((tab) => context.permissions.includes(tab.permission));
  const requested = tabs.find((tab) => tab.key === query.tab);
  const activeTab = availableTabs.find((tab) => tab.key === requested?.key) ?? availableTabs[0] ?? null;
  const ActiveIcon = activeTab?.icon ?? ShoppingCart;
  const onboardingSaleMode = query.onboarding === "1" && activeTab?.key === "sale";

  if (onboardingSaleMode) {
    const inventoryItems = await inventoryService.listInventoryItems(context.shopId);
    return (
      <div className="pb-8 pt-1">
        <SaleOnboardingQuickForm
          currency={context.currency || "SAR"}
          inventoryItems={inventoryItems.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            unitCost: item.unitCost?.toString() ?? null,
            giftAllowed: item.giftAllowed,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
          }))}
        />
      </div>
    );
  }

  const formKey = `${activeTab?.key ?? "none"}-${query.transaction ?? "new"}`;
  const form = activeTab ? await renderActiveForm(activeTab.key, context, formKey) : null;
  const recordHref = activeTab ? operationRecordHref(activeTab.key, query.transaction) : null;

  return (
    <div className="space-y-4 pb-8 sm:space-y-5">
      <section className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white via-white to-teal-50/55 px-4 py-5 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/20 sm:rounded-[28px] sm:px-6 sm:py-6">
        <div aria-hidden className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl dark:bg-cyan-700/10" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-600/20 sm:h-12 sm:w-12"><ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-200 bg-white/80 px-2.5 py-1 text-[10px] font-black text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300">مركز العمليات اليومية</span>
              <span className="hidden items-center gap-1 text-[10px] font-bold text-slate-400 sm:inline-flex"><Sparkles className="h-3 w-3 text-cyan-500" /> نفس محركات مسار، في مكان واحد</span>
            </div>
            <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-slate-50 sm:text-[28px]">نقطة البيع</h1>
            <p className="mt-1.5 max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">اختر العملية، عبّي المعلومات الأساسية، واحفظ. الخيارات الإضافية موجودة بس وقت تحتاجها.</p>
          </div>
        </div>
      </section>

      {availableTabs.length > 0 ? (
        <nav className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5" aria-label="اختيار العملية">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">شو بدك تعمل؟</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ابدأ بالعملية المطلوبة؛ كل الخدمات السابقة ما زالت متاحة.</p>
          </div>
          {availableTabs.some((tab) => tab.key === "sale" || tab.key === "repair") ? (
            <div className="grid grid-cols-2 gap-3">
              {availableTabs.filter((tab) => tab.key === "sale" || tab.key === "repair").map((tab) => {
                const Icon = tab.icon;
                const active = activeTab?.key === tab.key;
                return (
                  <Link key={tab.key} href={pointOfSaleReturnPath(tab.key)} aria-current={active ? "page" : undefined}
                    className={cn("flex min-h-[116px] flex-col items-start justify-center gap-2 rounded-2xl border-2 p-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 sm:min-h-[128px] sm:flex-row sm:items-center sm:justify-start", active ? toneClasses[tab.tone].active : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-teal-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200")}>
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneClasses[tab.tone].icon)}><Icon className="h-6 w-6" /></span>
                    <span className="min-w-0"><span className="block text-sm font-black sm:text-base">{tab.label}</span><span className="mt-1 block text-xs font-medium opacity-75">{tab.key === "sale" ? "منتج، كمية، دفع" : "عميل، جهاز، مشكلة"}</span></span>
                  </Link>
                );
              })}
            </div>
          ) : null}
          {availableTabs.some((tab) => tab.key !== "sale" && tab.key !== "repair") ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">خدمات ثانية</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {availableTabs.filter((tab) => tab.key !== "sale" && tab.key !== "repair").map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab?.key === tab.key;
                  return (
                    <Link key={tab.key} href={pointOfSaleReturnPath(tab.key)} aria-current={active ? "page" : undefined}
                      className={cn("flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500", active ? toneClasses[tab.tone].active : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200")}>
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClasses[tab.tone].icon)}><Icon className="h-5 w-5" /></span>
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>
      ) : null}

      {query.saved && activeTab ? (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-800 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200 dark:bg-slate-950 dark:text-emerald-300 dark:ring-emerald-900"><CheckCircle2 className="h-4.5 w-4.5" /></span>
            <div><p className="text-xs font-black">تم تسجيل {activeTab.label} بنجاح</p><p className="mt-1 text-[10px] font-semibold leading-5 opacity-80">الفورم أُعيد تهيئته وأصبح جاهزاً للعملية التالية. تفاصيل العملية تفتح بتبويب جديد حتى تبقى نقطة البيع أمامك.</p></div>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            {recordHref ? <Button asChild variant="outline" className="h-9 rounded-xl border-emerald-200 bg-white px-3 text-[10px] font-black text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-emerald-950/50"><Link href={recordHref} target="_blank" rel="noreferrer"><ExternalLink className="ml-1.5 h-3.5 w-3.5" />{operationRecordLabel(activeTab.key)}</Link></Button> : null}
            <Button asChild className="h-9 rounded-xl bg-emerald-600 px-3 text-[10px] font-black text-white hover:bg-emerald-700"><Link href={pointOfSaleReturnPath(activeTab.key)}><RotateCcw className="ml-1.5 h-3.5 w-3.5" />عملية جديدة</Link></Button>
          </div>
        </section>
      ) : null}

      {query.error ? (
        <div aria-live="assertive" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">{query.error}</div>
      ) : null}
      {query.entitlement ? (
        <div aria-live="assertive" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">تعذر إنشاء العملية بسبب حدود الاشتراك الحالية. بياناتك محفوظة ويمكنك مراجعة الاشتراك أو التواصل مع الدعم.</div>
      ) : null}

      {activeTab ? (
        <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-[26px]">
          <div className="border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-6 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10", toneClasses[activeTab.tone].icon)}><ActiveIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" /></span>
                <div className="min-w-0"><h2 className="text-sm font-black text-slate-900 dark:text-slate-100">{activeTab.label}</h2><p className="mt-0.5 truncate text-[9px] font-semibold text-slate-400 sm:text-[10px]">{activeTab.description}</p></div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300">كل خياراتك محفوظة</span>
                <Button asChild variant="ghost" className="h-8 rounded-lg px-2.5 text-[9px] font-black text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"><a href={pointOfSaleReturnPath(activeTab.key)}><RotateCcw className="ml-1 h-3.5 w-3.5" />بدء عملية جديدة</a></Button>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-6">{form}</div>
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
