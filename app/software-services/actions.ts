"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { softwareServiceService } from "@/lib/services/softwareServiceService";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "البيانات غير صحيحة.";
  if (error instanceof Error) return error.message;
  return "حدث خطأ غير متوقع.";
}

const createSaleSchema = z.object({
  customerId: z.string().uuid().optional().or(z.literal("")),
  newCustomerName: z.string().trim().max(120).optional(),
  newCustomerPhone: z.string().trim().max(40).optional(),
  catalogId: z.string().uuid().optional().or(z.literal("")),
  serviceName: z.string().trim().min(1, "اسم الخدمة مطلوب").max(160),
  deviceBrand: z.string().trim().max(80).optional(),
  deviceModel: z.string().trim().max(120).optional(),
  deviceSerial: z.string().trim().max(120).optional(),
  salePrice: z.string().trim().min(1, "سعر البيع مطلوب"),
  serviceCost: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
  deviceKept: z.boolean().optional(),
});

export async function createSoftwareServiceSaleAction(formData: FormData) {
  const input = createSaleSchema.parse({
    customerId: readString(formData, "customerId"),
    newCustomerName: readString(formData, "newCustomerName"),
    newCustomerPhone: readString(formData, "newCustomerPhone"),
    catalogId: readString(formData, "catalogId"),
    serviceName: readString(formData, "serviceName"),
    deviceBrand: readString(formData, "deviceBrand"),
    deviceModel: readString(formData, "deviceModel"),
    deviceSerial: readString(formData, "deviceSerial"),
    salePrice: readString(formData, "salePrice"),
    serviceCost: readString(formData, "serviceCost"),
    notes: readString(formData, "notes"),
    deviceKept: readString(formData, "deviceKept") === "on",
  });

  let redirectTo = "/software-services/new";
  try {
    const auth = await requirePermission("sales:create");
    const sale = await softwareServiceService.createSale(auth.shop.id, auth.user.id, {
      ...input,
      customerId: input.customerId || undefined,
      catalogId: input.catalogId || undefined,
    });
    revalidatePath("/software-services");
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    revalidatePath("/reports");
    redirectTo = `/software-services/${sale.id}?created=1`;
  } catch (error) {
    redirectTo = `/software-services/new?error=${encodeURIComponent(getErrorMessage(error))}`;
  }
  redirect(redirectTo);
}

const catalogSchema = z.object({
  name: z.string().trim().min(1, "اسم الخدمة مطلوب").max(160),
  defaultPrice: z.string().trim().optional(),
  defaultCost: z.string().trim().optional(),
});

export async function createSoftwareServiceCatalogAction(formData: FormData) {
  try {
    const input = catalogSchema.parse({
      name: readString(formData, "name"),
      defaultPrice: readString(formData, "defaultPrice"),
      defaultCost: readString(formData, "defaultCost"),
    });
    const auth = await requirePermission("sales:create");
    await softwareServiceService.createCatalogItem(auth.shop.id, input);
    revalidatePath("/software-services");
    redirect("/software-services?catalogSaved=1");
  } catch (error) {
    redirect(`/software-services?catalogError=${encodeURIComponent(getErrorMessage(error))}`);
  }
}

export async function markSoftwareDeviceDeliveredAction(formData: FormData) {
  const id = readString(formData, "id");
  try {
    const auth = await requirePermission("sales:create");
    await softwareServiceService.markDeviceDelivered(auth.shop.id, id);
    revalidatePath("/software-services");
    revalidatePath(`/software-services/${id}`);
    redirect(`/software-services/${id}?delivered=1`);
  } catch (error) {
    redirect(`/software-services/${id}?error=${encodeURIComponent(getErrorMessage(error))}`);
  }
}
