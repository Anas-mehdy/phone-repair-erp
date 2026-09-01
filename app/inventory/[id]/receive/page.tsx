import { ArrowRight, FileUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { inventoryService } from "@/lib/services/inventoryService";
import { supplierService } from "@/lib/services/supplierService";
import { Field, inputClassName, textareaClassName } from "../../_components";
import { receiveStockWithInvoiceAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ReceiveStockWithInvoicePage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const context = await getCurrentShopContext();
  const [item, suppliers] = await Promise.all([
    inventoryService.getInventoryItemById(context.shopId, id),
    supplierService.listSuppliers(context.shopId),
  ]);

  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-teal-700">توريد جديد</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">{item.name}</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">أضف الكمية واربطها بالمورد وأرفق صورة الفاتورة أو ملف PDF.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/inventory/${item.id}`}><ArrowRight className="ml-1.5 h-4 w-4" />رجوع</Link>
        </Button>
      </div>

      {query.error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{query.error}</div>
      ) : null}

      <form action={receiveStockWithInvoiceAction} encType="multipart/form-data" className="erp-section space-y-5">
        <input type="hidden" name="inventoryItemId" value={item.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الكمية المضافة">
            <input className={`${inputClassName} w-full font-numeric`} name="quantity" type="number" min="1" step="1" required placeholder="مثال: 10" />
          </Field>
          <Field label="المورد">
            <select className={`${inputClassName} w-full`} name="supplierId" defaultValue="">
              <option value="">بدون تحديد مورد</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>
          <Field label={`تكلفة شراء الوحدة (${context.currency})`}>
            <input className={`${inputClassName} w-full font-numeric`} name="unitCost" type="number" min="0" step="0.01" defaultValue={item.unitCost?.toString() ?? ""} placeholder="0.00" />
          </Field>
          <Field label="رقم الفاتورة / مرجع الشراء">
            <input className={`${inputClassName} w-full`} name="note" maxLength={1000} placeholder="مثال: INV-2026-123" />
          </Field>
        </div>

        <div className="rounded-2xl border border-dashed border-teal-300 bg-teal-50/40 p-5">
          <label className="block text-sm font-black text-slate-800">إرفاق فاتورة المورد</label>
          <p className="mt-1 text-xs font-medium text-slate-500">PDF أو JPG أو PNG أو WEBP، بحد أقصى 8 MB.</p>
          <input
            className="mt-3 block w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-2 text-sm font-medium text-slate-700"
            name="invoiceFile"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
          />
        </div>

        <Button type="submit" className="h-12 w-full rounded-xl font-bold">
          <FileUp className="ml-2 h-4 w-4" />حفظ التوريد والفاتورة
        </Button>
      </form>
    </div>
  );
}
