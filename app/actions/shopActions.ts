"use server";

import { getCurrentShopContext } from "@/lib/current-shop";
import { shopService, type UpdateShopInput } from "@/lib/services/shopService";
import { getSession, setSessionCookie } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateShopSettingsAction(formData: FormData): Promise<void> {
  const context = await getCurrentShopContext();
  const shopId = context.shopId;

  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || "";
  const currency = (formData.get("currency") as string) || "SAR";
  const address = (formData.get("address") as string) || "";
  const taxNumber = (formData.get("taxNumber") as string) || "";
  const taxRate = parseFloat((formData.get("taxRate") as string) || "15");
  const terms = (formData.get("terms") as string) || "";

  const input: UpdateShopInput = {
    name,
    phone,
    currency,
    address,
    taxNumber,
    taxRate: isNaN(taxRate) ? 15 : taxRate,
    terms,
  };

  const updatedShop = await shopService.updateShop(shopId, input);

  // Update session cookie with new currency and shop name
  const session = await getSession();
  if (session) {
    await setSessionCookie({
      ...session,
      shopName: updatedShop.name,
      currency: updatedShop.currency || "SAR",
    });
  }

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/repair-orders");
  revalidatePath("/invoices");
  revalidatePath("/sales");
  revalidatePath("/inventory");
}
