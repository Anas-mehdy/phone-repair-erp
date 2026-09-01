import { InventoryMovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StoredSupplierInvoiceReference } from "./supplierInvoiceStorage";

export type SupplierInvoiceInventoryResult = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unitCost: string;
};

export type SupplierInvoiceListRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string | null;
  invoiceDate: Date;
  total: Prisma.Decimal;
  itemCount: number;
  attachmentName: string | null;
  createdAt: Date;
};

export type SupplierInvoiceDetailItem = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  sku: string | null;
  quantity: number;
  unitCost: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

export type SupplierInvoiceDetail = {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string | null;
  invoiceDate: Date;
  notes: string | null;
  total: Prisma.Decimal;
  attachmentPath: string | null;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  attachmentSize: number | null;
  createdAt: Date;
  items: SupplierInvoiceDetailItem[];
};

export type CreateSupplierInvoiceInput = {
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate: string;
  notes?: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: string;
  }>;
};

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function searchInventoryForSupplierInvoice(
  shopId: string,
  rawQuery: string,
  limit = 20,
): Promise<SupplierInvoiceInventoryResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  const items = await prisma.inventoryItem.findMany({
    where: {
      shopId,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      quantity: true,
      unitCost: true,
    },
    orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 30),
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    quantity: item.quantity,
    unitCost: item.unitCost?.toString() ?? "0",
  }));
}

export async function listSupplierInvoices(shopId: string, supplierId?: string) {
  const supplierFilter = supplierId
    ? Prisma.sql`AND si."supplierId" = ${supplierId}::uuid`
    : Prisma.empty;

  return prisma.$queryRaw<SupplierInvoiceListRow[]>`
    SELECT
      si."id" AS "id",
      si."supplierId" AS "supplierId",
      s."name" AS "supplierName",
      si."invoiceNumber" AS "invoiceNumber",
      si."invoiceDate" AS "invoiceDate",
      si."total" AS "total",
      COUNT(sii."id")::int AS "itemCount",
      si."attachmentName" AS "attachmentName",
      si."createdAt" AS "createdAt"
    FROM "SupplierInvoice" si
    INNER JOIN "Supplier" s
      ON s."id" = si."supplierId"
      AND s."shopId" = ${shopId}::uuid
    LEFT JOIN "SupplierInvoiceItem" sii
      ON sii."supplierInvoiceId" = si."id"
      AND sii."shopId" = ${shopId}::uuid
    WHERE si."shopId" = ${shopId}::uuid
      AND si."deletedAt" IS NULL
      ${supplierFilter}
    GROUP BY si."id", s."name"
    ORDER BY si."invoiceDate" DESC, si."createdAt" DESC
    LIMIT 200
  `;
}

export async function getSupplierInvoiceById(
  shopId: string,
  invoiceId: string,
): Promise<SupplierInvoiceDetail | null> {
  const headers = await prisma.$queryRaw<Array<Omit<SupplierInvoiceDetail, "items">>>`
    SELECT
      si."id" AS "id",
      si."supplierId" AS "supplierId",
      s."name" AS "supplierName",
      si."invoiceNumber" AS "invoiceNumber",
      si."invoiceDate" AS "invoiceDate",
      si."notes" AS "notes",
      si."total" AS "total",
      si."attachmentPath" AS "attachmentPath",
      si."attachmentName" AS "attachmentName",
      si."attachmentMimeType" AS "attachmentMimeType",
      si."attachmentSize" AS "attachmentSize",
      si."createdAt" AS "createdAt"
    FROM "SupplierInvoice" si
    INNER JOIN "Supplier" s
      ON s."id" = si."supplierId"
      AND s."shopId" = ${shopId}::uuid
    WHERE si."id" = ${invoiceId}::uuid
      AND si."shopId" = ${shopId}::uuid
      AND si."deletedAt" IS NULL
    LIMIT 1
  `;

  const header = headers[0];
  if (!header) return null;

  const items = await prisma.$queryRaw<SupplierInvoiceDetailItem[]>`
    SELECT
      sii."id" AS "id",
      sii."inventoryItemId" AS "inventoryItemId",
      sii."itemName" AS "itemName",
      i."sku" AS "sku",
      sii."quantity" AS "quantity",
      sii."unitCost" AS "unitCost",
      sii."lineTotal" AS "lineTotal"
    FROM "SupplierInvoiceItem" sii
    LEFT JOIN "InventoryItem" i
      ON i."id" = sii."inventoryItemId"
      AND i."shopId" = ${shopId}::uuid
    WHERE sii."shopId" = ${shopId}::uuid
      AND sii."supplierInvoiceId" = ${invoiceId}::uuid
    ORDER BY sii."createdAt" ASC
  `;

  return { ...header, items };
}

export async function createSupplierInvoice(
  shopId: string,
  createdByUserId: string,
  invoiceId: string,
  input: CreateSupplierInvoiceInput,
  attachment: StoredSupplierInvoiceReference | null,
) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: input.supplierId,
      shopId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!supplier) {
    throw new Error("المورد المحدد غير موجود أو لا ينتمي إلى هذا المتجر.");
  }

  if (input.items.length === 0) {
    throw new Error("أضف بنداً واحداً على الأقل إلى الفاتورة.");
  }

  const invoiceDate = new Date(`${input.invoiceDate}T00:00:00.000Z`);
  if (Number.isNaN(invoiceDate.getTime())) {
    throw new Error("تاريخ الفاتورة غير صالح.");
  }

  const normalizedItems = input.items.map((item) => {
    const quantity = Math.trunc(item.quantity);
    const unitCost = new Prisma.Decimal(item.unitCost.replace(",", "."));
    if (quantity <= 0) throw new Error("كمية كل بند يجب أن تكون أكبر من صفر.");
    if (unitCost.isNegative()) throw new Error("تكلفة القطعة لا يمكن أن تكون سالبة.");
    return {
      ...item,
      quantity,
      unitCost,
      lineTotal: unitCost.mul(quantity),
      id: crypto.randomUUID(),
    };
  });

  const total = normalizedItems.reduce(
    (sum, item) => sum.add(item.lineTotal),
    new Prisma.Decimal(0),
  );

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "SupplierInvoice" (
        "id", "shopId", "supplierId", "createdByUserId", "invoiceNumber",
        "invoiceDate", "notes", "total", "attachmentPath", "attachmentName",
        "attachmentMimeType", "attachmentSize"
      ) VALUES (
        ${invoiceId}::uuid,
        ${shopId}::uuid,
        ${input.supplierId}::uuid,
        ${createdByUserId}::uuid,
        ${emptyToNull(input.invoiceNumber)},
        ${invoiceDate},
        ${emptyToNull(input.notes)},
        ${total},
        ${attachment?.path ?? null},
        ${attachment?.name ?? null},
        ${attachment?.mimeType ?? null},
        ${attachment?.size ?? null}
      )
    `;

    for (const itemInput of normalizedItems) {
      const item = await tx.inventoryItem.findFirst({
        where: {
          id: itemInput.inventoryItemId,
          shopId,
          deletedAt: null,
        },
        select: { id: true, name: true },
      });
      if (!item) {
        throw new Error("إحدى قطع المخزون لم تعد موجودة أو لا تنتمي إلى هذا المتجر.");
      }

      const updated = await tx.$queryRaw<Array<{ quantity: number }>>`
        UPDATE "InventoryItem"
        SET
          "quantity" = "quantity" + ${itemInput.quantity},
          "unitCost" = ${itemInput.unitCost},
          "version" = "version" + 1,
          "updatedAt" = NOW()
        WHERE "id" = ${item.id}::uuid
          AND "shopId" = ${shopId}::uuid
          AND "deletedAt" IS NULL
        RETURNING "quantity"
      `;
      if (updated.length === 0) {
        throw new Error(`تعذر تحديث المخزون للقطعة: ${item.name}`);
      }

      await tx.$executeRaw`
        INSERT INTO "SupplierInvoiceItem" (
          "id", "shopId", "supplierInvoiceId", "inventoryItemId",
          "itemName", "quantity", "unitCost", "lineTotal"
        ) VALUES (
          ${itemInput.id}::uuid,
          ${shopId}::uuid,
          ${invoiceId}::uuid,
          ${item.id}::uuid,
          ${item.name},
          ${itemInput.quantity},
          ${itemInput.unitCost},
          ${itemInput.lineTotal}
        )
      `;

      const movement = await tx.inventoryMovement.create({
        data: {
          shopId,
          inventoryItemId: item.id,
          createdByUserId,
          type: InventoryMovementType.STOCK_IN,
          quantityChange: itemInput.quantity,
          quantityAfter: updated[0].quantity,
          unitCostSnapshot: itemInput.unitCost,
          note: input.invoiceNumber?.trim()
            ? `فاتورة مورد رقم ${input.invoiceNumber.trim()}`
            : "توريد من فاتورة مورد",
        },
        select: { id: true },
      });

      await tx.$executeRaw`
        UPDATE "InventoryMovement"
        SET
          "supplierId" = ${input.supplierId}::uuid,
          "supplierInvoiceId" = ${invoiceId}::uuid,
          "supplierInvoiceItemId" = ${itemInput.id}::uuid
        WHERE "id" = ${movement.id}::uuid
          AND "shopId" = ${shopId}::uuid
      `;
    }
  });

  return { id: invoiceId, total };
}

export const supplierInvoiceService = {
  searchInventoryForSupplierInvoice,
  listSupplierInvoices,
  getSupplierInvoiceById,
  createSupplierInvoice,
};
