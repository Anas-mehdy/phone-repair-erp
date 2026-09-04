"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { electronicServiceProviderService } from "@/lib/services/electronicServiceProviderService";

const moneySchema = z
  .string()
  .trim()
  .min(1, "المبلغ مطلوب")
  .refine((value) => {
    const number = Number(value.replace(",", "."));
    return Number.isFinite(number) && number >= 0;
  }, "المبلغ غير صحيح");

const providerIdSchema = z.string().uuid("معرف مزود الخدمة غير صالح");

const providerSchema = z.object({
  name: z.string().trim().min(2, "اسم المزود يجب أن يكون حرفين على الأقل").max(160, "اسم المزود طويل جداً"),
  typeLabel: z.string().trim().max(160, "نوع المزود طويل جداً").optional(),
  openingBalance: moneySchema,
  notes: z.string().trim().max(1500, "الملاحظات طويلة جداً").optional(),
});

const updateProviderSchema = z.object({
  providerId: providerIdSchema,
  name: z.string().trim().min(2, "اسم المزود يجب أن يكون حرفين على الأقل").max(160, "اسم المزود طويل جداً"),
  typeLabel: z.string().trim().max(160, "نوع المزود طويل جداً").optional(),
  notes: z.string().trim().max(1500, "الملاحظات طويلة جداً").optional(),
});

const movementSchema = z.object({
  providerId: providerIdSchema,
  mode: z.enum(["TOP_UP", "DEDUCT", "ADJUST"]),
  value: moneySchema,
  description: z.string().trim().max(500, "الوصف طويل جداً").optional(),
  reference: z.string().trim().max(160, "المرجع طويل جداً").optional(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "تحقق من البيانات وحاول مجدداً.";
  }
  return error instanceof Error ? error.message : "تعذر تنفيذ العملية. حاول مجدداً.";
}

function refreshElectronicServices(providerId?: string) {
  revalidatePath("/electronic-services");
  revalidatePath("/electronic-services/reconcile");
  revalidatePath("/electronic-services/reports");
  if (providerId) revalidatePath(`/electronic-services/${providerId}`);
  revalidatePath("/dashboard");
}

export async function createElectronicServiceProviderAction(formData: FormData) {
  const auth = await requirePermission("electronic_services:manage");
  const parsed = providerSchema.safeParse({
    name: readString(formData, "name"),
    typeLabel: readString(formData, "typeLabel") || undefined,
    openingBalance: readString(formData, "openingBalance") || "0",
    notes: readString(formData, "notes") || undefined,
  });

  if (!parsed.success) {
    redirect(`/electronic-services?error=${encodeURIComponent(errorMessage(parsed.error))}`);
  }

  let providerId: string;
  try {
    providerId = await electronicServiceProviderService.createProvider(auth.shop.id, auth.user.id, {
      ...parsed.data,
      currencyCode: auth.shop.currency || "SAR",
    });
  } catch (error) {
    redirect(`/electronic-services?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshElectronicServices(providerId);
  redirect(`/electronic-services/${providerId}?created=1`);
}

export async function updateElectronicServiceProviderAction(formData: FormData) {
  const auth = await requirePermission("electronic_services:manage");
  const parsed = updateProviderSchema.safeParse({
    providerId: readString(formData, "providerId"),
    name: readString(formData, "name"),
    typeLabel: readString(formData, "typeLabel") || undefined,
    notes: readString(formData, "notes") || undefined,
  });

  if (!parsed.success) {
    const id = readString(formData, "providerId");
    redirect(`/electronic-services/${encodeURIComponent(id)}?error=${encodeURIComponent(errorMessage(parsed.error))}`);
  }

  try {
    await electronicServiceProviderService.updateProvider(auth.shop.id, parsed.data.providerId, parsed.data);
  } catch (error) {
    redirect(`/electronic-services/${parsed.data.providerId}?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshElectronicServices(parsed.data.providerId);
  redirect(`/electronic-services/${parsed.data.providerId}?updated=1`);
}

export async function setElectronicServiceProviderStatusAction(formData: FormData) {
  const auth = await requirePermission("electronic_services:manage");
  const providerId = providerIdSchema.safeParse(readString(formData, "providerId"));
  const isActive = readString(formData, "isActive") === "true";

  if (!providerId.success) {
    redirect(`/electronic-services?error=${encodeURIComponent(errorMessage(providerId.error))}`);
  }

  try {
    await electronicServiceProviderService.setProviderActive(auth.shop.id, providerId.data, isActive);
  } catch (error) {
    redirect(`/electronic-services/${providerId.data}?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshElectronicServices(providerId.data);
  redirect(`/electronic-services/${providerId.data}?statusUpdated=1`);
}

export async function recordElectronicServiceProviderBalanceAction(formData: FormData) {
  const auth = await requirePermission("electronic_services:manage");
  const parsed = movementSchema.safeParse({
    providerId: readString(formData, "providerId"),
    mode: readString(formData, "mode"),
    value: readString(formData, "value"),
    description: readString(formData, "description") || undefined,
    reference: readString(formData, "reference") || undefined,
  });

  if (!parsed.success) {
    const id = readString(formData, "providerId");
    redirect(`/electronic-services/${encodeURIComponent(id)}?error=${encodeURIComponent(errorMessage(parsed.error))}`);
  }

  try {
    await electronicServiceProviderService.recordBalanceMovement(auth.shop.id, auth.user.id, parsed.data.providerId, parsed.data);
  } catch (error) {
    redirect(`/electronic-services/${parsed.data.providerId}?error=${encodeURIComponent(errorMessage(error))}`);
  }

  refreshElectronicServices(parsed.data.providerId);
  const saved = parsed.data.mode.toLowerCase();
  redirect(`/electronic-services/${parsed.data.providerId}?movementSaved=${saved}`);
}