"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { supplierInvoiceService } from "@/lib/services/supplierInvoiceService";
import {
  deleteSupplierInvoiceReference,
  uploadSupplierInvoiceReference,
  validateSupplierInvoiceReference,
} from "@/lib/services/supplierInvoiceStorage";

const invoiceItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("الكمية يجب أن تكون أكبر من صفر"),
  unitCost: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim().replace(",", "."))
    .refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0, {
      message: "تكلفة القطعة غير صحيحة",
    }),
});

const createInvoiceSchema = z.object({
  supplierId: z.string().uuid("المورد المحدد غير صالح"),
  invoiceNumber: z.string().trim().max(120, "رقم الفاتورة طويل جداً").optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ الفاتورة غير صالح"),
  notes: z.string().trim().max(1000, "الملاحظات طويلة جداً").optional(),
  items: z.array(invoiceItemSchema).min(1, "أضف بنداً واحداً على الأقل"),
});

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "تحقق من بيانات الفاتورة.";
  }
  return error instanceof Error ? error.message : "تعذر حفظ فاتورة المورد.";
}

export async function searchInventoryForSupplierInvoiceAction(query: string) {
  const safeQuery = z.string().max(120).parse(query).trim();
  if (!safeQuery) return [];
  const auth = await requirePermission("suppliers:manage");
  return supplierInvoiceService.searchInventoryForSupplierInvoice(
    auth.shop.id,
    safeQuery,
    20,
  );
}

export async function createSupplierInvoiceAction(formData: FormData): Promise<
  | { success: true; invoiceId: string }
  | { success: false; error: string }
> {
  let uploadedPath: string | null = null;

  try {
    const rawItems = formData.get("items");
    const items =
      typeof rawItems === "string" && rawItems.trim()
        ? JSON.parse(rawItems)
        : [];

    const parsed = createInvoiceSchema.parse({
      supplierId: String(formData.get("supplierId") ?? ""),
      invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
      invoiceDate: String(formData.get("invoiceDate") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      items,
    });

    const auth = await requirePermission("suppliers:manage");
    const invoiceId = crypto.randomUUID();
    const attachmentValue = formData.get("attachment");
    const attachment =
      attachmentValue instanceof File && attachmentValue.size > 0
        ? attachmentValue
        : null;

    validateSupplierInvoiceReference(attachment);

    const storedAttachment = attachment
      ? await uploadSupplierInvoiceReference(auth.shop.id, invoiceId, attachment)
      : null;
    uploadedPath = storedAttachment?.path ?? null;

    await supplierInvoiceService.createSupplierInvoice(
      auth.shop.id,
      auth.user.id,
      invoiceId,
      parsed,
      storedAttachment,
    );

    revalidatePath("/suppliers");
    revalidatePath("/suppliers/invoices");
    revalidatePath(`/suppliers/${parsed.supplierId}`);
    revalidatePath("/inventory");

    return { success: true, invoiceId };
  } catch (error) {
    if (uploadedPath) {
      await deleteSupplierInvoiceReference(uploadedPath);
    }
    return { success: false, error: errorMessage(error) };
  }
}
