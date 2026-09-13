import { InventoryMovementType, Prisma, SaleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dayUtcBoundsForTimeZone } from "@/lib/timezone";
import { moneyAccountService } from "@/lib/services/moneyAccountService";
import { salesService } from "@/lib/services/salesService";

let auditReady: Promise<void> | null = null;
async function ensureAuditTable() {
  if (!auditReady) {
    auditReady = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SaleAuditEvent" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "saleId" UUID NOT NULL REFERENCES "Sale"("id") ON DELETE CASCADE,
        "actorUserId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
        "action" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SaleAuditEvent_shopId_saleId_createdAt_idx" ON "SaleAuditEvent"("shopId", "saleId", "createdAt")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SaleAuditEvent_shopId_actorUserId_createdAt_idx" ON "SaleAuditEvent"("shopId", "actorUserId", "createdAt")`);
    })().catch((error) => { auditReady = null; throw error; });
  }
  await auditReady;
}

function assertSameBusinessDay(soldAt: Date, timeZone: string) {
  const bounds = dayUtcBoundsForTimeZone(new Date(), timeZone);
  if (soldAt < bounds.start || soldAt >= bounds.end) throw new Error("موظف المبيعات يستطيع تعديل أو إلغاء مبيعاته ضمن يوم العمل نفسه فقط.");
}

export async function listOwnSales(shopId: string, userId: string, search?: string, status?: SaleStatus) {
  const q = search?.trim();
  return prisma.sale.findMany({
    where: {
      shopId, createdByUserId: userId, deletedAt: null, ...(status ? { status } : {}),
      ...(q ? { OR: [{ receiptNumber: { contains: q, mode: "insensitive" as const } }, { customer: { is: { name: { contains: q, mode: "insensitive" as const } } } }] } : {}),
    },
    include: { customer: { select: { id: true, name: true, phone: true } }, items: { where: { deletedAt: null }, select: { id: true, description: true, quantity: true, unitPriceSnapshot: true, lineTotal: true } } },
    orderBy: { soldAt: "desc" }, take: 150,
  });
}

export async function getOwnSale(shopId: string, userId: string, saleId: string) {
  const sale = await salesService.getSaleById(shopId, saleId);
  if (!sale || sale.createdByUserId !== userId) return null;
  return sale;
}

export async function getSaleAudit(shopId: string, saleId: string) {
  await ensureAuditTable();
  const creator = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT u."id", u."name" FROM "Sale" s LEFT JOIN "User" u ON u."id" = s."createdByUserId"
    WHERE s."id" = ${saleId}::uuid AND s."shopId" = ${shopId}::uuid LIMIT 1
  `;
  const events = await prisma.$queryRaw<Array<{ id: string; action: string; createdAt: Date; actorName: string | null }>>`
    SELECT e."id", e."action", e."createdAt", u."name" AS "actorName"
    FROM "SaleAuditEvent" e LEFT JOIN "User" u ON u."id" = e."actorUserId"
    WHERE e."shopId" = ${shopId}::uuid AND e."saleId" = ${saleId}::uuid ORDER BY e."createdAt" DESC
  `;
  return { creator: creator[0] ?? null, events };
}

async function recordAudit(shopId: string, saleId: string, actorUserId: string, action: "UPDATED" | "CANCELLED", metadata?: unknown) {
  await ensureAuditTable();
  const json = metadata == null ? null : JSON.stringify(metadata);
  await prisma.$executeRaw`INSERT INTO "SaleAuditEvent" ("shopId", "saleId", "actorUserId", "action", "metadata", "createdAt") VALUES (${shopId}::uuid, ${saleId}::uuid, ${actorUserId}::uuid, ${action}, ${json}::jsonb, NOW())`;
}

export async function cancelOwnSale(shopId: string, userId: string, saleId: string, timeZone: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, shopId, createdByUserId: userId, deletedAt: null },
    select: { id: true, soldAt: true, status: true, invoices: { where: { deletedAt: null, status: { not: "VOID" } }, select: { id: true }, take: 1 } },
  });
  if (!sale) throw new Error("المبيعة غير موجودة أو لا تعود لهذا الموظف.");
  assertSameBusinessDay(sale.soldAt, timeZone);
  if (sale.invoices.length) throw new Error("لا يمكن للموظف إلغاء مبيعة تم إصدار فاتورة محاسبية لها. راجع المدير.");
  await salesService.cancelSale(shopId, saleId, userId);
  await recordAudit(shopId, saleId, userId, "CANCELLED");
}

export async function updateOwnSaleQuantities(shopId: string, userId: string, saleId: string, timeZone: string, quantities: Array<{ saleItemId: string; quantity: number }>) {
  if (!quantities.length) throw new Error("لا توجد بنود لتعديلها.");
  const ownership = await prisma.sale.findFirst({ where: { id: saleId, shopId, createdByUserId: userId, deletedAt: null }, select: { soldAt: true } });
  if (!ownership) throw new Error("المبيعة غير موجودة أو لا تعود لهذا الموظف.");
  assertSameBusinessDay(ownership.soldAt, timeZone);
  await moneyAccountService.prepareMoneyAccounts(shopId, "DRAWER");

  const result = await prisma.$transaction(async (tx) => {
    const saleRows = await tx.$queryRaw<Array<{ id: string; status: string; subtotal: Prisma.Decimal; total: Prisma.Decimal; receiptNumber: string | null; customerId: string | null }>>`
      SELECT "id", "status", "subtotal", "total", "receiptNumber", "customerId" FROM "Sale"
      WHERE "id"=${saleId}::uuid AND "shopId"=${shopId}::uuid AND "createdByUserId"=${userId}::uuid AND "deletedAt" IS NULL FOR UPDATE
    `;
    const sale = saleRows[0];
    if (!sale) throw new Error("المبيعة غير موجودة أو لا تعود لهذا الموظف.");
    if (sale.status !== SaleStatus.COMPLETED) throw new Error("يمكن تعديل المبيعات المكتملة فقط.");
    if (await tx.invoice.count({ where: { shopId, saleId, deletedAt: null, status: { not: "VOID" } } })) throw new Error("لا يمكن تعديل مبيعة تم إصدار فاتورة محاسبية لها. راجع المدير.");

    const items = await tx.saleItem.findMany({ where: { shopId, saleId, deletedAt: null }, select: { id: true, inventoryItemId: true, description: true, quantity: true, unitPriceSnapshot: true, discountTotal: true } });
    const requested = new Map(quantities.map((row) => [row.saleItemId, row.quantity]));
    if (requested.size !== items.length || items.some((item) => !requested.has(item.id))) throw new Error("يجب إرسال جميع بنود المبيعة كما هي.");
    for (const quantity of requested.values()) if (!Number.isInteger(quantity) || quantity < 1) throw new Error("الكمية يجب أن تكون عدداً صحيحاً أكبر من صفر.");

    const before = items.map((item) => ({ id: item.id, quantity: item.quantity }));
    let newSubtotal = new Prisma.Decimal(0);
    let newDiscount = new Prisma.Decimal(0);
    for (const item of items) {
      const nextQuantity = requested.get(item.id)!;
      const delta = nextQuantity - item.quantity;
      const lineSubtotal = item.unitPriceSnapshot.mul(nextQuantity);
      const lineDiscount = Prisma.Decimal.min(item.discountTotal, lineSubtotal);
      const lineTotal = lineSubtotal.sub(lineDiscount);
      newSubtotal = newSubtotal.add(lineSubtotal);
      newDiscount = newDiscount.add(lineDiscount);
      if (delta !== 0 && item.inventoryItemId) {
        const inventoryRows = await tx.$queryRaw<Array<{ id: string; quantity: number; unitCost: Prisma.Decimal | null }>>`
          SELECT "id", "quantity", "unitCost" FROM "InventoryItem" WHERE "id"=${item.inventoryItemId}::uuid AND "shopId"=${shopId}::uuid AND "deletedAt" IS NULL FOR UPDATE
        `;
        const inventory = inventoryRows[0];
        if (!inventory) throw new Error(`قطعة المخزون المرتبطة بالبند «${item.description}» غير موجودة.`);
        const nextStock = inventory.quantity - delta;
        if (nextStock < 0) throw new Error(`الكمية المتاحة من «${item.description}» غير كافية للتعديل.`);
        await tx.inventoryItem.update({ where: { id: inventory.id }, data: { quantity: nextStock, version: { increment: 1 } } });
        await tx.inventoryMovement.create({ data: { shopId, inventoryItemId: inventory.id, saleId, saleItemId: item.id, createdByUserId: userId, type: delta > 0 ? InventoryMovementType.SALE : InventoryMovementType.RETURN, quantityChange: -delta, quantityAfter: nextStock, unitCostSnapshot: inventory.unitCost, note: delta > 0 ? "زيادة كمية مبيعة بواسطة موظف المبيعات" : "تخفيض كمية مبيعة وإرجاع الفرق للمخزون" } });
      }
      await tx.saleItem.update({ where: { id: item.id }, data: { quantity: nextQuantity, lineTotal, version: { increment: 1 } } });
    }

    const newTotal = newSubtotal.sub(newDiscount);
    const difference = newTotal.sub(sale.total);
    const source = { sourceType: "SALE" as const, sourceId: saleId, sourceReference: sale.receiptNumber, customerId: sale.customerId };
    if (difference.gt(0)) await moneyAccountService.applyIncomingMoneyTx(tx, shopId, userId, { destination: "DRAWER", amount: difference, description: `فرق تعديل مبيعة ${sale.receiptNumber ?? saleId}`, drawerType: "SALE_CASH", movementType: "SALE_ADJUSTMENT", source });
    else if (difference.lt(0)) await moneyAccountService.applyOutgoingMoneyTx(tx, shopId, userId, { destination: "DRAWER", amount: difference.abs(), description: `إرجاع فرق تعديل مبيعة ${sale.receiptNumber ?? saleId}`, movementType: "SALE_ADJUSTMENT", contextLabel: "فرق تعديل المبيعة", source });
    await tx.sale.update({ where: { id: saleId }, data: { subtotal: newSubtotal, discountTotal: newDiscount, total: newTotal, version: { increment: 1 } } });
    return { before, after: items.map((item) => ({ id: item.id, quantity: requested.get(item.id)! })), oldTotal: Number(sale.total), newTotal: Number(newTotal) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });

  await recordAudit(shopId, saleId, userId, "UPDATED", result);
  return result;
}

export const salesEmployeeService = { listOwnSales, getOwnSale, getSaleAudit, cancelOwnSale, updateOwnSaleQuantities };
