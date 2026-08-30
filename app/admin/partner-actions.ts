"use server";

import { SubscriptionBillingInterval } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { partnerActivationRequestService } from "@/lib/services/partnerActivationRequestService";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} طويل جداً`).optional().or(z.literal(""));

const createRequestSchema = z.object({
  partnerId: z.string().uuid("معرف الوكيل غير صالح"),
  shopId: z.string().uuid("معرف المتجر غير صالح"),
  billingInterval: z.nativeEnum(SubscriptionBillingInterval),
  adminNotes: optionalText(2000, "الملاحظة الإدارية"),
});

const decideRequestSchema = z.object({
  requestId: z.string().uuid("معرف الطلب غير صالح"),
  paymentReference: optionalText(200, "مرجع الدفع"),
  paymentMethod: optionalText(50, "وسيلة الدفع"),
  adminNotes: optionalText(2000, "الملاحظة الإدارية"),
  extraDays: z.coerce.number().int().min(0).max(3660).default(0),
});

const rejectRequestSchema = z.object({
  requestId: z.string().uuid("معرف الطلب غير صالح"),
  adminNotes: optionalText(2000, "الملاحظة الإدارية"),
});

function actionError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function revalidatePartnerAdmin(shopId?: string) {
  revalidatePath("/admin");
  if (shopId) revalidatePath("/subscription");
}

export async function adminCreatePartnerActivationRequestAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = createRequestSchema.parse({
      partnerId: formData.get("partnerId"),
      shopId: formData.get("shopId"),
      billingInterval: formData.get("billingInterval"),
      adminNotes: formData.get("adminNotes") || "",
    });

    const request = await partnerActivationRequestService.createPartnerActivationRequest({
      partnerId: parsed.partnerId,
      shopId: parsed.shopId,
      billingInterval: parsed.billingInterval,
      adminNotes: parsed.adminNotes || null,
    });

    revalidatePartnerAdmin(parsed.shopId);
    return { success: true, request };
  } catch (error) {
    return { success: false, error: actionError(error, "تعذر إنشاء طلب التفعيل.") };
  }
}

export async function adminApprovePartnerActivationRequestAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = decideRequestSchema.parse({
      requestId: formData.get("requestId"),
      paymentReference: formData.get("paymentReference") || "",
      paymentMethod: formData.get("paymentMethod") || "",
      adminNotes: formData.get("adminNotes") || "",
      extraDays: formData.get("extraDays") || 0,
    });

    const request = await partnerActivationRequestService.approvePartnerActivationRequest({
      requestId: parsed.requestId,
      paymentReference: parsed.paymentReference || null,
      paymentMethod: parsed.paymentMethod || null,
      adminNotes: parsed.adminNotes || null,
      extraDays: parsed.extraDays,
    });

    revalidatePartnerAdmin(request.shopId);
    return { success: true, request };
  } catch (error) {
    return { success: false, error: actionError(error, "تعذر اعتماد طلب التفعيل.") };
  }
}

export async function adminRejectPartnerActivationRequestAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = rejectRequestSchema.parse({
      requestId: formData.get("requestId"),
      adminNotes: formData.get("adminNotes") || "",
    });

    const request = await partnerActivationRequestService.rejectPartnerActivationRequest(
      parsed.requestId,
      parsed.adminNotes || null,
    );

    revalidatePartnerAdmin(request.shopId);
    return { success: true, request };
  } catch (error) {
    return { success: false, error: actionError(error, "تعذر رفض طلب التفعيل.") };
  }
}

export async function adminCancelPartnerActivationRequestAction(formData: FormData) {
  await requireSuperAdmin();

  try {
    const parsed = rejectRequestSchema.parse({
      requestId: formData.get("requestId"),
      adminNotes: formData.get("adminNotes") || "",
    });

    const request = await partnerActivationRequestService.cancelPartnerActivationRequest(
      parsed.requestId,
      parsed.adminNotes || null,
    );

    revalidatePartnerAdmin(request.shopId);
    return { success: true, request };
  } catch (error) {
    return { success: false, error: actionError(error, "تعذر إلغاء طلب التفعيل.") };
  }
}
