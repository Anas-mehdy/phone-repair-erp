"use server";

import { authService, type RegisterInput, type LoginInput } from "@/lib/services/authService";
import { combineCountryDialWithPhone } from "@/lib/countries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const shopName = formData.get("shopName") as string;
  const rawPhone = (formData.get("phone") as string) || "";
  const dialCode = (formData.get("dialCode") as string) || "+966";
  const phone = rawPhone ? combineCountryDialWithPhone(dialCode, rawPhone) : "";
  const currency = (formData.get("currency") as string) || "SAR";
  const address = (formData.get("address") as string) || "";

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
