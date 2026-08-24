"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { adminService } from "@/lib/services/adminService";
import { setSessionCookie } from "@/lib/auth";

const resetPasswordSchema = z.object({
  userId: z.string().uuid("معرف المستخدم غير صحيح"),
  newPassword: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

export async function adminResetPasswordAction(formData: FormData) {
  await requireSuperAdmin();

  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;

  try {
    const parsed = resetPasswordSchema.parse({ userId, newPassword });
    const updatedUser = await adminService.resetUserPassword(parsed.userId, parsed.newPassword);
    
    revalidatePath("/admin");
    return {
      success: true,
      message: `تم تحديث كلمة مرور ${updatedUser.name} (${updatedUser.email}) بنجاح إلى "${parsed.newPassword}"`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "فشل إعادة تعيين كلمة المرور";
    return {
      success: false,
      error: message,
    };
  }
}

export async function adminToggleShopAction(formData: FormData) {
  await requireSuperAdmin();

  const shopId = formData.get("shopId") as string;
  const suspend = formData.get("suspend") === "true";

  if (!shopId) return;

  await adminService.toggleShopStatus(shopId, suspend);
  revalidatePath("/admin");
}

export async function adminImpersonateShopAction(formData: FormData) {
  await requireSuperAdmin();

  const shopId = formData.get("shopId") as string;
  if (!shopId) return;

  const ownerPayload = await adminService.getShopOwnerForImpersonation(shopId);
  await setSessionCookie(ownerPayload);

  redirect("/dashboard");
}
