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
    try {
      // Refresh shop and user state from database
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
    } catch {
      // If DB read fails momentarily, fallback to valid signed JWT session payload
      return {
        shopId: session.shopId,
        userId: session.userId,
        shopName: session.shopName || "متجري",
        currency: session.currency || "SAR",
        userName: session.name || "المدير",
        email: session.email || "",
        role: session.role || "OWNER",
      };
    }
  }

  // If unauthenticated and redirect is allowed, go to login
  if (options.allowRedirect !== false) {
    redirect("/login");
  }

  // Fallback for non-redirect callers
  return {
    shopId: "",
    userId: null,
    shopName: "متجر غير مسجل",
    currency: "SAR",
    userName: "زائر",
    email: "",
    role: "STAFF",
  };
}
