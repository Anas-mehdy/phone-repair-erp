"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";

const lineSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().nonnegative(),
});

const invoiceSchema = z.object({
  supplierId: z.string().uuid(),
  invoiceNumber: z.string().trim().max(120).optional(),
  invoiceDate: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(lineSchema).min(1).max(100),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "بيانات الفاتورة غير صحيحة.";
  return error instanceof Error ? error.message : "تعذر حفظ الفاتورة.";
}

export async function createSupplierInvoiceAction(formData: FormData) {
  const supplierId = readString(formData, "supplierId");
  let rawItems: unknown = [];
  try {
    rawItems = JSON.parse(readString(formData, "items"));
  } catch {
    redirect(`/suppliers/${supplierId}/invoices/new?error=${encodeURIComponent("بنود الفاتورة غير صحيحة.")}`);
  }

  const parsed = invoiceSchema.safeParse({
    supplierId,
    invoiceNumber: readString(formData, "invoiceNumber") || undefined,
    invoiceDate: readString(formData, "invoiceDate"),
    notes: readString(formData, "notes") || undefined,
    items: rawItems,
  });

  if (!parsed.success) {
    redirect(`/suppliers/${supplierId}/invoices/new?error=${encodeURIComponent(errorMessage(parsed.error))}`);
  }

  const fileValue = formData.get("attachment");
  let attachment: { fileName: string; contentType: string; data: Buffer } | null = null;
  if (fileValue instanceof File && fileValue.size > 0) {
    if (fileValue.size > 5 * 1024 * 1024) {
      redirect(`/suppliers/${supplierId}/invoices/new?error=${encodeURIComponent("حجم المرفق يجب ألا يتجاوز 5MB.")}`);
    }
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(fileValue.type)) {
      redirect(`/suppliers/${supplierId}/invoices/new?error=${encodeURIComponent("نوع المرفق غير مدعوم. استخدم PDF أو صورة JPG/PNG/WEBP.")}`);
    }
    attachment = {
      fileName: fileValue.name.slice(0, 255),
      contentType: fileValue.type,
      data: Buffer.from(await fileValue.arrayBuffer()),
    };
  }

  const auth = await requirePermission("suppliers:manage");
  let invoiceId = "";
  try {
    const invoiceDate = new Date(`${parsed.data.invoiceDate}T12:00:00`);
    if (Number.isNaN(invoiceDate.getTime())) throw new Error("تاريخ الفاتورة غير صحيح.");

    const result = await supplierInvoiceService.createSupplierInvoice(auth.shop.id, auth.user.id, {
      supplierId: parsed.data.supplierId,
      invoiceNumber: parsed.data.invoiceNumber,
      invoiceDate,
      notes: parsed.data.notes,
      items: parsed.data.items,
      attachment,
    });
    invoiceId = result.id;
  } catch (error) {
    redirect(`/suppliers/${supplierId}/invoices/new?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/inventory");
  redirect(`/suppliers/invoices/${invoiceId}?created=1`);
}
