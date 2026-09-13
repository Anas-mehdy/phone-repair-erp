import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { EmployeePosForm } from "../_employee-pos-form";

export const dynamic = "force-dynamic";

export default async function EmployeePosPage() {
  const auth = await requirePermission("sales:create_own");
  const [inventory, customers] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { shopId: auth.shop.id, deletedAt: null, quantity: { gt: 0 } },
      select: { id: true, name: true, sku: true, quantity: true, unitPrice: true },
      orderBy: { name: "asc" },
      take: 1000,
    }),
    prisma.customer.findMany({
      where: { shopId: auth.shop.id, deletedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="موظف المبيعات" title="نقطة البيع" description="بيع أصناف المخزون بالسعر المعتمد، مع تسجيل العملية باسم الموظف تلقائياً." />
      <EmployeePosForm
        currency={auth.shop.currency || "SAR"}
        inventory={inventory.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) }))}
        customers={customers}
      />
    </div>
  );
}
