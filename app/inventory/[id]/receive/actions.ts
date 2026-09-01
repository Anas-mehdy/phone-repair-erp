"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { supplierInvoiceAttachmentService } from "@/lib/services/supplierInvoiceAttachmentService";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const schema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("الكمية يجب أن تكون أكبر من صفر"),
  supplierId: z.string().trim().optional().refine((value) => !value || z.string().uuid().safeParse(value).success, "المورد المحدد غير صالح"),
  unitCost: z.string().trim().optional().refine((value) => !value || Number(value.replace(",", ".")) >= 0, "تكلفة الشراء غير صالحة"),
  note: z.string().trim().max(1000, "الملاحظة طويلة جداً").optional(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message || "تحقق من البيانات وحاول مجدداً.";
  return error instanceof Error ? error.message : "تعذر تنفيذ العملية. حاول مجدداً.";
}

export async function receiveStockWithInvoiceAction(formData: FormData) {
  const itemId = readString(formData, "inventoryItemId");
  const destination = z.string().uuid().safeParse(itemId).success ? `/inventory/${itemId}/receive` : "/inventory";

  try {
    const input = schema.parse({
      inventoryItemId: itemId,
      quantity: readString(formData, "quantity"),
      supplierId: readString(formData, "supplierId"),
      unitCost: readString(formData, "unitCost"),
      note: readString(formData, "note"),
    });

    const rawFile = formData.get("invoiceFile");
    let attachment = null;

    if (rawFile instanceof File && rawFile.size > 0) {
      if (!ALLOWED_TYPES.has(rawFile.type)) {
        throw new Error("نوع الملف غير مدعوم. ارفع PDF أو صورة JPG/PNG/WEBP.");
      }
      if (rawFile.size > MAX_FILE_SIZE) {
        throw new Error("حجم الفاتورة أكبر من 8 ميغابايت.");
      }

      attachment = {
        fileName: rawFile.name.slice(0, 255) || "supplier-invoice",
        mimeType: rawFile.type,
        fileSize: rawFile.size,
        fileData: Buffer.from(await rawFile.arrayBuffer()),
      };
    }

    const auth = await requirePermission("inventory:manage");
    await supplierInvoiceAttachmentService.receiveStockWithInvoice(
      auth.shop.id,
      input.inventoryItemId,
      auth.user.id,
      {
        quantity: input.quantity,
        supplierId: input.supplierId || null,
        unitCost: input.unitCost || null,
        note: input.note || null,
        attachment,
      },
    );

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${input.inventoryItemId}`);
    revalidatePath("/suppliers");
    if (input.supplierId) revalidatePath(`/suppliers/${input.supplierId}`);
    redirect(`/inventory/${input.inventoryItemId}?stockAdded=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`${destination}?error=${encodeURIComponent(errorMessage(error))}`);
  }
}
