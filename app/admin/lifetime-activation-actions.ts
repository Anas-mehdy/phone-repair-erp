"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { lifetimeSubscriptionService } from "@/lib/services/lifetimeSubscriptionService";

const schema = z.object({
  shopId: z.string().uuid("معرف المتجر غير صحيح"),
  paymentMethod: z.string().trim().max(50).optional(),
  paymentReference: z.string().trim().max(200).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

export async function adminActivateLifetimeSubscriptionAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    const input = schema.parse({
      shopId: formData.get("shopId"),
      paymentMethod: formData.get("paymentMethod") || "",
      paymentReference: formData.get("paymentReference") || "",
      adminNotes: formData.get("adminNotes") || "",
    });
    const lifetime = await lifetimeSubscriptionService.activateLifetimeSubscription(input);
    revalidatePath("/admin");
    revalidatePath("/subscription");
    revalidatePath("/dashboard");
    return { success: true, lifetime };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر تفعيل اشتراك مدى الحياة.",
    };
  }
}
