"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { inventoryService } from "@/lib/services/inventoryService";

const optionalMoneySchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || Number(value.replace(",", ".")) >= 0, {
    message: "القيمة يجب أن تكون صفراً أو أكثر",
  });

const requiredMoneySchema = z
  .string()
  .trim()
  .min(1, "السعر مطلوب")
  .refine((value) => Number(value.replace(",", ".")) >= 0, {
    message: "السعر يجب أن يكون صفراً أو أكثر",
  });

const nonNegativeIntegerSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || Number.parseInt(value, 10) >= 0, {
    message: "الكمية يجب أن تكون صفراً أو أكثر",
  });

const positiveIntegerSchema = z
  .string()
  .trim()
  .min(1, "الكمية مطلوبة")
  .refine((value) => Number.parseInt(value, 10) > 0, {
    message: "الكمية يجب أن تكون أكبر من صفر",
  });

const postgresUuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "معرّف غير صالح",
);

const optionalPostgresUuidSchema = z.string().trim().optional().refine(
  (value) => !value || postgresUuidSchema.safeParse(value).success,
  "التصنيف المحدد غير صالح",
);

const categoryNameSchema = z.string().trim().max(120, "اسم التصنيف طويل جداً").optional();

const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1, "اسم القطعة مطلوب"),
  categoryId: optionalPostgresUuidSchema,
  newCategoryName: categoryNameSchema,
  sku: z.string().optional(),
  description: z.string().optional(),
  unitCost: optionalMoneySchema,
  unitPrice: requiredMoneySchema,
  quantity: nonNegativeIntegerSchema,
  reorderLevel: nonNegativeIntegerSchema,
  compatibilityGroupIds: z.array(postgresUuidSchema).max(5, "يمكن ربط القطعة بخمسة أجهزة كحد أقصى"),
});

const updateInventoryItemDetailsSchema = z.object({
  inventoryItemId: z.string().uuid(),
  name: z.string().trim().min(1, "اسم القطعة مطلوب"),
  categoryId: optionalPostgresUuidSchema,
  newCategoryName: categoryNameSchema,
  sku: z.string().optional(),
  description: z.string().optional(),
  unitCost: optionalMoneySchema,
  unitPrice: requiredMoneySchema,
  reorderLevel: nonNegativeIntegerSchema,
  compatibilityGroupIds: z.array(postgresUuidSchema).max(5, "يمكن ربط القطعة بخمسة أجهزة كحد أقصى"),
});

const addStockSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: positiveIntegerSchema,
  note: z.string().optional(),
});

const adjustStockSchema = z.object({
  inventoryItemId: z.string().uuid(),
  newQuantity: z.string().trim().min(1, "الكمية الجديدة مطلوبة").refine(
    (value) => Number.parseInt(value, 10) >= 0,
    { message: "الكمية الجديدة يجب أن تكون صفراً أو أكثر" },
  ),
  note: z.string().optional(),
});

const inventoryItemIdSchema = z.object({ inventoryItemId: z.string().uuid() });

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readStrings(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && value.length > 0);
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "تحقق من بيانات القطعة وحاول مجدداً.";
  }
  return error instanceof Error ? error.message : "تعذر حفظ القطعة. حاول مجدداً.";
}

export async function createInventoryItemAction(formData: FormData) {
  const parsed = createInventoryItemSchema.safeParse({
    name: readString(formData, "name"),
    categoryId: readString(formData, "categoryId"),
    newCategoryName: readString(formData, "newCategoryName"),
    sku: readString(formData, "sku"),
    description: readString(formData, "description"),
    unitCost: readString(formData, "unitCost"),
    unitPrice: readString(formData, "unitPrice"),
    quantity: readString(formData, "quantity"),
    reorderLevel: readString(formData, "reorderLevel"),
    compatibilityGroupIds: readStrings(formData, "compatibilityGroupIds"),
  });

  if (!parsed.success) redirect(`/inventory/new?error=${encodeURIComponent(errorMessage(parsed.error))}`);

  const auth = await requirePermission("inventory:manage");
  let item: Awaited<ReturnType<typeof inventoryService.createInventoryItem>>;
  try {
    item = await inventoryService.createInventoryItem(auth.shop.id, auth.user.id, parsed.data);
  } catch (error) {
    redirect(`/inventory/new?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath("/inventory");
  redirect(`/inventory/${item.id}`);
}

export async function updateInventoryItemDetailsAction(formData: FormData) {
  const parsed = updateInventoryItemDetailsSchema.safeParse({
    inventoryItemId: readString(formData, "inventoryItemId"),
    name: readString(formData, "name"),
    categoryId: readString(formData, "categoryId"),
    newCategoryName: readString(formData, "newCategoryName"),
    sku: readString(formData, "sku"),
    description: readString(formData, "description"),
    unitCost: readString(formData, "unitCost"),
    unitPrice: readString(formData, "unitPrice"),
    reorderLevel: readString(formData, "reorderLevel"),
    compatibilityGroupIds: readStrings(formData, "compatibilityGroupIds"),
  });

  if (!parsed.success) {
    const itemId = readString(formData, "inventoryItemId");
    const destination = z.string().uuid().safeParse(itemId).success ? `/inventory/${itemId}` : "/inventory";
    redirect(`${destination}?error=${encodeURIComponent(errorMessage(parsed.error))}`);
  }

  const auth = await requirePermission("inventory:manage");
  try {
    await inventoryService.updateInventoryItemDetails(auth.shop.id, parsed.data.inventoryItemId, parsed.data);
  } catch (error) {
    redirect(`/inventory/${parsed.data.inventoryItemId}?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.inventoryItemId}`);
  redirect(`/inventory/${parsed.data.inventoryItemId}`);
}

export async function addStockAction(formData: FormData) {
  const input = addStockSchema.parse({
    inventoryItemId: readString(formData, "inventoryItemId"),
    quantity: readString(formData, "quantity"),
    note: readString(formData, "note"),
  });
  const auth = await requirePermission("inventory:manage");
  await inventoryService.addStock(auth.shop.id, input.inventoryItemId, auth.user.id, input);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.inventoryItemId}`);
  redirect(`/inventory/${input.inventoryItemId}`);
}

export async function adjustStockAction(formData: FormData) {
  const input = adjustStockSchema.parse({
    inventoryItemId: readString(formData, "inventoryItemId"),
    newQuantity: readString(formData, "newQuantity"),
    note: readString(formData, "note"),
  });
  const auth = await requirePermission("inventory:adjust");
  await inventoryService.adjustStock(auth.shop.id, input.inventoryItemId, auth.user.id, input);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.inventoryItemId}`);
  redirect(`/inventory/${input.inventoryItemId}`);
}

export async function deleteInventoryItemAction(formData: FormData) {
  try {
    const input = inventoryItemIdSchema.parse({ inventoryItemId: readString(formData, "inventoryItemId") });
    const auth = await requirePermission("inventory:manage");
    await inventoryService.softDeleteInventoryItem(auth.shop.id, input.inventoryItemId);
    revalidatePath("/inventory");
    revalidatePath("/compatibility");
    redirect("/inventory?deleted=1");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/inventory?error=${encodeURIComponent(errorMessage(error))}`);
  }
}
