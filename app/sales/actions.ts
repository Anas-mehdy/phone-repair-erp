"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { salesService } from "@/lib/services/salesService";
import { salesInventorySearchService } from "@/lib/services/salesInventorySearchService";
import { salesCustomerSearchService } from "@/lib/services/salesCustomerSearchService";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";

export type SaleActionState = {
  error?: string;
};

const rawLineItemSchema = z
  .object({
    inventoryItemId: z.string().uuid().nullable().optional(),
    description: z.string().trim().optional(),
    quantity: z.coerce.number().int().positive("الكمية يجب أن تكون أكبر من صفر"),
    unitPrice: z.coerce.number().nonnegative("سعر الوحدة يجب أن يكون صفراً أو أكثر"),
    discountTotal: z.coerce.number().nonnegative("الخصم يجب أن يكون صفراً أو أكثر").default(0),
  })
  .refine((item) => item.inventoryItemId || item.description, {
    message: "اختر قطعة مخزون أو أدخل وصف بند يدوي",
  });

const createSaleSchema = z
  .object({
    customerMode: z.enum(["EXISTING", "NEW", "CASH"]),
    customerId: z.string().uuid().optional().or(z.literal("")),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    items: z.array(rawLineItemSchema).min(1, "يجب إضافة بند واحد على الأقل"),
  })
  .superRefine((data, ctx) => {
    if (data.customerMode === "EXISTING" && !data.customerId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "اختر عميلاً موجوداً من القائمة." });
    }
    if (data.customerMode === "NEW" && !data.customerName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "اسم العميل الجديد مطلوب." });
    }
  });

const cancelSaleSchema = z.object({
  saleId: z.string().uuid(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "البيانات غير صحيحة.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "حدث خطأ غير متوقع.";
}

export async function searchInventoryForSaleAction(query: string) {
  const safeQuery = z.string().max(120).parse(query).trim();
  if (!safeQuery) return [];

  const auth = await requirePermission("sales:create");
  return salesInventorySearchService.searchInventoryForSale(auth.shop.id, safeQuery, 20);
}

export async function searchCustomersForSaleAction(query: string) {
  const safeQuery = z.string().max(120).parse(query).trim();
  if (!safeQuery) return [];

  const auth = await requirePermission("sales:create");
  return salesCustomerSearchService.searchCustomersForSale(auth.shop.id, safeQuery, 20);
}

export async function createSaleAction(
  _state: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  let saleId = "";

  try {
    const rawItems = JSON.parse(readString(formData, "items"));
    const parsed = createSaleSchema.parse({
      customerMode: readString(formData, "customerMode") || "CASH",
      customerId: readString(formData, "customerId"),
      customerName: readString(formData, "customerName"),
      customerPhone: readString(formData, "customerPhone"),
      items: rawItems,
    });

    const auth = await requirePermission("sales:create");
    const entitlement = await entitlementService.checkCanCreateNewOperation(auth.shop.id);
    if (!entitlement.allowed) {
      return { error: entitlement.message };
    }

    const sale = await salesService.createSale(auth.shop.id, auth.user.id, {
      customerId: parsed.customerMode === "EXISTING" ? parsed.customerId || undefined : undefined,
      customerName: parsed.customerMode === "NEW" ? parsed.customerName : undefined,
      customerPhone: parsed.customerMode === "NEW" ? parsed.customerPhone : undefined,
      items: parsed.items.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        description: item.description ?? "",
        quantity: item.quantity,
        unitPrice: String(item.unitPrice),
        discountTotal: String(item.discountTotal),
      })),
    });
    saleId = sale.id;
  } catch (error) {
    return {
      error: getErrorMessage(error),
    };
  }

  revalidatePath("/sales");
  revalidatePath("/customers");
  revalidatePath("/inventory");
  redirect(`/sales/${saleId}`);
}

export async function cancelSaleAction(formData: FormData) {
  const input = cancelSaleSchema.parse({
    saleId: readString(formData, "saleId"),
  });

  const auth = await requirePermission("sales:cancel");
  await salesService.cancelSale(auth.shop.id, input.saleId, auth.user.id);

  revalidatePath("/sales");
  revalidatePath(`/sales/${input.saleId}`);
  revalidatePath("/inventory");
  redirect(`/sales/${input.saleId}`);
}
