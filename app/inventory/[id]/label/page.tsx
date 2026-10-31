import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { normalizeDeviceDetails } from "@/lib/inventory-device";
import { makeDeviceLabel } from "@/lib/device-label";
import { DeviceLabelStudio } from "./studio";
import { ensureInventoryLabelBarcode } from "@/lib/services/inventoryDeviceService";

export const dynamic = "force-dynamic";
export default async function DeviceLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission("inventory:read");
  const item = await prisma.inventoryItem.findFirst({ where: { id, shopId: auth.shop.id, deletedAt: null } });
  if (!item) notFound();
  let data: ReturnType<typeof makeDeviceLabel>;
  try {
    const barcode = item.barcode?.trim() || await ensureInventoryLabelBarcode(auth.shop.id, item.id);
    if (!barcode) notFound();
    data = makeDeviceLabel({ ...item, barcode, ...normalizeDeviceDetails(item) }, auth.shop.name, auth.shop.currency || "SAR");
  }
  catch (error) {
    return <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6"><h1 className="font-black">تعذر تجهيز ليبل الصنف</h1><p role="alert" className="mt-3 text-sm">{error instanceof Error ? error.message : "تعذر تجهيز الليبل."}</p><Link className="mt-4 inline-block font-bold text-teal-700 underline" href={`/inventory/${id}`}>العودة لبيانات الصنف</Link></div>;
  }
  return <DeviceLabelStudio data={data} inventoryItemId={item.id} />;
}
