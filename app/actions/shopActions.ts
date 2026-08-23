"use server";

import { getCurrentShopContext } from "@/lib/current-shop";
import { shopService, type UpdateShopInput } from "@/lib/services/shopService";
import { revalidatePath } from "next/cache";

export async function updateShopSettingsAction(formData: FormData): Promise<void> {
  const { shopId } = await getCurrentShopContext();

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

  await shopService.updateShop(shopId, input);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
