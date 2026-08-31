import { prisma } from "@/lib/prisma";

type InventoryCategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: bigint | number;
};

function normalizeCategoryName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function validateCategoryName(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("اسم التصنيف مطلوب.");
  if (trimmedName.length > 120) throw new Error("اسم التصنيف طويل جداً.");
  return trimmedName;
}

export async function listInventoryCategories(shopId: string) {
  const rows = await prisma.$queryRaw<InventoryCategoryRow[]>`
    SELECT
      c."id",
      c."name",
      c."sortOrder",
      COUNT(i."id")::bigint AS "itemCount"
    FROM "InventoryCategory" c
    LEFT JOIN "InventoryItem" i
      ON i."categoryId" = c."id"
      AND i."shopId" = ${shopId}::uuid
      AND i."deletedAt" IS NULL
    WHERE c."shopId" = ${shopId}::uuid
      AND c."deletedAt" IS NULL
    GROUP BY c."id", c."name", c."sortOrder"
    ORDER BY c."sortOrder" ASC, c."name" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    itemCount: Number(row.itemCount),
  }));
}

export async function getInventoryCategoryOverview(shopId: string) {
  const [categories, counts] = await Promise.all([
    listInventoryCategories(shopId),
    prisma.$queryRaw<Array<{ totalCount: bigint | number; uncategorizedCount: bigint | number }>>`
      SELECT
        COUNT(*)::bigint AS "totalCount",
        COUNT(*) FILTER (WHERE "categoryId" IS NULL)::bigint AS "uncategorizedCount"
      FROM "InventoryItem"
      WHERE "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
    `,
  ]);

  return {
    categories,
    totalCount: Number(counts[0]?.totalCount ?? 0),
    uncategorizedCount: Number(counts[0]?.uncategorizedCount ?? 0),
  };
}

export async function createInventoryCategory(shopId: string, name: string) {
  const trimmedName = validateCategoryName(name);
  const normalizedName = normalizeCategoryName(trimmedName);
  const existing = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT "id", "name"
    FROM "InventoryCategory"
    WHERE "shopId" = ${shopId}::uuid
      AND "deletedAt" IS NULL
      AND "normalizedName" = ${normalizedName}
    LIMIT 1
  `;

  if (existing[0]) return existing[0];

  const created = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    INSERT INTO "InventoryCategory" ("shopId", "name", "normalizedName")
    VALUES (${shopId}::uuid, ${trimmedName}, ${normalizedName})
    RETURNING "id", "name"
  `;

  return created[0];
}

export async function renameInventoryCategory(shopId: string, categoryId: string, name: string) {
  const trimmedName = validateCategoryName(name);
  const normalizedName = normalizeCategoryName(trimmedName);

  return prisma.$transaction(async (tx) => {
    const categoryRows = await tx.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT "id", "name"
      FROM "InventoryCategory"
      WHERE "id" = ${categoryId}::uuid
        AND "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
      LIMIT 1
      FOR UPDATE
    `;

    if (!categoryRows[0]) throw new Error("التصنيف غير موجود أو تم حذفه.");

    const duplicateRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "InventoryCategory"
      WHERE "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
        AND "normalizedName" = ${normalizedName}
        AND "id" <> ${categoryId}::uuid
      LIMIT 1
    `;

    if (duplicateRows[0]) throw new Error("يوجد تصنيف آخر بنفس الاسم.");

    await tx.$executeRaw`
      UPDATE "InventoryCategory"
      SET
        "name" = ${trimmedName},
        "normalizedName" = ${normalizedName},
        "updatedAt" = NOW()
      WHERE "id" = ${categoryId}::uuid
        AND "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
    `;

    // Keep the legacy category text synchronized for all active items.
    await tx.$executeRaw`
      UPDATE "InventoryItem"
      SET
        "category" = ${trimmedName},
        "updatedAt" = NOW()
      WHERE "shopId" = ${shopId}::uuid
        AND "categoryId" = ${categoryId}::uuid
        AND "deletedAt" IS NULL
    `;

    return { id: categoryId, name: trimmedName };
  });
}

export async function deleteInventoryCategory(shopId: string, categoryId: string) {
  return prisma.$transaction(async (tx) => {
    const categoryRows = await tx.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT "id", "name"
      FROM "InventoryCategory"
      WHERE "id" = ${categoryId}::uuid
        AND "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
      LIMIT 1
      FOR UPDATE
    `;

    const category = categoryRows[0];
    if (!category) throw new Error("التصنيف غير موجود أو تم حذفه.");

    const itemRows = await tx.$queryRaw<Array<{ itemCount: bigint | number }>>`
      SELECT COUNT(*)::bigint AS "itemCount"
      FROM "InventoryItem"
      WHERE "shopId" = ${shopId}::uuid
        AND "categoryId" = ${categoryId}::uuid
        AND "deletedAt" IS NULL
    `;

    const itemCount = Number(itemRows[0]?.itemCount ?? 0);
    if (itemCount > 0) {
      throw new Error(`لا يمكن حذف التصنيف قبل إفراغه. يوجد ${itemCount} منتج مرتبط به حالياً.`);
    }

    await tx.$executeRaw`
      UPDATE "InventoryCategory"
      SET "deletedAt" = NOW(), "updatedAt" = NOW()
      WHERE "id" = ${categoryId}::uuid
        AND "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
    `;

    return category;
  });
}

export async function resolveInventoryCategory(
  shopId: string,
  input: { categoryId?: string; newCategoryName?: string },
) {
  const newName = input.newCategoryName?.trim();
  if (newName) return createInventoryCategory(shopId, newName);

  const categoryId = input.categoryId?.trim();
  if (!categoryId) return null;

  const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT "id", "name"
    FROM "InventoryCategory"
    WHERE "id" = ${categoryId}::uuid
      AND "shopId" = ${shopId}::uuid
      AND "deletedAt" IS NULL
    LIMIT 1
  `;

  if (!rows[0]) throw new Error("التصنيف المحدد غير موجود.");
  return rows[0];
}

export async function listInventoryItemIdsForCategory(
  shopId: string,
  categoryId?: string,
  uncategorizedOnly = false,
) {
  if (uncategorizedOnly) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "InventoryItem"
      WHERE "shopId" = ${shopId}::uuid
        AND "deletedAt" IS NULL
        AND "categoryId" IS NULL
    `;
    return rows.map((row) => row.id);
  }

  if (!categoryId) return null;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT i."id"
    FROM "InventoryItem" i
    INNER JOIN "InventoryCategory" c ON c."id" = i."categoryId"
    WHERE i."shopId" = ${shopId}::uuid
      AND i."deletedAt" IS NULL
      AND c."shopId" = ${shopId}::uuid
      AND c."deletedAt" IS NULL
      AND c."id" = ${categoryId}::uuid
  `;
  return rows.map((row) => row.id);
}

export const inventoryCategoryService = {
  listInventoryCategories,
  getInventoryCategoryOverview,
  createInventoryCategory,
  renameInventoryCategory,
  deleteInventoryCategory,
  resolveInventoryCategory,
  listInventoryItemIdsForCategory,
};
