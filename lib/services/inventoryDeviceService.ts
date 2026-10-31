import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { normalizeDeviceBarcode, type DeviceDetails } from "@/lib/inventory-device";
import { prisma } from "@/lib/prisma";

// Every barcode writer uses the same scoped lock before checking availability.
// This also prevents a device barcode colliding with a regular product barcode.
async function barcodeTakenTx(tx: Prisma.TransactionClient, shopId: string, barcode: string, exceptId?: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`inventory-barcode:${shopId}:${barcode}`}, 0))`;
  const existing = await tx.inventoryItem.findFirst({ where: { shopId, deletedAt: null, barcode, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
  return Boolean(existing);
}
export async function reserveInventoryBarcodeTx(tx: Prisma.TransactionClient, shopId: string, barcode: string, exceptId?: string) {
  if (await barcodeTakenTx(tx, shopId, barcode, exceptId)) throw new Error("الباركود مرتبط بصنف آخر. استخدم باركوداً مختلفاً لهذا الجهاز / المنتج.");
}
export async function prepareDeviceIdentityTx(tx: Prisma.TransactionClient, shopId: string, details: DeviceDetails, rawBarcode?: string | null, exceptId?: string) {
  let barcode = rawBarcode?.trim() || null;
  if (details.isDevice) {
    barcode = normalizeDeviceBarcode(barcode);
    if (details.deviceIdentifier) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`inventory-device:${shopId}:${details.deviceIdentifier}`}, 0))`;
      const existing = await tx.inventoryItem.findFirst({ where: { shopId, deletedAt: null, deviceIdentifier: details.deviceIdentifier, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
      if (existing) throw new Error("رقم IMEI / Serial مسجل لجهاز آخر في متجرك.");
    }
  }
  if (barcode) {
    await reserveInventoryBarcodeTx(tx, shopId, barcode, exceptId);
    return barcode;
  }
  // Every product gets a scanner-compatible identity, regardless of device type.
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `20${String(randomInt(0, 10_000_000_000)).padStart(10, "0")}`;
    if (!await barcodeTakenTx(tx, shopId, candidate, exceptId)) return candidate;
  }
  throw new Error("تعذر توليد باركود فريد للصنف. حاول مجدداً.");
}

/** Lazily backfill legacy products without changing their stock or device type. */
export async function ensureInventoryLabelBarcode(shopId: string, inventoryItemId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; barcode: string | null }>>`
      SELECT "id", "barcode" FROM "InventoryItem"
      WHERE "id"=${inventoryItemId}::uuid AND "shopId"=${shopId}::uuid AND "deletedAt" IS NULL FOR UPDATE
    `;
    const item = rows[0];
    if (!item) return null;
    if (item.barcode?.trim()) return item.barcode;
    const barcode = await prepareDeviceIdentityTx(tx, shopId, { isDevice: false, deviceModel: null, deviceCondition: null, batteryHealth: null, storageCapacity: null, deviceIdentifier: null }, null, item.id);
    await tx.$executeRaw`
      UPDATE "InventoryItem" SET "barcode"=${barcode}, "updatedAt"=NOW(), "version"="version"+1
      WHERE "id"=${item.id}::uuid AND "shopId"=${shopId}::uuid AND "deletedAt" IS NULL
    `;
    return barcode;
  });
}
