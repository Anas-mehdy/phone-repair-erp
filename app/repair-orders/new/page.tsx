import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentShopContext } from "@/lib/current-shop";
import { supplierService } from "@/lib/services/supplierService";
import { inventoryService } from "@/lib/services/inventoryService";
import { repairOrderService } from "@/lib/services/repairOrderService";
import { EntitlementAlert } from "@/components/subscription/entitlement-alert";
import type { EntitlementDenyCode } from "@/lib/services/subscriptionEntitlementService";
import { CreateRepairOrderForm } from "./_create-form";
import { RepairOnboardingQuickForm } from "./_onboarding-quick-form";

export default async function NewRepairOrderPage(props: {
  searchParams?: Promise<{ entitlement?: string; onboarding?: string; mode?: string }>;
}) {
  const searchParams = await props.searchParams;
  const entitlementCode = searchParams?.entitlement as EntitlementDenyCode | undefined;
  const onboardingMode = searchParams?.onboarding === "1";
  const onboardingFullMode = onboardingMode && searchParams?.mode === "full";

  const context = await getCurrentShopContext();

  if (onboardingMode && !onboardingFullMode) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        {entitlementCode === "SUBSCRIPTION_EXPIRED" ? (
          <EntitlementAlert
            code="SUBSCRIPTION_EXPIRED"
            customMessage="انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك."
            actionHref="/support"
            actionLabel="تواصل مع الدعم"
          />
        ) : null}
        <RepairOnboardingQuickForm />
      </div>
    );
  }
  const canAssign = context.permissions.includes("repairs:assign");
  const [suppliers, inventoryItems, technicians] = await Promise.all([
    supplierService.listSuppliers(context.shopId),
    inventoryService.listInventoryItems(context.shopId),
    canAssign
      ? repairOrderService.listAssignableTechnicians(context.shopId)
      : Promise.resolve([]),
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

      {entitlementCode === "SUBSCRIPTION_EXPIRED" && (
        <EntitlementAlert
          code="SUBSCRIPTION_EXPIRED"
          customMessage="انتهت فترة استخدامك. بياناتك محفوظة بالكامل، تواصل مع الدعم لتجديد الاشتراك."
          actionHref="/support"
          actionLabel="تواصل مع الدعم"
        />
      )}

      <CreateRepairOrderForm
        suppliers={suppliers}
        inventoryItems={serializedInventory}
        currency={context.currency}
        technicians={technicians}
        onboardingMode={onboardingMode}
        cancelHref={onboardingMode ? "/dashboard" : "/repair-orders"}
      />
    </div>
  );
}
