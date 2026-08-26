import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { repairOrderService } from "@/lib/services/repairOrderService";
import { supplierService } from "@/lib/services/supplierService";
import { inventoryService } from "@/lib/services/inventoryService";
import { EditRepairOrderForm } from "./_edit-form";

export const dynamic = "force-dynamic";

type EditRepairOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRepairOrderPage({
  params,
}: EditRepairOrderPageProps) {
  const { id } = await params;
  let repairOrder: Awaited<ReturnType<typeof repairOrderService.getRepairOrderById>>;
  let suppliers: Awaited<ReturnType<typeof supplierService.listSuppliers>> = [];
  let inventoryItems: Awaited<ReturnType<typeof inventoryService.listInventoryItems>> = [];
  let currency = "SAR";

  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    [repairOrder, suppliers, inventoryItems] = await Promise.all([
      repairOrderService.getRepairOrderById(context.shopId, id),
      supplierService.listSuppliers(context.shopId),
      inventoryService.listInventoryItems(context.shopId),
    ]);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }
    throw error;
  }

  if (!repairOrder) {
    notFound();
  }

  const serializedInventory = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toString(),
    unitCost: item.unitCost ? item.unitCost.toString() : null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 min-w-0 max-w-full">
      <PageHeader
        title={`تعديل تذكرة الصيانة: ${repairOrder.ticketNumber}`}
        description="تعديل بيانات العميل، مواصفات الجهاز، تفاصيل العطل، قطع الغيار والتكاليف"
        actions={
          <Button asChild variant="outline" className="font-bold border-slate-300">
            <Link href={`/repair-orders/${repairOrder.id}`}>
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden="true" />
              رجوع للتذكرة
            </Link>
          </Button>
        }
      />

      <EditRepairOrderForm
        repairOrder={repairOrder}
        suppliers={suppliers}
        inventoryItems={serializedInventory}
        currency={currency}
      />
    </div>
  );
}
