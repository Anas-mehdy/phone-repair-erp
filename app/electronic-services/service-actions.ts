"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { electronicServiceTransactionService } from "@/lib/services/electronicServiceTransactionService";

const nonNegativeMoney = z.string().trim().min(1, "القيمة مطلوبة").refine((value) => {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number >= 0;
}, "القيمة المالية غير صحيحة");

const uuid = z.string().uuid("المعرف غير صالح");
const optionalUuid = z.string().trim().optional().refine((value) => !value || z.string().uuid().safeParse(value).success, "المعرف غير صالح");
const paymentDestination = z.enum(["DRAWER", "WALLET", "OTHER", "DEBT"]);

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "تحقق من البيانات.";
  return error instanceof Error ? error.message : "تعذر تنفيذ العملية. حاول مجدداً.";
}

function refreshElectronicServices() {
  revalidatePath("/electronic-services");
  revalidatePath("/electronic-services/new");
  revalidatePath("/electronic-services/templates");
  revalidatePath("/electronic-services/reconcile");
  revalidatePath("/electronic-services/reports");
  revalidatePath("/cash-drawer");
  revalidatePath("/transfers");
  revalidatePath("/debts");
  revalidatePath("/dashboard");
}

export async function createElectronicServiceTemplateAction(formData: FormData) {
  const auth = await requirePermission("electronic_services:manage");
  const parsed = z.object({
    providerId: uuid,
    name: z.string().trim().min(2, "اسم الخدمة مطلوب").max(160, "اسم الخدمة طويل جداً"),
    category: z.string().trim().min(1, "نوع الخدمة مطلوب").max(120, "نوع الخدمة طويل جداً"),
    faceValue: z.string().trim().optional(),
    providerCost: nonNegativeMoney,
    customerCharge: nonNegativeMoney,
    notes: z.string().trim().max(1000, "الملاحظات طويلة جداً").optional(),
  }).safeParse({
    providerId: readString(formData, "providerId"),
    name: readString(formData, "name"),
    category: readString(formData, "category"),
    faceValue: readString(formData, "faceValue") || undefined,
    providerCost: readString(formData, "providerCost"),
    customerCharge: readString(formData, "customerCharge"),
    notes: readString(formData, "notes") || undefined,
  });

  if (!parsed.success) redirect(`/electronic-services/templates?error=${encodeURIComponent(errorMessage(parsed.error))}`);

  try {
    await electronicServiceTransactionService.createTemplate(auth.shop.id, auth.user.id, parsed.data);
  } catch (error) {
    redirect(`/electronic-services/templates?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshElectronicServices();
  redirect("/electronic-services/templates?saved=1");
}

export async function setElectronicServiceTemplateStatusAction(formData: FormData) {
  const auth = await requirePermission("electronic_services:manage");
  const parsed = z.object({ templateId: uuid, isActive: z.enum(["true", "false"]) }).safeParse({
    templateId: readString(formData, "templateId"),
    isActive: readString(formData, "isActive"),
  });
  if (!parsed.success) redirect(`/electronic-services/templates?error=${encodeURIComponent(errorMessage(parsed.error))}`);

  try {
    await electronicServiceTransactionService.setTemplateActive(auth.shop.id, parsed.data.templateId, parsed.data.isActive === "true");
  } catch (error) {
    redirect(`/electronic-services/templates?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshElectronicServices();
  redirect("/electronic-services/templates?statusUpdated=1");
}

export async function createElectronicServiceTransactionAction(formData: FormData) {
  const auth = await requirePermission("electronic_services:execute");
  const mode = readString(formData, "mode");
  const financial = z.object({
    paymentDestination,
    walletId: optionalUuid,
    customerId: optionalUuid,
  }).safeParse({
    paymentDestination: readString(formData, "paymentDestination") || "DRAWER",
    walletId: readString(formData, "walletId") || undefined,
    customerId: readString(formData, "customerId") || undefined,
  });

  if (!financial.success) {
    redirect(`/electronic-services/new?error=${encodeURIComponent(errorMessage(financial.error))}`);
  }

  const common = {
    paymentDestination: financial.data.paymentDestination,
    walletId: financial.data.walletId || undefined,
    customerId: financial.data.customerId || undefined,
    customerPhone: readString(formData, "customerPhone") || undefined,
    reference: readString(formData, "reference") || undefined,
    notes: readString(formData, "notes") || undefined,
  };

  try {
    if (mode === "TEMPLATE") {
      const parsed = z.object({ templateId: uuid }).safeParse({ templateId: readString(formData, "templateId") });
      if (!parsed.success) throw parsed.error;
      const result = await electronicServiceTransactionService.createTransaction(auth.shop.id, auth.user.id, {
        mode: "TEMPLATE",
        templateId: parsed.data.templateId,
        ...common,
      });
      refreshElectronicServices();
      redirect(`/electronic-services/new?saved=1&transaction=${result.id}`);
    }

    const parsed = z.object({
      providerId: uuid,
      category: z.string().trim().min(1, "نوع الخدمة مطلوب").max(120),
      serviceName: z.string().trim().min(2, "اسم الخدمة مطلوب").max(160),
      faceValue: nonNegativeMoney,
      providerCost: nonNegativeMoney,
      profitMode: z.enum(["AUTO_DIFFERENCE", "FIXED", "PERCENTAGE", "NONE"]),
      profitValue: z.string().trim().optional(),
      customerCharge: z.string().trim().optional(),
    }).safeParse({
      providerId: readString(formData, "providerId"),
      category: readString(formData, "category"),
      serviceName: readString(formData, "serviceName"),
      faceValue: readString(formData, "faceValue"),
      providerCost: readString(formData, "providerCost"),
      profitMode: readString(formData, "profitMode"),
      profitValue: readString(formData, "profitValue") || undefined,
      customerCharge: readString(formData, "customerCharge") || undefined,
    });
    if (!parsed.success) throw parsed.error;

    if (parsed.data.profitMode === "AUTO_DIFFERENCE") {
      const charge = nonNegativeMoney.safeParse(parsed.data.customerCharge ?? "");
      if (!charge.success) throw charge.error;
    }

    if ((parsed.data.profitMode === "FIXED" || parsed.data.profitMode === "PERCENTAGE") && !parsed.data.profitValue) {
      throw new Error("أدخل قيمة الربح أو النسبة.");
    }

    const result = await electronicServiceTransactionService.createTransaction(auth.shop.id, auth.user.id, {
      mode: "FREE",
      ...parsed.data,
      ...common,
    });
    refreshElectronicServices();
    redirect(`/electronic-services/new?saved=1&transaction=${result.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/electronic-services/new?error=${encodeURIComponent(errorMessage(error))}`);
  }
}

export async function voidElectronicServiceTransactionAction(formData: FormData) {
  const auth = await requirePermission("sales:cancel");
  const parsed = z.object({
    transactionId: uuid,
    voidReason: z.string().trim().max(500, "سبب الإلغاء طويل جداً").optional(),
  }).safeParse({
    transactionId: readString(formData, "transactionId"),
    voidReason: readString(formData, "voidReason") || undefined,
  });

  if (!parsed.success) {
    redirect(`/electronic-services/new?error=${encodeURIComponent(errorMessage(parsed.error))}`);
  }

  try {
    await electronicServiceTransactionService.voidTransaction(
      auth.shop.id,
      auth.user.id,
      parsed.data.transactionId,
      parsed.data.voidReason,
    );
  } catch (error) {
    redirect(`/electronic-services/new?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshElectronicServices();
  redirect("/electronic-services/new?voided=1");
}