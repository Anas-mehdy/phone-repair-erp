import type { ReactNode } from "react";
import { FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { getCurrentShopContext } from "@/lib/current-shop";
import { supplierInvoiceAttachmentService } from "@/lib/services/supplierInvoiceAttachmentService";

export const dynamic = "force-dynamic";

export default async function InventoryItemLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentShopContext();
  const attachments = await supplierInvoiceAttachmentService.listAttachmentsForInventoryItem(context.shopId, id);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-gradient-to-l from-teal-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">توريد من مورد مع فاتورة</p>
          <p className="mt-1 text-xs font-medium text-slate-500">أضف كمية جديدة وارفع صورة الفاتورة أو ملف PDF واحفظها مع حركة المخزون.</p>
        </div>
        <Link href={`/inventory/${id}/receive`} className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-teal-800">
          <PlusCircle className="ml-1.5 h-4 w-4" />توريد بفاتورة
        </Link>
      </div>

      {children}

      {attachments.length > 0 ? (
        <section className="erp-section">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><FileText className="h-4 w-4 text-teal-700" />فواتير المورد المرتبطة بهذا الصنف</h3>
            <span className="text-xs font-bold text-slate-400">{attachments.length} فاتورة</span>
          </div>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div key={attachment.movementId} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{attachment.supplierName || "مورد غير محدد"}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{attachment.fileName} · {Math.max(1, Math.round(attachment.fileSize / 1024))} KB</p>
                </div>
                <a className="text-sm font-bold text-teal-700 hover:underline" href={`/inventory/movements/${attachment.movementId}/invoice`} target="_blank" rel="noreferrer">فتح الفاتورة</a>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
