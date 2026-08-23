"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentShopContext } from "@/lib/current-shop";
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

const createInventoryItemSchema = z.object({
  name: z.string().trim().min(1, "اسم القطعة مطلوب"),
  category: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  unitCost: optionalMoneySchema,
  unitPrice: requiredMoneySchema,
  quantity: nonNegativeIntegerSchema,
  reorderLevel: nonNegativeIntegerSchema,
});

const updateInventoryItemDetailsSchema = z.object({
  inventoryItemId: z.string().uuid(),
  name: z.string().trim().min(1, "اسم القطعة مطلوب"),
  category: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  unitCost: optionalMoneySchema,
  unitPrice: requiredMoneySchema,
  reorderLevel: nonNegativeIntegerSchema,
});

const addStockSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: positiveIntegerSchema,
  note: z.string().optional(),
});

const adjustStockSchema = z.object({
  inventoryItemId: z.string().uuid(),
  newQuantity: z
    .string()
    .trim()
    .min(1, "الكمية الجديدة مطلوبة")
    .refine((value) => Number.parseInt(value, 10) >= 0, {
      message: "الكمية الجديدة يجب أن تكون صفراً أو أكثر",
    }),
  note: z.string().optional(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createInventoryItemAction(formData: FormData) {
  const input = createInventoryItemSchema.parse({
    name: readString(formData, "name"),
    category: readString(formData, "category"),
    sku: readString(formData, "sku"),
    description: readString(formData, "description"),
    unitCost: readString(formData, "unitCost"),
    unitPrice: readString(formData, "unitPrice"),
    quantity: readString(formData, "quantity"),
    reorderLevel: readString(formData, "reorderLevel"),
  });

  const { shopId, userId } = await getCurrentShopContext();
  const item = await inventoryService.createInventoryItem(shopId, userId, input);

  revalidatePath("/inventory");
  redirect(`/inventory/${item.id}`);
}

export async function updateInventoryItemDetailsAction(formData: FormData) {
  const input = updateInventoryItemDetailsSchema.parse({
    inventoryItemId: readString(formData, "inventoryItemId"),
    name: readString(formData, "name"),
    category: readString(formData, "category"),
    sku: readString(formData, "sku"),
    description: readString(formData, "description"),
    unitCost: readString(formData, "unitCost"),
    unitPrice: readString(formData, "unitPrice"),
    reorderLevel: readString(formData, "reorderLevel"),
  });

  const { shopId } = await getCurrentShopContext();
  await inventoryService.updateInventoryItemDetails(
    shopId,
    input.inventoryItemId,
    input,
  );

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.inventoryItemId}`);
  redirect(`/inventory/${input.inventoryItemId}`);
}

export async function addStockAction(formData: FormData) {
  const input = addStockSchema.parse({
    inventoryItemId: readString(formData, "inventoryItemId"),
    quantity: readString(formData, "quantity"),
    note: readString(formData, "note"),
  });

  const { shopId, userId } = await getCurrentShopContext();
  await inventoryService.addStock(shopId, input.inventoryItemId, userId, input);

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

  const { shopId, userId } = await getCurrentShopContext();
  await inventoryService.adjustStock(shopId, input.inventoryItemId, userId, input);

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.inventoryItemId}`);
  redirect(`/inventory/${input.inventoryItemId}`);
}
