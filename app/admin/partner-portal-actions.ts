"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { partnerAdminService } from "@/lib/services/partnerAdminService";
import { partnerPortalAuthService } from "@/lib/services/partnerPortalAuthService";

function resultError(error: unknown, fallback: string) {
  return { success: false, error: error instanceof Error ? error.message : fallback };
}

export async function adminCreatePartnerAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    const partner = await partnerAdminService.createPartner({
      code: String(formData.get("code") || ""),
      type: String(formData.get("type") || "AGENT") as "AGENT" | "DISTRIBUTOR",
      name: String(formData.get("name") || ""),
      contactName: String(formData.get("contactName") || ""),
      phone: String(formData.get("phone") || ""),
      email: String(formData.get("email") || ""),
      countryCode: String(formData.get("countryCode") || ""),
      discountPercent: Number(formData.get("discountPercent") || 0),
      notes: String(formData.get("notes") || ""),
    });
    revalidatePath("/admin");
    return { success: true, partnerId: partner.id };
  } catch (error) {
    return resultError(error, "تعذر إنشاء الوكيل.");
  }
}

export async function adminUpsertPartnerPortalCredentialsAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    await partnerPortalAuthService.upsertPartnerPortalCredentials({
      partnerId: String(formData.get("partnerId") || ""),
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
    });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return resultError(error, "تعذر حفظ بيانات دخول الوكيل.");
  }
}

export async function adminAssignShopPartnerAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    await partnerAdminService.assignShopToPartner(
      String(formData.get("shopId") || ""),
      String(formData.get("partnerId") || ""),
    );
    revalidatePath("/admin");
    revalidatePath("/subscription");
    return { success: true };
  } catch (error) {
    return resultError(error, "تعذر ربط المتجر بالوكيل.");
  }
}

export async function adminRemoveShopPartnerAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    await partnerAdminService.removeShopPartner(String(formData.get("shopId") || ""));
    revalidatePath("/admin");
    revalidatePath("/subscription");
    return { success: true };
  } catch (error) {
    return resultError(error, "تعذر فك ارتباط المتجر بالوكيل.");
  }
}

export async function adminSetPartnerStatusAction(formData: FormData) {
  await requireSuperAdmin();
  try {
    const status = String(formData.get("status") || "") as "ACTIVE" | "SUSPENDED";
    await partnerAdminService.setPartnerStatus(String(formData.get("partnerId") || ""), status);
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return resultError(error, "تعذر تحديث حالة الوكيل.");
  }
}
