"use server";

import { authService, type RegisterInput, type LoginInput } from "@/lib/services/authService";
import { validatePhoneForCountry } from "@/lib/countries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function registerAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim() || "";
  const email = (formData.get("email") as string)?.trim() || "";
  const password = (formData.get("password") as string) || "";
  const shopName = (formData.get("shopName") as string)?.trim() || "";
  const rawPhone = (formData.get("phone") as string)?.trim() || "";
  const dialCode = (formData.get("dialCode") as string) || "+966";
  const currency = (formData.get("currency") as string) || "SAR";
  const address = (formData.get("address") as string)?.trim() || "";

  if (!name || name.length < 2) {
    return { success: false, error: "الاسم الكامل مطلوب ويجب ألا يقل عن حرفين" };
  }

  if (!email || !email.includes("@")) {
    return { success: false, error: "البريد الإلكتروني مطلوب وغير صحيح" };
  }

  if (!password || password.length < 6) {
    return { success: false, error: "كلمة المرور مطلوبة ويجب ألا تقل عن 6 أحرف" };
  }

  if (!shopName || shopName.length < 2) {
    return { success: false, error: "اسم المتجر أو الورشة مطلوب ويجب ألا يقل عن حرفين" };
  }

  if (!rawPhone) {
    return { success: false, error: "رقم هاتف المتجر / الواتساب مطلوب لإنشاء الحساب" };
  }

  const phoneValidation = validatePhoneForCountry(dialCode, rawPhone);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      error: phoneValidation.error || "رقم الهاتف غير صحيح للدولة المحددة",
    };
  }

  const phone = phoneValidation.formattedInternational;

  try {
    const input: RegisterInput = {
      name,
      email,
      password,
      shopName,
      phone,
      currency,
      address,
    };

    await authService.registerShop(input);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الحساب",
    };
  }

  revalidatePath("/");
  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const input: LoginInput = {
      email,
      password,
    };

    await authService.loginUser(input);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول",
    };
  }

  revalidatePath("/");
  redirect("/dashboard");
}

export async function logoutAction() {
  await authService.logout();
  revalidatePath("/");
  redirect("/login");
}
