import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import Link from "next/link";
import { getCurrentShopContext } from "@/lib/current-shop";
import { supplierInvoiceAttachmentService } from "@/lib/services/supplierInvoiceAttachmentService";

export const dynamic = "force-dynamic";

export default async function SupplierDetailsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentShopContext();
  const attachments = await supplierInvoiceAttachmentService.listAttachmentsForSupplier(context.shopId, id);

  return (
    <div className="space-y-5">
      {children}

      {attachments.length > 0 ? (
        <section className="erp-section">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><FileText className="h-4 w-4 text-indigo-700" />فواتير التوريد المرفوعة لهذا المورد</h3>
            <span className="text-xs font-bold text-slate-400">{attachments.length} فاتورة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[720px]">
              <thead><tr><th>الصنف</th><th>الكمية</th><th>اسم الملف</th><th>المرجع</th><th>الفاتورة</th></tr></thead>
              <tbody>
                {attachments.map((attachment) => (
                  <tr key={attachment.movementId}>
                    <td><Link className="font-bold text-teal-700 hover:underline" href={`/inventory/${attachment.inventoryItemId}`}>{attachment.itemName}</Link></td>
                    <td className="font-numeric font-bold">+{attachment.quantity}</td>
                    <td className="text-xs font-medium text-slate-600">{attachment.fileName}</td>
                    <td className="text-xs font-medium text-slate-500">{attachment.note || "-"}</td>
                    <td><a className="font-bold text-indigo-700 hover:underline" href={`/inventory/movements/${attachment.movementId}/invoice`} target="_blank" rel="noreferrer">فتح</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
