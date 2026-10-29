import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { normalizeDeviceBarcode, type DeviceDetails } from "@/lib/inventory-device";

// Every barcode writer uses the same scoped lock before checking availability.
// This also prevents a device barcode colliding with a regular product barcode.
export async function reserveInventoryBarcodeTx(tx: Prisma.TransactionClient, shopId: string, barcode: string, exceptId?: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`inventory-barcode:${shopId}:${barcode}`}, 0))`;
  const existing = await tx.inventoryItem.findFirst({ where: { shopId, deletedAt: null, barcode, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
  if (existing) throw new Error("الباركود مرتبط بصنف آخر. استخدم باركوداً مختلفاً لهذا الجهاز / المنتج.");
}
export async function prepareDeviceIdentityTx(tx: Prisma.TransactionClient, shopId: string, details: DeviceDetails, rawBarcode?: string | null, exceptId?: string) {
  let barcode = rawBarcode?.trim() || null;
  if (details.isDevice) {
    barcode = normalizeDeviceBarcode(barcode) ?? `20${String(randomInt(0, 10_000_000_000)).padStart(10, "0")}`;
    if (details.deviceIdentifier) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`inventory-device:${shopId}:${details.deviceIdentifier}`}, 0))`;
      const existing = await tx.inventoryItem.findFirst({ where: { shopId, deletedAt: null, deviceIdentifier: details.deviceIdentifier, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
      if (existing) throw new Error("رقم IMEI / Serial مسجل لجهاز آخر في متجرك.");
    }
  }
  if (barcode) await reserveInventoryBarcodeTx(tx, shopId, barcode, exceptId);
  return barcode;
}
