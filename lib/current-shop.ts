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

export async function getCurrentShopContext(
  options: { allowRedirect?: boolean } = { allowRedirect: true }
): Promise<CurrentShopContext> {
  const session = await getSession();

  if (session && session.shopId) {
    return {
      shopId: session.shopId,
      userId: session.userId || null,
      shopName: session.shopName || "متجري",
      currency: session.currency || "SAR",
      userName: session.name || "المدير",
      email: session.email || "",
      role: session.role || "OWNER",
    };
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
