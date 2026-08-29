"use server";

import {
  Prisma,
  SubscriptionBillingInterval,
  SubscriptionPlan,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { adminService } from "@/lib/services/adminService";
import { subscriptionAdminService } from "@/lib/services/subscriptionAdminService";
import { setSessionCookie } from "@/lib/auth";

const resetPasswordSchema = z.object({
  userId: z.string().uuid("معرف المستخدم غير صحيح"),
  newPassword: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

const shopIdSchema = z.object({
  shopId: z.string().uuid("معرف المتجر غير صالح"),
});

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} طويل جداً`).optional().or(z.literal(""));

const activateSubscriptionSchema = shopIdSchema.extend({
  plan: z.nativeEnum(SubscriptionPlan),
  billingInterval: z.nativeEnum(SubscriptionBillingInterval),
  extraDays: z.coerce.number().int().min(0).max(3660).default(0),
  adminNotes: optionalText(2000, "الملاحظة الإدارية"),
  paymentReference: optionalText(200, "مرجع الدفع"),
  paymentMethod: optionalText(50, "وسيلة الدفع"),
});

const gracePeriodSchema = shopIdSchema.extend({
  days: z.coerce.number().int().min(1).max(90).default(3),
});

const extraDaysSchema = shopIdSchema.extend({
  extraDays: z.coerce.number().int().min(1).max(3660),
});

function actionError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function revalidateSubscriptionAdmin(shopId?: string) {
  revalidatePath("/admin");
  if (shopId) {
    revalidatePath("/subscription");
  }
}

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
    return {
      success: false,
      error: actionError(error, "فشل إعادة تعيين كلمة المرور"),
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

export async function adminActivateSubscriptionAction(formData: FormData) {
  // Defense in depth: Action AND service both require Super Admin.
  await requireSuperAdmin();

  try {
    const parsed = activateSubscriptionSchema.parse({
      shopId: formData.get("shopId"),
      plan: formData.get("plan"),
      billingInterval: formData.get("billingInterval"),
      extraDays: formData.get("extraDays") || 0,
      adminNotes: formData.get("adminNotes") || "",
      paymentReference: formData.get("paymentReference") || "",
      paymentMethod: formData.get("paymentMethod") || "",
    });

    const subscription = await subscriptionAdminService.activateSubscription({
      shopId: parsed.shopId,
      plan: parsed.plan,
      billingInterval: parsed.billingInterval,
      extraDays: parsed.extraDays,
      adminNotes: parsed.adminNotes || null,
      paymentReference: parsed.paymentReference || null,
      paymentMethod: parsed.paymentMethod || null,
    });
    revalidateSubscriptionAdmin(parsed.shopId);
    return { success: true, subscription };
  } catch (error) {
    return {
      success: false,
      error: actionError(error, "تعذر تفعيل الاشتراك."),
    };
  }
}

export async function adminStartGracePeriodAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = gracePeriodSchema.parse({
      shopId: formData.get("shopId"),
      days: formData.get("days") || 3,
    });

    const subscription = await subscriptionAdminService.startGracePeriod(
      parsed.shopId,
      parsed.days,
    );
    revalidateSubscriptionAdmin(parsed.shopId);
    return { success: true, subscription };
  } catch (error) {
    return {
      success: false,
      error: actionError(error, "تعذر بدء مهلة التجديد."),
    };
  }
}

export async function adminMarkSubscriptionExpiredAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = shopIdSchema.parse({ shopId: formData.get("shopId") });
    const subscription = await subscriptionAdminService.markSubscriptionExpired(parsed.shopId);
    revalidateSubscriptionAdmin(parsed.shopId);
    return { success: true, subscription };
  } catch (error) {
    return {
      success: false,
      error: actionError(error, "تعذر إنهاء الاشتراك."),
    };
  }
}

export async function adminCancelSubscriptionAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = shopIdSchema.parse({ shopId: formData.get("shopId") });
    const subscription = await subscriptionAdminService.cancelSubscription(parsed.shopId);
    revalidateSubscriptionAdmin(parsed.shopId);
    return { success: true, subscription };
  } catch (error) {
    return {
      success: false,
      error: actionError(error, "تعذر إلغاء الاشتراك."),
    };
  }
}

export async function adminGrantExtraDaysAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = extraDaysSchema.parse({
      shopId: formData.get("shopId"),
      extraDays: formData.get("extraDays"),
    });
    const subscription = await subscriptionAdminService.grantExtraDays(
      parsed.shopId,
      parsed.extraDays,
    );
    revalidateSubscriptionAdmin(parsed.shopId);
    return { success: true, subscription };
  } catch (error) {
    return {
      success: false,
      error: actionError(error, "تعذر إضافة الأيام."),
    };
  }
}

const updatePriceSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "رمز الدولة يجب أن يتكون من حرفين كبيرين"),
  plan: z.nativeEnum(SubscriptionPlan),
  billingInterval: z.nativeEnum(SubscriptionBillingInterval),
  amount: z.coerce.number().positive("المبلغ يجب أن يكون رقماً موجباً أكبر من صفر"),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "رمز العملة يجب أن يتكون من 3 أحرف"),
});

export async function adminUpdateSubscriptionPriceAction(formData: FormData) {
  // Defense in depth: Super Admin only
  await requireSuperAdmin();

  try {
    const parsed = updatePriceSchema.parse({
      countryCode: formData.get("countryCode"),
      plan: formData.get("plan"),
      billingInterval: formData.get("billingInterval"),
      amount: formData.get("amount"),
      currencyCode: formData.get("currencyCode"),
    });

    const updatedPrice = await prisma.subscriptionPrice.update({
      where: {
        countryCode_plan_billingInterval: {
          countryCode: parsed.countryCode,
          plan: parsed.plan,
          billingInterval: parsed.billingInterval,
        },
      },
      data: {
        amount: parsed.amount,
        currencyCode: parsed.currencyCode,
      },
    });

    revalidateSubscriptionAdmin();
    return {
      success: true,
      price: {
        ...updatedPrice,
        amount: Number(updatedPrice.amount),
      },
    };
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return {
        success: false,
        error: "السعر المطلوب غير موجود في النظام ولا يمكن تعديله.",
      };
    }
    return {
      success: false,
      error: actionError(error, "تعذر تعديل السعر."),
    };
  }
}
