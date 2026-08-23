import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export interface CurrentShopContext {
  shopId: string;
  userId: string | null;
  shopName: string;
  currency: string;
  userName: string;
  email: string;
  role: string;
}

export async function getCurrentShopContext(options: { allowRedirect?: boolean } = { allowRedirect: true }): Promise<CurrentShopContext> {
  const session = await getSession();

  if (session) {
    // Verify shop and user are still active in database
    const user = await prisma.user.findUnique({
      where: { id: session.userId, deletedAt: null },
      include: { shop: true },
    });

    if (user && user.shop && user.shop.deletedAt === null) {
      return {
        shopId: user.shop.id,
        userId: user.id,
        shopName: user.shop.name,
        currency: user.shop.currency || "SAR",
        userName: user.name,
        email: user.email,
        role: user.role,
      };
    }
  }

  // If no valid session and allowRedirect is true, redirect to login
  if (options.allowRedirect !== false) {
    redirect("/login");
  }

  // Fallback for seed or initial migration scripts if needed
  const fallbackShop = await prisma.shop.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      users: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!fallbackShop) {
    redirect("/register");
  }

  return {
    shopId: fallbackShop.id,
    userId: fallbackShop.users[0]?.id ?? null,
    shopName: fallbackShop.name,
    currency: fallbackShop.currency || "SAR",
    userName: fallbackShop.users[0]?.name || "المدير",
    email: fallbackShop.users[0]?.email || "",
    role: fallbackShop.users[0]?.role || "OWNER",
  };
}
