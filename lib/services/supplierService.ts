import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "./repairOrderService";

export type SupplierListFilters = {
  search?: string;
};

export type CreateSupplierInput = {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export type UpdateSupplierInput = {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

export type SupplierStockReceipt = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unitCostSnapshot: Prisma.Decimal | null;
  note: string | null;
  createdAt: Date;
};

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listSuppliers(
  shopId: string,
  filters: SupplierListFilters = {},
) {
  const search = filters.search?.trim();

  return prisma.supplier.findMany({
    where: {
      shopId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          repairOrders: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });
}

export async function listSupplierStockReceipts(
  shopId: string,
  supplierId: string,
  limit = 100,
) {
  const safeLimit = Math.min(Math.max(limit, 1), 250);
  return prisma.$queryRaw<SupplierStockReceipt[]>`
    SELECT
      m."id" AS "id",
      m."inventoryItemId" AS "inventoryItemId",
      i."name" AS "itemName",
      i."sku" AS "sku",
      i."category" AS "category",
      m."quantityChange" AS "quantity",
      m."unitCostSnapshot" AS "unitCostSnapshot",
      m."note" AS "note",
      m."createdAt" AS "createdAt"
    FROM "InventoryMovement" m
    INNER JOIN "InventoryItem" i
      ON i."id" = m."inventoryItemId"
      AND i."shopId" = ${shopId}::uuid
    WHERE m."shopId" = ${shopId}::uuid
      AND m."supplierId" = ${supplierId}::uuid
      AND m."type" = 'STOCK_IN'::"InventoryMovementType"
      AND m."deletedAt" IS NULL
    ORDER BY m."createdAt" DESC
    LIMIT ${safeLimit}
  `;
}

export async function getSupplierById(shopId: string, supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      shopId,
      deletedAt: null,
    },
    include: {
      repairOrders: {
        where: {
          deletedAt: null,
        },
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!supplier) return null;

  const stockReceipts = await listSupplierStockReceipts(shopId, supplierId);
  return { ...supplier, stockReceipts };
}

export async function findOrCreateSupplier(
  shopId: string,
  supplierName: string,
  supplierPhone?: string,
) {
  const name = supplierName.trim();
  if (!name) {
    return null;
  }

  const phone = supplierPhone?.trim() || null;
  const phoneNormalized = phone ? normalizePhone(phone) : null;

  const existing = await prisma.supplier.findFirst({
    where: {
      shopId,
      deletedAt: null,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.supplier.create({
    data: {
      shopId,
      name,
      phone,
      phoneNormalized,
    },
  });
}

export async function createSupplier(
  shopId: string,
  input: CreateSupplierInput,
) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("اسم المورد مطلوب.");
  }

  const phone = input.phone?.trim() || null;
  const phoneNormalized = phone ? normalizePhone(phone) : null;

  return prisma.supplier.create({
    data: {
      shopId,
      name,
      phone,
      phoneNormalized,
      address: emptyToNull(input.address),
      notes: emptyToNull(input.notes),
    },
  });
}

export async function updateSupplier(
  shopId: string,
  supplierId: string,
  input: UpdateSupplierInput,
) {
  const existing = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      shopId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("المورد غير موجود.");
  }

  const phone = input.phone !== undefined ? (input.phone?.trim() || null) : undefined;
  const phoneNormalized = phone ? normalizePhone(phone) : phone === null ? null : undefined;

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      name: input.name?.trim(),
      phone,
      phoneNormalized,
      address: input.address !== undefined ? emptyToNull(input.address) : undefined,
      notes: input.notes !== undefined ? emptyToNull(input.notes) : undefined,
      version: { increment: 1 },
    },
  });
}

export async function deleteSupplier(shopId: string, supplierId: string) {
  const existing = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      shopId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("المورد غير موجود.");
  }

  return prisma.supplier.update({
    where: { id: supplierId },
    data: {
      deletedAt: new Date(),
    },
  });
}

export const supplierService = {
  listSuppliers,
  listSupplierStockReceipts,
  getSupplierById,
  findOrCreateSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
