"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { customerService } from "@/lib/services/customerService";

const updateCustomerSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().trim().min(1, "اسم العميل مطلوب"),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

const customerIdSchema = z.object({
  customerId: z.string().uuid(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateCustomerAction(formData: FormData) {
  const input = updateCustomerSchema.parse({
    customerId: readString(formData, "customerId"),
    name: readString(formData, "name"),
    phone: readString(formData, "phone"),
    email: readString(formData, "email"),
    notes: readString(formData, "notes"),
  });

  const auth = await requirePermission("customers:manage");
  await customerService.updateCustomer(auth.shop.id, input.customerId, input);

  revalidatePath("/customers");
  revalidatePath(`/customers/${input.customerId}`);
  redirect(`/customers/${input.customerId}`);
}

export async function softDeleteCustomerAction(formData: FormData) {
  const input = customerIdSchema.parse({
    customerId: readString(formData, "customerId"),
  });

  const auth = await requirePermission("customers:delete");
  await customerService.softDeleteCustomer(auth.shop.id, input.customerId);

  revalidatePath("/customers");
  redirect("/customers");
}
