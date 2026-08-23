import { InvoiceStatus, InvoiceType } from "@prisma/client";
import { Eye, FileText, Search, Wrench } from "lucide-react";
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
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
  }>;
};

function toStatus(value?: string) {
  if (!value || value === "ALL") {
    return "ALL";
  }

  return Object.values(InvoiceStatus).includes(value as InvoiceStatus)
    ? (value as InvoiceStatus)
    : "ALL";
}

function toType(value?: string) {
  if (!value || value === "ALL") {
    return "ALL";
  }

  return Object.values(InvoiceType).includes(value as InvoiceType)
    ? (value as InvoiceType)
    : "ALL";
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = toStatus(params.status);
  const type = toType(params.type);
  let invoices: Awaited<ReturnType<typeof invoiceService.listInvoices>>;

  let currency = "SAR";
  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    invoices = await invoiceService.listInvoices(context.shopId, {
      status,
      type,
      search,
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="الفواتير"
        description="تابع الفواتير والمدفوعات المرتبطة بالصيانة والمبيعات"
      />

      {/* Summary Info Strip */}
      <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/15 p-4 text-xs font-semibold text-indigo-900/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-indigo-600" aria-hidden="true" />
          <span>
            يوجد حالياً <span className="font-bold font-numeric text-sm text-indigo-800">{invoices.length}</span> فاتورة مسجلة ومدرجة مالياً في النظام.
          </span>
        </div>
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full border border-indigo-200/40">
          السجلات المالية والفواتير
        </span>
      </div>

      {/* Premium Filter Card */}
      <form className="erp-filter-card grid gap-5 lg:grid-cols-[1fr_220px_220px_auto] items-end">
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>بحث عن فاتورة</span>
          <div className="relative">
            <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              className={`${inputClassName} pr-10`}
              name="search"
              placeholder="ابحث برقم الفاتورة، اسم العميل، هاتف العميل..."
              defaultValue={search}
            />
          </div>
        </div>
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>الحالة</span>
          <select className={selectClassName} name="status" defaultValue={status}>
            <option value="ALL">كل الحالات المالية</option>
            {invoiceStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2 text-xs font-extrabold text-slate-700">
          <span>النوع</span>
          <select className={selectClassName} name="type" defaultValue={type}>
            <option value="ALL">كل أنواع الفواتير</option>
            {invoiceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Button type="submit" className="w-full lg:w-auto font-bold shadow-sm h-11 px-6 rounded-xl">
            <Search className="h-4 w-4 ml-1.5" aria-hidden="true" />
            تطبيق الفلتر
          </Button>
        </div>
      </form>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="لا توجد فواتير بعد"
            description="يمكن إنشاء الفواتير تلقائياً من تفاصيل طلب صيانة أو عملية بيع جديدة."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[920px]">
              <thead>
                <tr>
                  <th className="text-slate-800">رقم الفاتورة</th>
                  <th className="text-slate-800">النوع</th>
                  <th className="text-slate-800">العميل</th>
                  <th className="text-slate-800">الإجمالي النهائي</th>
                  <th className="text-slate-800">المدفوع</th>
                  <th className="text-slate-800">المبلغ المتبقي</th>
                  <th className="text-slate-800">الحالة</th>
                  <th className="text-slate-800">تاريخ الإصدار</th>
                  <th className="w-28 text-slate-800 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-middle">
                    <td className="font-black font-numeric text-slate-900">{invoice.invoiceNumber}</td>
                    <td className="font-semibold text-slate-700">{invoiceTypeLabels[invoice.type]}</td>
                    <td className="font-bold text-slate-900">{invoice.customer?.name ?? "-"}</td>
                    <td className="font-black font-numeric text-slate-900">{formatMoney(invoice.total, currency)}</td>
                    <td className="font-numeric text-slate-700 font-medium">{formatMoney(invoice.amountPaid, currency)}</td>
                    <td className={cn("font-black font-numeric", Number(invoice.balanceDue) > 0 ? "text-amber-700" : "text-slate-600")}>
                      {formatMoney(invoice.balanceDue, currency)}
                    </td>
                    <td>
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="font-numeric text-slate-600 font-medium">{formatDate(invoice.issuedAt)}</td>
                    <td className="text-center">
                      <Button asChild variant="outline" size="sm" className="font-bold shadow-xs border-slate-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30 rounded-lg">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Eye className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
                          عرض
                        </Link>
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
          <Button asChild className="font-bold shadow-sm rounded-xl px-5">
            <Link href="/repair-orders">
              <Wrench className="h-4 w-4 ml-1.5" aria-hidden="true" />
              عرض طلبات الصيانة
            </Link>
          </Button>
          <Button asChild variant="outline" className="font-bold shadow-sm border-slate-200 rounded-xl px-5">
            <Link href="/sales">عرض المبيعات</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
