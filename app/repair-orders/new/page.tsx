import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { supplierService } from "@/lib/services/supplierService";
import { inventoryService } from "@/lib/services/inventoryService";
import { CreateRepairOrderForm } from "./_create-form";

export default async function NewRepairOrderPage() {
  const { shopId, currency } = await getCurrentShopContext();
  const [suppliers, inventoryItems] = await Promise.all([
    supplierService.listSuppliers(shopId),
    inventoryService.listInventoryItems(shopId),
  ]);

  const serializedInventory = inventoryItems.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toString(),
    unitCost: item.unitCost ? item.unitCost.toString() : null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="طلب صيانة جديد"
        description="أدخل بيانات العميل والجهاز والمورد لإنشاء طلب صيانة بحالة قيد الانتظار"
        actions={
          <Button asChild variant="outline">
            <Link href="/repair-orders">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              رجوع
            </Link>
          </Button>
        }
      />

      <CreateRepairOrderForm
        suppliers={suppliers}
        inventoryItems={serializedInventory}
        currency={currency}
      />
    </div>
  );
}

