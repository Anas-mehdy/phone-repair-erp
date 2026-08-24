"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentShopContext } from "@/lib/current-shop";
import { supplierService } from "@/lib/services/supplierService";

const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "اسم المورد مطلوب"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const updateSupplierSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().trim().min(1, "اسم المورد مطلوب"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const deleteSupplierSchema = z.object({
  supplierId: z.string().uuid(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createSupplierAction(formData: FormData) {
  const input = createSupplierSchema.parse({
    name: readString(formData, "name"),
    phone: readString(formData, "phone"),
    address: readString(formData, "address"),
    notes: readString(formData, "notes"),
  });

  const { shopId } = await getCurrentShopContext();
  const supplier = await supplierService.createSupplier(shopId, input);

  revalidatePath("/suppliers");
  revalidatePath("/repair-orders/new");
  redirect(`/suppliers/${supplier.id}`);
}

export async function updateSupplierAction(formData: FormData) {
  const input = updateSupplierSchema.parse({
    supplierId: readString(formData, "supplierId"),
    name: readString(formData, "name"),
    phone: readString(formData, "phone"),
    address: readString(formData, "address"),
    notes: readString(formData, "notes"),
  });

  const { shopId } = await getCurrentShopContext();
  await supplierService.updateSupplier(shopId, input.supplierId, input);

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${input.supplierId}`);
  revalidatePath("/repair-orders");
}

export async function deleteSupplierAction(formData: FormData) {
  const input = deleteSupplierSchema.parse({
    supplierId: readString(formData, "supplierId"),
  });

  const { shopId } = await getCurrentShopContext();
  await supplierService.deleteSupplier(shopId, input.supplierId);

  revalidatePath("/suppliers");
  redirect("/suppliers");
}
