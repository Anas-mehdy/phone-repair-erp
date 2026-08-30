import {
  CompatibilityCandidateStatus,
  CompatibilityImportStatus,
  InventoryMovementType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type InventoryItemFilters = {
  search?: string;
  lowStockOnly?: boolean;
};

export type CreateInventoryItemInput = {
  name: string;
  category?: string;
  sku?: string;
  description?: string;
  unitCost?: string;
  unitPrice: string;
  quantity?: string;
  reorderLevel?: string;
  compatibilityGroupIds?: string[];
};

export type UpdateInventoryItemDetailsInput = {
  name: string;
  category?: string;
  sku?: string;
  description?: string;
  unitCost?: string;
  unitPrice: string;
  reorderLevel?: string;
  compatibilityGroupIds?: string[];
};

export type AddStockInput = {
  quantity: string;
  note?: string;
};

export type AdjustStockInput = {
  newQuantity: string;
  note?: string;
};

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function decimalOrZero(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return new Prisma.Decimal(0);
  }

  return new Prisma.Decimal(trimmed.replace(",", "."));
}

function decimalOrNull(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return new Prisma.Decimal(trimmed.replace(",", "."));
}

function integerOrZero(value?: string) {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listInventoryItems(
  shopId: string,
  filters: InventoryItemFilters = {},
) {
  const search = filters.search?.trim();

  const items = await prisma.inventoryItem.findMany({
    where: {
      shopId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: { select: { compatibilityGroupLinks: true } },
    },
  });

  return filters.lowStockOnly
    ? items.filter((item) => item.quantity <= item.reorderLevel)
    : items;
}

export async function getInventoryItemById(
  shopId: string,
  inventoryItemId: string,
) {
  return prisma.inventoryItem.findFirst({
    where: {
      id: inventoryItemId,
      shopId,
      deletedAt: null,
    },
    include: {
      compatibilityGroupLinks: {
        include: {
          candidateGroup: {
            include: {
              batch: { select: { categoryName: true } },
              members: {
                orderBy: { position: "asc" },
                select: { id: true, rawModelName: true },
              },
            },
          },
        },
      },
    },
  });
}

function uniqueGroupIds(ids?: string[]) {
  return [...new Set((ids || []).filter(Boolean))];
}

async function validateCompatibilityGroups(
  tx: Prisma.TransactionClient,
  ids?: string[],
) {
  const groupIds = uniqueGroupIds(ids);
  if (groupIds.length === 0) return groupIds;

  const validGroups = await tx.compatibilityCandidateGroup.count({
    where: {
      id: { in: groupIds },
      status: {
        in: [
          CompatibilityCandidateStatus.READY_FOR_CORROBORATION,
          CompatibilityCandidateStatus.APPROVED,
        ],
      },
      batch: {
        status: {
          in: [CompatibilityImportStatus.READY_FOR_REVIEW, CompatibilityImportStatus.IMPORTED],
        },
      },
    },
  });

  if (validGroups !== groupIds.length) {
    throw new Error("مجموعة التوافق المحددة غير متاحة أو لم تعد صالحة.");
  }

  return groupIds;
}

export async function getInventoryMovements(
  shopId: string,
  inventoryItemId: string,
) {
  return prisma.inventoryMovement.findMany({
    where: {
      shopId,
      inventoryItemId,
      deletedAt: null,
    },
    include: {
      repairOrder: {
        select: {
          id: true,
          ticketNumber: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
  });
}

export async function createInventoryItem(
  shopId: string,
  createdByUserId: string | null,
  input: CreateInventoryItemInput,
) {
  const initialQuantity = integerOrZero(input.quantity);

  return prisma.$transaction(async (tx) => {
    const compatibilityGroupIds = await validateCompatibilityGroups(
      tx,
      input.compatibilityGroupIds,
    );
    const item = await tx.inventoryItem.create({
      data: {
        shopId,
        name: input.name.trim(),
        category: emptyToNull(input.category),
        sku: emptyToNull(input.sku),
        description: emptyToNull(input.description),
        unitCost: decimalOrNull(input.unitCost),
        unitPrice: decimalOrZero(input.unitPrice),
        quantity: initialQuantity,
        reorderLevel: integerOrZero(input.reorderLevel),
      },
    });

    if (compatibilityGroupIds.length > 0) {
      await tx.inventoryCompatibilityGroup.createMany({
        data: compatibilityGroupIds.map((candidateGroupId) => ({
          inventoryItemId: item.id,
          candidateGroupId,
        })),
      });
    }

    if (initialQuantity > 0) {
      await tx.inventoryMovement.create({
        data: {
          shopId,
          inventoryItemId: item.id,
          createdByUserId,
          type: InventoryMovementType.STOCK_IN,
          quantityChange: initialQuantity,
          quantityAfter: initialQuantity,
          unitCostSnapshot: item.unitCost,
          note: "رصيد افتتاحي",
        },
      });
    }

    return item;
  });
}

export async function updateInventoryItemDetails(
  shopId: string,
  inventoryItemId: string,
  input: UpdateInventoryItemDetailsInput,
) {
  const existing = await getInventoryItemById(shopId, inventoryItemId);

  if (!existing) {
    throw new Error("قطعة المخزون غير موجودة.");
  }

  return prisma.$transaction(async (tx) => {
    const compatibilityGroupIds = await validateCompatibilityGroups(
      tx,
      input.compatibilityGroupIds,
    );

    const item = await tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        name: input.name.trim(),
        category: emptyToNull(input.category),
        sku: emptyToNull(input.sku),
        description: emptyToNull(input.description),
        unitCost: decimalOrNull(input.unitCost),
        unitPrice: decimalOrZero(input.unitPrice),
        reorderLevel: integerOrZero(input.reorderLevel),
        version: { increment: 1 },
      },
    });

    await tx.inventoryCompatibilityGroup.deleteMany({
      where: { inventoryItemId },
    });
    if (compatibilityGroupIds.length > 0) {
      await tx.inventoryCompatibilityGroup.createMany({
        data: compatibilityGroupIds.map((candidateGroupId) => ({
          inventoryItemId,
          candidateGroupId,
        })),
      });
    }

    return item;
  });
}

export async function addStock(
  shopId: string,
  inventoryItemId: string,
  createdByUserId: string | null,
  input: AddStockInput,
) {
  const quantityToAdd = integerOrZero(input.quantity);

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: inventoryItemId,
      shopId,
      deletedAt: null,
    },
  });

  if (!item) {
    throw new Error("قطعة المخزون غير موجودة.");
  }

  const quantityAfter = item.quantity + quantityToAdd;

  const [updatedItem] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: {
        id: inventoryItemId,
      },
      data: {
        quantity: quantityAfter,
        version: {
          increment: 1,
        },
      },
    }),
    prisma.inventoryMovement.create({
      data: {
        shopId,
        inventoryItemId,
        createdByUserId,
        type: InventoryMovementType.STOCK_IN,
        quantityChange: quantityToAdd,
        quantityAfter,
        unitCostSnapshot: item.unitCost,
        note: emptyToNull(input.note),
      },
    }),
  ]);

  return updatedItem;
}

export async function adjustStock(
  shopId: string,
  inventoryItemId: string,
  createdByUserId: string | null,
  input: AdjustStockInput,
) {
  const newQuantity = integerOrZero(input.newQuantity);

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: inventoryItemId,
      shopId,
      deletedAt: null,
    },
  });

  if (!item) {
    throw new Error("قطعة المخزون غير موجودة.");
  }

  const quantityChange = newQuantity - item.quantity;

  if (quantityChange === 0) {
    return item;
  }

  const [updatedItem] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: {
        id: inventoryItemId,
      },
      data: {
        quantity: newQuantity,
        version: {
          increment: 1,
        },
      },
    }),
    prisma.inventoryMovement.create({
      data: {
        shopId,
        inventoryItemId,
        createdByUserId,
        type: InventoryMovementType.ADJUSTMENT,
        quantityChange,
        quantityAfter: newQuantity,
        unitCostSnapshot: item.unitCost,
        note: emptyToNull(input.note),
      },
    }),
  ]);

  return updatedItem;
}

export async function softDeleteInventoryItem(shopId: string, inventoryItemId: string) {
  const result = await prisma.inventoryItem.updateMany({
    where: { id: inventoryItemId, shopId, deletedAt: null },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });
  if (result.count === 0) throw new Error("قطعة المخزون غير موجودة أو محذوفة مسبقاً.");
}

export const inventoryService = {
  listInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItemDetails,
  addStock,
  adjustStock,
  softDeleteInventoryItem,
  getInventoryMovements,
};
