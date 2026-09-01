import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";

export const dynamic = "force-dynamic";

export default async function SupplierInvoiceDetailsPage({ params, searchParams }: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ invoiceId }, query] = await Promise.all([params, searchParams]);
  let invoice: Awaited<ReturnType<typeof supplierInvoiceService.getSupplierInvoice>>;
  let currency = "SAR";

  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    invoice = await supplierInvoiceService.getSupplierInvoice(context.shopId, invoiceId);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">فاتورة المورد {invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : ""}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">{invoice.supplierName} · {formatDate(invoice.invoiceDate)}</p>
        </div>
        <div className="flex gap-2">
          {invoice.attachmentName ? (
            <Button asChild variant="outline">
              <a href={`/suppliers/invoices/${invoice.id}/attachment`} target="_blank" rel="noreferrer"><FileText className="ml-1 h-4 w-4" />عرض المرفق</a>
            </Button>
          ) : null}
          <Button asChild variant="outline"><Link href={`/suppliers/${invoice.supplierId}`}><ArrowRight className="ml-1 h-4 w-4" />رجوع للمورد</Link></Button>
        </div>
      </div>

      {query.created ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">تم حفظ الفاتورة وإضافة الكميات إلى المخزون بنجاح.</div> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="erp-section"><p className="text-xs font-bold text-slate-500">رقم الفاتورة</p><p className="mt-1 font-black text-slate-900">{invoice.invoiceNumber ?? "غير محدد"}</p></div>
        <div className="erp-section"><p className="text-xs font-bold text-slate-500">إجمالي الفاتورة</p><p className="mt-1 font-numeric text-xl font-black text-slate-900">{formatCurrency(invoice.total, currency)}</p></div>
        <div className="erp-section"><p className="text-xs font-bold text-slate-500">المرفق المرجعي</p><p className="mt-1 text-sm font-black text-slate-900">{invoice.attachmentName ?? "لا يوجد مرفق"}</p></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4"><h3 className="text-sm font-black text-slate-800">بنود الفاتورة</h3></div>
        <div className="overflow-x-auto">
          <table className="erp-table min-w-[700px]">
            <thead><tr><th>الصنف</th><th>SKU</th><th className="text-center">الكمية</th><th>تكلفة الوحدة</th><th>الإجمالي</th></tr></thead>
            <tbody>{invoice.items.map((item) => <tr key={item.id}><td className="font-bold"><Link className="text-teal-700 hover:underline" href={`/inventory/${item.inventoryItemId}`}>{item.itemName}</Link></td><td className="font-numeric text-xs text-slate-500">{item.sku ?? "-"}</td><td className="text-center font-numeric font-black">{item.quantity}</td><td className="font-numeric font-bold">{formatCurrency(item.unitCost, currency)}</td><td className="font-numeric font-black text-indigo-700">{formatCurrency(item.lineTotal, currency)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      {invoice.notes ? <div className="erp-section"><h3 className="mb-2 text-sm font-black text-slate-800">ملاحظات</h3><p className="whitespace-pre-wrap text-sm text-slate-600">{invoice.notes}</p></div> : null}
    </div>
  );
}
