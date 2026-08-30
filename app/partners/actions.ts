"use server";

import { SubscriptionBillingInterval } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { partnerPortalAuthService } from "@/lib/services/partnerPortalAuthService";
import { partnerPortalService } from "@/lib/services/partnerPortalService";

export async function partnerLoginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    await partnerPortalAuthService.loginPartnerPortal({ email, password });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر تسجيل الدخول.",
    };
  }

  redirect("/partners");
}

export async function partnerLogoutAction() {
  await partnerPortalAuthService.logoutPartnerPortal();
  redirect("/partners/login");
}

export async function partnerRequestActivationAction(formData: FormData) {
  const shopId = String(formData.get("shopId") || "").trim();
  const rawInterval = String(formData.get("billingInterval") || "");

  if (!/^[0-9a-f-]{36}$/i.test(shopId)) {
    return { success: false, error: "المتجر المحدد غير صالح." };
  }

  if (
    rawInterval !== SubscriptionBillingInterval.SIX_MONTHS &&
    rawInterval !== SubscriptionBillingInterval.ANNUAL
  ) {
    return { success: false, error: "مدة الاشتراك غير صالحة." };
  }

  try {
    await partnerPortalService.requestActivationFromPartnerPortal({
      shopId,
      billingInterval: rawInterval,
    });
    revalidatePath("/partners");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر إرسال طلب التفعيل.",
    };
  }
}
