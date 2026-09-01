import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { supplierService } from "@/lib/services/supplierService";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";
import { SupplierInvoiceForm } from "./_invoice-form";

export const dynamic = "force-dynamic";

export default async function NewSupplierInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  let supplier: Awaited<ReturnType<typeof supplierService.getSupplierById>>;
  let inventory: Awaited<ReturnType<typeof supplierInvoiceService.listInventoryOptions>> = [];

  try {
    const context = await getCurrentShopContext();
    [supplier, inventory] = await Promise.all([
      supplierService.getSupplierById(context.shopId, id),
      supplierInvoiceService.listInventoryOptions(context.shopId),
    ]);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  if (!supplier) notFound();

  const serializableInventory = inventory.map((item) => ({
    ...item,
    unitCost: item.unitCost?.toString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">إضافة فاتورة مورد</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">سجّل الفاتورة وبنودها وأرفق صورة أو PDF كمرجع اختياري.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/suppliers/${supplier.id}`}><ArrowRight className="ml-1 h-4 w-4" />رجوع للمورد</Link>
        </Button>
      </div>

      {query.error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {query.error}
        </div>
      ) : null}

      <SupplierInvoiceForm supplierId={supplier.id} supplierName={supplier.name} inventory={serializableInventory} />
    </div>
  );
}
