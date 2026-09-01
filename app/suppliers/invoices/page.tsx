import { Eye, FileText, Paperclip, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";

export const dynamic = "force-dynamic";

export default async function SupplierInvoicesPage() {
  let invoices: Awaited<ReturnType<typeof supplierInvoiceService.listSupplierInvoices>> = [];
  let currency = "SAR";

  try {
    const auth = await requirePermission("suppliers:manage");
    currency = auth.shop.currency;
    invoices = await supplierInvoiceService.listSupplierInvoices(auth.shop.id);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="فواتير الموردين"
        description="سجّل فواتير الشراء واربط بنودها بالمخزون، مع الاحتفاظ بصورة أو PDF كمرجع اختياري."
        actions={
          <Button asChild className="font-bold">
            <Link href="/suppliers/invoices/new">
              <Plus className="ml-1.5 h-4 w-4" />
              فاتورة جديدة
            </Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/30 p-4 text-xs font-semibold text-indigo-900">
        حفظ المرفق اختياري، ولا يتم قراءة محتواه آلياً. الهدف أن يبقى نسخة مرجعية يمكن الرجوع إليها لاحقاً.
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200">
              <ReceiptText className="h-6 w-6" />
            </div>
            <p className="mt-4 text-sm font-extrabold text-slate-900">لا توجد فواتير موردين بعد.</p>
            <p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-slate-500">
              أضف أول فاتورة، اختر القطع والكميات وتكلفة الشراء، وسيتم تحديث المخزون تلقائياً عند الحفظ.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[860px]">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>المورد</th>
                  <th>تاريخ الفاتورة</th>
                  <th className="text-center">البنود</th>
                  <th>الإجمالي</th>
                  <th className="text-center">المرجع</th>
                  <th className="text-center">عرض</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="align-middle">
                    <td className="font-black font-numeric text-slate-900">
                      {invoice.invoiceNumber || "بدون رقم"}
                    </td>
                    <td className="font-bold text-slate-800">
                      <Link className="text-teal-700 hover:underline" href={`/suppliers/${invoice.supplierId}`}>
                        {invoice.supplierName}
                      </Link>
                    </td>
                    <td className="font-numeric text-xs font-semibold text-slate-600">{formatDate(invoice.invoiceDate)}</td>
                    <td className="text-center font-black font-numeric text-slate-800">{invoice.itemCount}</td>
                    <td className="font-black font-numeric text-indigo-700">{formatCurrency(Number(invoice.total), currency)}</td>
                    <td className="text-center">
                      {invoice.attachmentName ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          <Paperclip className="h-3 w-3" /> محفوظ
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">-</span>
                      )}
                    </td>
                    <td className="text-center">
                      <Button asChild variant="outline" size="sm" className="rounded-lg font-bold">
                        <Link href={`/suppliers/invoices/${invoice.id}`}>
                          <Eye className="ml-1 h-3.5 w-3.5" /> عرض
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

      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
        <FileText className="h-3.5 w-3.5" />
        يتم حفظ المرفقات في مساحة خاصة ولا تظهر كرابط عام.
      </div>
    </div>
  );
}
