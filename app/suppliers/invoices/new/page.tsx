import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/context";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { supplierService } from "@/lib/services/supplierService";
import { SupplierInvoiceForm } from "./_invoice-form";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ supplierId?: string }>;
};

export default async function NewSupplierInvoicePage({ searchParams }: PageProps) {
  const query = await searchParams;
  let suppliers: Awaited<ReturnType<typeof supplierService.listSuppliers>> = [];
  let currency = "SAR";

  try {
    const auth = await requirePermission("suppliers:manage");
    currency = auth.shop.currency;
    suppliers = await supplierService.listSuppliers(auth.shop.id);
  } catch (error) {
    if (isDatabaseConnectionError(error)) return <DatabaseUnavailable />;
    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إضافة فاتورة مورد"
        description="أدخل البنود يدوياً، وسيتم تحديث المخزون عند حفظ الفاتورة. صورة أو PDF الفاتورة اختياري كمرجع فقط."
        actions={
          <Button asChild variant="outline">
            <Link href="/suppliers/invoices">
              <ArrowRight className="ml-1.5 h-4 w-4" />
              رجوع للفواتير
            </Link>
          </Button>
        }
      />

      {suppliers.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">
          أضف مورداً أولاً من قسم الموردين قبل تسجيل فاتورة شراء.
        </div>
      ) : (
        <SupplierInvoiceForm
          suppliers={suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name }))}
          currency={currency}
          initialSupplierId={
            query.supplierId && suppliers.some((supplier) => supplier.id === query.supplierId)
              ? query.supplierId
              : ""
          }
        />
      )}
    </div>
  );
}
