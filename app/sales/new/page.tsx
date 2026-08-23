import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { isDatabaseConnectionError } from "@/lib/database-errors";
import { inventoryService } from "@/lib/services/inventoryService";
import { SaleForm } from "../sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  let inventoryItems: Awaited<ReturnType<typeof inventoryService.listInventoryItems>>;

  let currency = "SAR";
  try {
    const context = await getCurrentShopContext();
    currency = context.currency;
    inventoryItems = await inventoryService.listInventoryItems(context.shopId);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return <DatabaseUnavailable />;
    }

    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="عملية بيع جديدة"
        description="أضف بنود بيع من المخزون أو بنوداً يدوية للخدمات والرسوم"
        actions={
          <Button asChild variant="outline">
            <Link href="/sales">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              رجوع
            </Link>
          </Button>
        }
      />

      <SaleForm
        currency={currency}
        inventoryItems={inventoryItems.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        }))}
      />
    </div>
  );
}
