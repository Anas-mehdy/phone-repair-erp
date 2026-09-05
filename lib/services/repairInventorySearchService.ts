import { prisma } from "@/lib/prisma";

export type RepairInventorySearchResult = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unitPrice: string;
  unitCost: string | null;
};

export async function searchInventoryForRepair(
  shopId: string,
  rawQuery: string,
  limit = 20,
): Promise<RepairInventorySearchResult[]> {
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
      unitPrice: true,
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
    unitPrice: item.unitPrice.toString(),
    unitCost: item.unitCost ? item.unitCost.toString() : null,
  }));
}

export const repairInventorySearchService = { searchInventoryForRepair };
