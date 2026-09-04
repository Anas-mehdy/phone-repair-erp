import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { CheckCircle2, Eye, FileText, Search, WalletCards, Wrench } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge, invoiceTypeLabels } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { invoiceService } from "@/lib/services/invoiceService";
import {
  formatDate,
  formatMoney,
  inputClassName,
  invoiceStatusOptions,
  invoiceTypeOptions,
  selectClassName,
} from "./_components";

export const dynamic = "force-dynamic";

type InvoicesPageProps = {
  searchParams: Promise<{ search?: string; status?: string; type?: string }>;
};

function toStatus(value?: string) {
  if (!value || value === "ALL") return "ALL";
  return Object.values(InvoiceStatus).includes(value as InvoiceStatus) ? (value as InvoiceStatus) : "ALL";
}

function toType(value?: string) {
  if (!value || value === "ALL") return "ALL";
  return Object.values(InvoiceType).includes(value as InvoiceType) ? (value as InvoiceType) : "ALL";
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = toStatus(params.status);
  const type = toType(params.type);
  let invoices: Awaited<ReturnType<typeof invoiceService.listInvoices>>;
  let currency = "SAR";
  let timeZone = "UTC";

  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    timeZone = context.timeZone;
    invoices = await invoiceService.listInvoices(context.shopId, { status, type, search });
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  const financiallyActive = invoices.filter((invoice) => invoice.status !== InvoiceStatus.VOID);
  const totalBilled = financiallyActive.reduce((sum, invoice) => sum + Number(invoice.total), 0);
  const totalPaid = financiallyActive.reduce((sum, invoice) => sum + Number(invoice.amountPaid), 0);
  const totalOutstanding = financiallyActive.reduce((sum, invoice) => sum + Number(invoice.balanceDue), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="الفواتير" description="تابع الفواتير والمدفوعات المرتبطة بالصيانة والمبيعات" />

      <div className="invoice-kpis grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InvoiceKpi icon={FileText} label="الفواتير المعروضة" value={String(invoices.length)} tone="cyan" helper="حسب الفلاتر الحالية" />
        <InvoiceKpi icon={WalletCards} label="إجمالي الفواتير" value={formatMoney(totalBilled, currency)} tone="indigo" helper="باستثناء الفواتير الملغاة" />
        <InvoiceKpi icon={CheckCircle2} label="إجمالي المقبوض" value={formatMoney(totalPaid, currency)} tone="emerald" helper="الدفعات المسجلة" />
        <InvoiceKpi icon={WalletCards} label="إجمالي المتبقي" value={formatMoney(totalOutstanding, currency)} tone="amber" helper="الرصيد المطلوب تحصيله" />
      </div>

      <form className="erp-filter-card grid gap-5 lg:grid-cols-[1fr_220px_220px_auto] items-end">
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>بحث عن فاتورة</span>
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input className={`${inputClassName} pr-10`} name="search" placeholder="ابحث برقم الفاتورة، اسم العميل، هاتف العميل..." defaultValue={search} />
          </div>
        </div>
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>الحالة</span>
          <select className={selectClassName} name="status" defaultValue={status}>
            <option value="ALL">كل الحالات المالية</option>
            {invoiceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>النوع</span>
          <select className={selectClassName} name="type" defaultValue={type}>
            <option value="ALL">كل أنواع الفواتير</option>
            {invoiceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <Button type="submit" className="w-full lg:w-auto font-bold shadow-sm h-11 px-6 rounded-xl">
          <Search className="h-4 w-4 ml-1.5" aria-hidden="true" />تطبيق الفلتر
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        {invoices.length === 0 ? (
          <EmptyState icon={FileText} title="لا توجد فواتير بعد" description="يمكن إنشاء الفواتير تلقائياً من تفاصيل طلب صيانة أو عملية بيع جديدة." />
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[920px]">
              <thead><tr><th>رقم الفاتورة</th><th>النوع</th><th>العميل</th><th>الإجمالي النهائي</th><th>المدفوع</th><th>المبلغ المتبقي</th><th>الحالة</th><th>تاريخ الإصدار</th><th className="w-28 text-center">الإجراءات</th></tr></thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-middle">
                    <td className="font-black font-numeric text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="font-semibold text-slate-700">{invoiceTypeLabels[invoice.type]}</td>
                    <td className="font-bold text-slate-900">{invoice.customer?.name ?? "-"}</td>
                    <td className="font-black font-numeric text-slate-900">{formatMoney(invoice.total, currency)}</td>
                    <td className="font-numeric text-slate-700 font-medium">{formatMoney(invoice.amountPaid, currency)}</td>
                    <td className={cn("font-black font-numeric", Number(invoice.balanceDue) > 0 ? "text-amber-700" : "text-slate-600")}>{formatMoney(invoice.balanceDue, currency)}</td>
                    <td><InvoiceStatusBadge status={invoice.status} /></td>
                    <td className="font-numeric text-slate-600 font-medium">{formatDate(invoice.issuedAt, timeZone)}</td>
                    <td className="text-center">
                      <Button asChild variant="outline" size="sm" className="font-bold rounded-lg">
                        <Link href={`/invoices/${invoice.id}`}><Eye className="h-3.5 w-3.5 ml-1" aria-hidden="true" />عرض</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col justify-center gap-2.5 sm:flex-row mt-4">
          <Button asChild className="font-bold shadow-sm rounded-xl px-5"><Link href="/repair-orders"><Wrench className="h-4 w-4 ml-1.5" aria-hidden="true" />عرض طلبات الصيانة</Link></Button>
          <Button asChild variant="outline" className="font-bold shadow-sm border-slate-200 rounded-xl px-5"><Link href="/sales">عرض المبيعات</Link></Button>
        </div>
      ) : null}
    </div>
  );
}

function InvoiceKpi({ icon: Icon, label, value, helper, tone }: { icon: typeof FileText; label: string; value: string; helper: string; tone: "cyan" | "indigo" | "emerald" | "amber" }) {
  return (
    <div className={`invoice-kpi invoice-kpi--${tone}`}>
      <span className="invoice-kpi__icon"><Icon className="h-5 w-5" /></span>
      <div className="invoice-kpi__label">{label}</div>
      <div className="invoice-kpi__value">{value}</div>
      <div className="invoice-kpi__helper">{helper}</div>
    </div>
  );
}
