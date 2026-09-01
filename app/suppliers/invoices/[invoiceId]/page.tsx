import { ArrowRight, ExternalLink, FileText, Package, Paperclip, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ invoiceId: string }> };

export default async function SupplierInvoiceDetailsPage({ params }: PageProps) {
  const { invoiceId } = await params;
  let invoice: Awaited<ReturnType<typeof supplierInvoiceService.getSupplierInvoiceById>>;
  let currency = "SAR";

  try {
    const auth = await requirePermission("suppliers:manage");
    currency = auth.shop.currency;
    invoice = await supplierInvoiceService.getSupplierInvoiceById(auth.shop.id, invoiceId);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber ? `فاتورة المورد ${invoice.invoiceNumber}` : "فاتورة مورد"}
        description={`المورد: ${invoice.supplierName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {invoice.attachmentPath ? (
              <Button asChild className="font-bold">
                <a href={`/suppliers/invoices/${invoice.id}/attachment`} target="_blank" rel="noreferrer">
                  <ExternalLink className="ml-1.5 h-4 w-4" />
                  فتح المرجع الأصلي
                </a>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/suppliers/invoices">
                <ArrowRight className="ml-1.5 h-4 w-4" /> رجوع للفواتير
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={<Truck className="h-5 w-5" />} label="المورد" value={<Link className="text-teal-700 hover:underline" href={`/suppliers/${invoice.supplierId}`}>{invoice.supplierName}</Link>} />
        <InfoCard icon={<FileText className="h-5 w-5" />} label="تاريخ الفاتورة" value={formatDate(invoice.invoiceDate)} />
        <InfoCard icon={<Package className="h-5 w-5" />} label="عدد البنود" value={String(invoice.items.length)} />
        <InfoCard icon={<Paperclip className="h-5 w-5" />} label="الإجمالي" value={formatCurrency(Number(invoice.total), currency)} />
      </div>

      <div className="erp-section">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-800">بنود الفاتورة</h3>
            <p className="mt-1 text-[11px] font-medium text-slate-400">الكميات أدناه أُضيفت إلى المخزون عند حفظ الفاتورة.</p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black font-numeric text-indigo-700">{formatCurrency(Number(invoice.total), currency)}</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="erp-table min-w-[760px]">
            <thead>
              <tr>
                <th>القطعة</th>
                <th>SKU</th>
                <th className="text-center">الكمية</th>
                <th>تكلفة الوحدة</th>
                <th>إجمالي البند</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="font-black text-slate-900"><Link className="text-teal-700 hover:underline" href={`/inventory/${item.inventoryItemId}`}>{item.itemName}</Link></td>
                  <td className="font-numeric text-xs text-slate-500">{item.sku ?? "-"}</td>
                  <td className="text-center font-black font-numeric text-slate-900">{item.quantity}</td>
                  <td className="font-black font-numeric text-slate-800">{formatCurrency(Number(item.unitCost), currency)}</td>
                  <td className="font-black font-numeric text-indigo-700">{formatCurrency(Number(item.lineTotal), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="erp-section">
          <h3 className="text-sm font-black text-slate-800">ملاحظات الفاتورة</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-600">{invoice.notes || "لا توجد ملاحظات."}</p>
        </div>
        <div className="erp-section">
          <h3 className="text-sm font-black text-slate-800">المرجع المرفق</h3>
          {invoice.attachmentPath ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="text-xs font-black text-emerald-800">{invoice.attachmentName || "ملف الفاتورة"}</p>
              <p className="mt-1 text-[10px] font-semibold text-emerald-600">
                {invoice.attachmentMimeType || "ملف"}
                {invoice.attachmentSize ? ` • ${(invoice.attachmentSize / 1024 / 1024).toFixed(2)} MB` : ""}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 border-emerald-300 font-bold text-emerald-700">
                <a href={`/suppliers/invoices/${invoice.id}/attachment`} target="_blank" rel="noreferrer"><ExternalLink className="ml-1 h-3.5 w-3.5" />استعراض الملف</a>
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-xs font-medium text-slate-400">لم يتم رفع صورة أو PDF لهذه الفاتورة.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="erp-section flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        <div className="mt-1 text-sm font-black text-slate-800">{value}</div>
      </div>
    </div>
  );
}
