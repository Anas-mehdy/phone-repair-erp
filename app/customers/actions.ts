"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { customerService } from "@/lib/services/customerService";

const customerInputSchema = z.object({
  name: z.string().trim().min(1, "اسم العميل مطلوب"),
  phone: z.string().optional(),
  email: z.string().trim().optional().refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "البريد الإلكتروني غير صالح",
  ),
  notes: z.string().optional(),
});

const updateCustomerSchema = customerInputSchema.extend({
  customerId: z.string().uuid(),
});

const customerIdSchema = z.object({
  customerId: z.string().uuid(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || "تحقق من بيانات العميل وحاول مجدداً.";
  }
  return error instanceof Error ? error.message : "تعذر حفظ العميل. حاول مجدداً.";
}

export async function createCustomerAction(formData: FormData) {
  const parsed = customerInputSchema.safeParse({
    name: readString(formData, "name"),
    phone: readString(formData, "phone"),
    email: readString(formData, "email"),
    notes: readString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`/customers/new?error=${encodeURIComponent(errorMessage(parsed.error))}`);
  }

  const auth = await requirePermission("customers:manage");
  let customer: Awaited<ReturnType<typeof customerService.createCustomer>>;
  try {
    customer = await customerService.createCustomer(auth.shop.id, parsed.data);
  } catch (error) {
    redirect(`/customers/new?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
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
