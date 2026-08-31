import { prisma } from "@/lib/prisma";

export async function searchCustomersForSale(shopId: string, query: string, limit = 20) {
  const search = query.trim();
  if (!search) return [];

  return prisma.customer.findMany({
    where: {
      shopId,
      deletedAt: null,
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { phoneNormalized: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  });
}

export const salesCustomerSearchService = {
  searchCustomersForSale,
};
