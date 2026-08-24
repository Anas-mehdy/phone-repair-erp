import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export interface PlatformStats {
  totalShops: number;
  activeShops: number;
  totalUsers: number;
  totalRepairOrders: number;
  totalCustomers: number;
  totalInvoices: number;
  totalSuppliers: number;
  newShopsToday: number;
  newShopsThisWeek: number;
  currencyBreakdown: Array<{ currency: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
}

export const adminService = {
  /**
   * Aggregates global platform statistics across all tenants
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const [
      totalShops,
      activeShops,
      totalUsers,
      totalRepairOrders,
      totalCustomers,
      totalInvoices,
      totalSuppliers,
      newShopsToday,
      newShopsThisWeek,
      shopsByCurrency,
      ordersByStatus,
    ] = await Promise.all([
      prisma.shop.count(),
      prisma.shop.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.repairOrder.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.invoice.count({ where: { deletedAt: null } }),
      prisma.supplier.count({ where: { deletedAt: null } }),
      prisma.shop.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.shop.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.shop.groupBy({
        by: ["currency"],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.repairOrder.groupBy({
        by: ["status"],
        _count: { id: true },
        where: { deletedAt: null },
      }),
    ]);

    const currencyBreakdown = shopsByCurrency
      .map((item) => ({
        currency: item.currency || "SAR",
        count: item._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    const statusBreakdown = ordersByStatus.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));

    return {
      totalShops,
      activeShops,
      totalUsers,
      totalRepairOrders,
      totalCustomers,
      totalInvoices,
      totalSuppliers,
      newShopsToday,
      newShopsThisWeek,
      currencyBreakdown,
      statusBreakdown,
    };
  },

  /**
   * Lists all shops with their owner, ticket count, and customer metrics
   */
  async listAllShops(query?: string) {
    const trimmed = query?.trim().toLowerCase();

    const shops = await prisma.shop.findMany({
      where: trimmed
        ? {
            OR: [
              { name: { contains: trimmed, mode: "insensitive" } },
              { phone: { contains: trimmed, mode: "insensitive" } },
              { currency: { contains: trimmed, mode: "insensitive" } },
              {
                users: {
                  some: {
                    OR: [
                      { email: { contains: trimmed, mode: "insensitive" } },
                      { name: { contains: trimmed, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : undefined,
      include: {
        users: {
          where: { role: "OWNER", deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
          take: 1,
        },
        _count: {
          select: {
            repairOrders: { where: { deletedAt: null } },
            customers: { where: { deletedAt: null } },
            invoices: { where: { deletedAt: null } },
            suppliers: { where: { deletedAt: null } },
            inventoryItems: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return shops.map((shop) => {
      const owner = shop.users[0] || null;
      return {
        id: shop.id,
        name: shop.name,
        phone: shop.phone,
        address: shop.address,
        currency: shop.currency,
        createdAt: shop.createdAt,
        deletedAt: shop.deletedAt,
        isActive: shop.deletedAt === null,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
            }
          : null,
        counts: {
          repairOrders: shop._count.repairOrders,
          customers: shop._count.customers,
          invoices: shop._count.invoices,
          suppliers: shop._count.suppliers,
          inventoryItems: shop._count.inventoryItems,
        },
      };
    });
  },

  /**
   * Resets a user's password directly as Super Admin
   */
  async resetUserPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("كلمة المرور يجب ألا تقل عن 6 خانات");
    }

    const passwordHash = await hashPassword(newPassword);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
      include: {
        shop: true,
      },
    });

    return user;
  },

  /**
   * Toggles shop active/suspended status
   */
  async toggleShopStatus(shopId: string, suspend: boolean) {
    return prisma.shop.update({
      where: { id: shopId },
      data: {
        deletedAt: suspend ? new Date() : null,
      },
    });
  },

  /**
   * Retrieves shop owner session payload for Super Admin impersonation
   */
  async getShopOwnerForImpersonation(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        users: {
          where: { role: "OWNER", deletedAt: null },
          take: 1,
        },
      },
    });

    if (!shop || !shop.users[0]) {
      throw new Error("لم يتم العثور على مالك لهذا المتجر");
    }

    const owner = shop.users[0];

    return {
      userId: owner.id,
      shopId: shop.id,
      email: owner.email,
      name: owner.name,
      role: owner.role,
      shopName: shop.name,
      currency: shop.currency,
    };
  },
};
