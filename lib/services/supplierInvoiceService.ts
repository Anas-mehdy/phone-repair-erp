import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SupplierInvoiceLineInput = { inventoryItemId: string; quantity: number; unitCost: number };
export type CreateSupplierInvoiceInput = {
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate: Date;
  notes?: string;
  items: SupplierInvoiceLineInput[];
  attachment?: { fileName: string; contentType: string; data: Buffer } | null;
};

export type SupplierInvoiceListRow = {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: Date;
  total: Prisma.Decimal;
  notes: string | null;
  itemCount: number;
  hasAttachment: boolean;
};

const ALLOWED_ATTACHMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function listInventoryOptions(shopId: string) {
  return prisma.inventoryItem.findMany({
    where: { shopId, deletedAt: null },
    select: { id: true, name: true, sku: true, category: true, quantity: true, unitCost: true },
    orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });
}

export async function listSupplierInvoices(shopId: string, supplierId: string) {
  return prisma.$queryRaw<SupplierInvoiceListRow[]>`
    SELECT
      i."id" AS "id",
      i."invoiceNumber" AS "invoiceNumber",
      i."invoiceDate" AS "invoiceDate",
      i."total" AS "total",
      i."notes" AS "notes",
      COUNT(li."id")::int AS "itemCount",
      (i."attachmentData" IS NOT NULL) AS "hasAttachment"
    FROM "SupplierInvoice" i
    LEFT JOIN "SupplierInvoiceItem" li
      ON li."supplierInvoiceId" = i."id" AND li."shopId" = ${shopId}::uuid
    WHERE i."shopId" = ${shopId}::uuid
      AND i."supplierId" = ${supplierId}::uuid
      AND i."deletedAt" IS NULL
    GROUP BY i."id"
    ORDER BY i."invoiceDate" DESC, i."createdAt" DESC
    LIMIT 100
  `;
}

export async function getSupplierInvoice(shopId: string, invoiceId: string) {
  const invoices = await prisma.$queryRaw<Array<{
    id: string; supplierId: string; supplierName: string; invoiceNumber: string | null; invoiceDate: Date;
    notes: string | null; total: Prisma.Decimal; attachmentName: string | null; attachmentMimeType: string | null; attachmentSize: number | null;
  }>>`
    SELECT i."id", i."supplierId", s."name" AS "supplierName", i."invoiceNumber", i."invoiceDate", i."notes", i."total",
           i."attachmentName", i."attachmentMimeType", i."attachmentSize"
    FROM "SupplierInvoice" i
    INNER JOIN "Supplier" s ON s."id" = i."supplierId" AND s."shopId" = ${shopId}::uuid
    WHERE i."id" = ${invoiceId}::uuid AND i."shopId" = ${shopId}::uuid AND i."deletedAt" IS NULL
    LIMIT 1
  `;
  const invoice = invoices[0];
  if (!invoice) return null;

  const items = await prisma.$queryRaw<Array<{
    id: string; inventoryItemId: string; itemName: string; sku: string | null; quantity: number; unitCost: Prisma.Decimal; lineTotal: Prisma.Decimal;
  }>>`
    SELECT li."id", li."inventoryItemId", li."itemName", inv."sku", li."quantity", li."unitCost", li."lineTotal"
    FROM "SupplierInvoiceItem" li
    INNER JOIN "InventoryItem" inv ON inv."id" = li."inventoryItemId" AND inv."shopId" = ${shopId}::uuid
    WHERE li."supplierInvoiceId" = ${invoiceId}::uuid AND li."shopId" = ${shopId}::uuid
    ORDER BY li."createdAt" ASC
  `;

  return { ...invoice, items };
}

export async function getAttachment(shopId: string, invoiceId: string) {
  const rows = await prisma.$queryRaw<Array<{ fileName: string; contentType: string; fileSize: number; data: Buffer }>>`
    SELECT "attachmentName" AS "fileName", "attachmentMimeType" AS "contentType", "attachmentSize" AS "fileSize", "attachmentData" AS "data"
    FROM "SupplierInvoice"
    WHERE "id" = ${invoiceId}::uuid AND "shopId" = ${shopId}::uuid AND "deletedAt" IS NULL AND "attachmentData" IS NOT NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createSupplierInvoice(shopId: string, createdByUserId: string | null, input: CreateSupplierInvoiceInput) {
  if (!input.items.length) throw new Error("أضف بنداً واحداً على الأقل للفاتورة.");
  if (input.items.length > 100) throw new Error("عدد بنود الفاتورة كبير جداً.");
  if (input.attachment) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(input.attachment.contentType)) throw new Error("نوع المرفق غير مدعوم.");
    if (input.attachment.data.length <= 0 || input.attachment.data.length > 5 * 1024 * 1024) throw new Error("حجم المرفق يجب ألا يتجاوز 5MB.");
  }

  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({ where: { id: input.supplierId, shopId, deletedAt: null }, select: { id: true } });
    if (!supplier) throw new Error("المورد غير موجود أو لا ينتمي إلى هذا المتجر.");

    const ids = [...new Set(input.items.map((item) => item.inventoryItemId))];
    const inventory = await tx.inventoryItem.findMany({ where: { id: { in: ids }, shopId, deletedAt: null }, select: { id: true, name: true } });
    if (inventory.length !== ids.length) throw new Error("أحد أصناف المخزون غير موجود أو لا ينتمي إلى هذا المتجر.");
    const nameById = new Map(inventory.map((item) => [item.id, item.name]));

    const normalized = input.items.map((item) => {
      const quantity = Math.trunc(Number(item.quantity));
      const unitCost = Number(item.unitCost);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("كل كمية يجب أن تكون أكبر من صفر.");
      if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("تكلفة الوحدة غير صحيحة.");
      return { ...item, quantity, unitCost, lineTotal: quantity * unitCost };
    });
    const total = normalized.reduce((sum, item) => sum + item.lineTotal, 0);

    const invoiceRows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "SupplierInvoice" (
        "shopId", "supplierId", "createdByUserId", "invoiceNumber", "invoiceDate", "notes", "total",
        "attachmentName", "attachmentMimeType", "attachmentSize", "attachmentData"
      ) VALUES (
        ${shopId}::uuid, ${input.supplierId}::uuid, ${createdByUserId}::uuid,
        ${input.invoiceNumber?.trim() || null}, ${input.invoiceDate}, ${input.notes?.trim() || null}, ${new Prisma.Decimal(total.toFixed(2))},
        ${input.attachment?.fileName ?? null}, ${input.attachment?.contentType ?? null}, ${input.attachment?.data.length ?? null}, ${input.attachment?.data ?? null}
      ) RETURNING "id"
    `;
    const invoiceId = invoiceRows[0]?.id;
    if (!invoiceId) throw new Error("تعذر إنشاء فاتورة المورد.");

    for (const line of normalized) {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: line.inventoryItemId },
        data: { quantity: { increment: line.quantity }, version: { increment: 1 } },
        select: { quantity: true },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          shopId,
          inventoryItemId: line.inventoryItemId,
          createdByUserId,
          type: "STOCK_IN",
          quantityChange: line.quantity,
          quantityAfter: updatedItem.quantity,
          unitCostSnapshot: new Prisma.Decimal(line.unitCost.toFixed(2)),
          note: input.invoiceNumber?.trim() ? `فاتورة مورد رقم ${input.invoiceNumber.trim()}` : "توريد عبر فاتورة مورد",
        },
        select: { id: true },
      });

      await tx.$executeRaw`UPDATE "InventoryMovement" SET "supplierId" = ${input.supplierId}::uuid WHERE "id" = ${movement.id}::uuid AND "shopId" = ${shopId}::uuid`;
      await tx.$executeRaw`
        INSERT INTO "SupplierInvoiceItem" (
          "shopId", "supplierInvoiceId", "inventoryItemId", "movementId", "itemName", "quantity", "unitCost", "lineTotal"
        ) VALUES (
          ${shopId}::uuid, ${invoiceId}::uuid, ${line.inventoryItemId}::uuid, ${movement.id}::uuid,
          ${nameById.get(line.inventoryItemId) ?? "صنف"}, ${line.quantity}, ${new Prisma.Decimal(line.unitCost.toFixed(2))}, ${new Prisma.Decimal(line.lineTotal.toFixed(2))}
        )
      `;
    }

    return { id: invoiceId, total };
  });
}

export const supplierInvoiceService = { listInventoryOptions, listSupplierInvoices, getSupplierInvoice, getAttachment, createSupplierInvoice };
