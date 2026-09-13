"use server";

import crypto from "crypto";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { expenseMoneyService } from "@/lib/services/expenseMoneyService";
import { purchaseReceivingService } from "@/lib/services/purchaseReceivingService";
import { salesEmployeeService } from "@/lib/services/salesEmployeeService";
import { salesService } from "@/lib/services/salesService";
import { localDateString, timeZoneForCountry, zonedDateTimeToUtc } from "@/lib/timezone";

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
function assertSalesEmployee(profile: string | null | undefined) {
  if (profile !== "SALES_EMPLOYEE") throw new Error("هذه العملية مخصصة لموظف المبيعات.");
}
function localNoonUtc(dateInput: string, timeZone: string) {
  const [year, month, day] = dateInput.split("-").map(Number);
  return zonedDateTimeToUtc({ year, month, day, hour: 12 }, timeZone);
}

const saleLinesSchema = z.array(z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
})).min(1).max(100);

export async function createSalesEmployeeSaleAction(formData: FormData) {
  const auth = await requirePermission("sales:create_own");
  assertSalesEmployee(auth.membership.accessProfile);

  const customerMode = z.enum(["CASH", "EXISTING", "NEW"]).parse(read(formData, "customerMode") || "CASH");
  const customerId = read(formData, "customerId");
  const customerName = read(formData, "customerName").trim();
  const customerPhone = read(formData, "customerPhone").trim();
  const lines = saleLinesSchema.parse(JSON.parse(read(formData, "items") || "[]"));
  if (customerMode === "EXISTING" && !z.string().uuid().safeParse(customerId).success) throw new Error("اختر عميلاً موجوداً.");
  if (customerMode === "NEW" && customerName.length < 2) throw new Error("اسم العميل الجديد مطلوب.");

  const uniqueIds = [...new Set(lines.map((line) => line.inventoryItemId))];
  const inventory = await prisma.inventoryItem.findMany({
    where: { shopId: auth.shop.id, id: { in: uniqueIds }, deletedAt: null },
    select: { id: true, name: true, quantity: true, unitPrice: true },
  });
  if (inventory.length !== uniqueIds.length) throw new Error("أحد الأصناف غير موجود في المخزون.");
  const byId = new Map(inventory.map((item) => [item.id, item]));
  const requestedById = new Map<string, number>();
  for (const line of lines) requestedById.set(line.inventoryItemId, (requestedById.get(line.inventoryItemId) ?? 0) + line.quantity);
  for (const [id, quantity] of requestedById) {
    const item = byId.get(id)!;
    if (quantity > item.quantity) throw new Error(`الكمية المتاحة من «${item.name}» غير كافية.`);
  }

  const sale = await salesService.createSale(auth.shop.id, auth.user.id, {
    customerId: customerMode === "EXISTING" ? customerId : undefined,
    customerName: customerMode === "NEW" ? customerName : undefined,
    customerPhone: customerMode === "NEW" ? customerPhone || undefined : undefined,
    paymentDestination: "DRAWER",
    changeDestination: "DRAWER",
    items: lines.map((line) => {
      const item = byId.get(line.inventoryItemId)!;
      return { inventoryItemId: item.id, description: item.name, quantity: line.quantity, unitPrice: item.unitPrice.toString(), discountTotal: "0" };
    }),
  });

  revalidatePath("/employee/pos");
  revalidatePath("/employee/sales");
  revalidatePath("/reports");
  revalidatePath("/cash-drawer");
  redirect(`/employee/sales/${sale.id}?created=1`);
}

export async function cancelSalesEmployeeSaleAction(formData: FormData) {
  const auth = await requirePermission("sales:cancel_own");
  assertSalesEmployee(auth.membership.accessProfile);
  const saleId = z.string().uuid().parse(read(formData, "saleId"));
  await salesEmployeeService.cancelOwnSale(auth.shop.id, auth.user.id, saleId, timeZoneForCountry(auth.shop.countryCode));
  revalidatePath("/employee/sales");
  revalidatePath(`/employee/sales/${saleId}`);
  revalidatePath("/reports");
  revalidatePath("/cash-drawer");
  redirect(`/employee/sales/${saleId}?cancelled=1`);
}

export async function updateSalesEmployeeSaleAction(formData: FormData) {
  const auth = await requirePermission("sales:update_own");
  assertSalesEmployee(auth.membership.accessProfile);
  const saleId = z.string().uuid().parse(read(formData, "saleId"));
  const quantities = z.array(z.object({ saleItemId: z.string().uuid(), quantity: z.number().int().positive() })).min(1).max(100)
    .parse(JSON.parse(read(formData, "quantities") || "[]"));
  await salesEmployeeService.updateOwnSaleQuantities(auth.shop.id, auth.user.id, saleId, timeZoneForCountry(auth.shop.countryCode), quantities);
  revalidatePath("/employee/sales");
  revalidatePath(`/employee/sales/${saleId}`);
  revalidatePath("/reports");
  revalidatePath("/cash-drawer");
  redirect(`/employee/sales/${saleId}?updated=1`);
}

const purchaseLinesSchema = z.array(z.object({
  inventoryItemId: z.string().uuid().nullable().optional(),
  newItemName: z.string().trim().max(180).nullable().optional(),
  newItemSku: z.string().trim().max(120).nullable().optional(),
  newItemBarcode: z.string().trim().max(160).nullable().optional(),
  newItemCategory: z.string().trim().max(120).nullable().optional(),
  quantity: z.number().int().positive(),
  unitCost: z.string().trim().min(1),
  salePrice: z.string().trim().nullable().optional(),
})).min(1).max(100).superRefine((lines, ctx) => {
  lines.forEach((line, index) => {
    if (!line.inventoryItemId && !line.newItemName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, "newItemName"], message: "اختر صنفاً أو أدخل اسم الصنف الجديد." });
  });
});

export async function createSalesEmployeePurchaseAction(formData: FormData) {
  const auth = await requirePermission("purchases:create");
  assertSalesEmployee(auth.membership.accessProfile);
  const supplierIdRaw = read(formData, "supplierId");
  const supplierId = supplierIdRaw && z.string().uuid().safeParse(supplierIdRaw).success ? supplierIdRaw : null;
  const invoiceDate = z.string().date().parse(read(formData, "invoiceDate"));
  const lines = purchaseLinesSchema.parse(JSON.parse(read(formData, "lines") || "[]"));

  const saved = await purchaseReceivingService.saveDraft(auth.shop.id, auth.user.id, auth.shop.currency || "SAR", {
    supplierId,
    supplierNameSnapshot: supplierId ? null : read(formData, "supplierNameSnapshot").trim() || null,
    supplierInvoiceNumber: read(formData, "supplierInvoiceNumber").trim() || null,
    invoiceDate,
    notes: read(formData, "notes").trim() || null,
    discountTotal: "0",
    extraCostsTotal: "0",
    amountPaid: "0",
    paymentAccountType: "OTHER",
    paymentMethod: PaymentMethod.OTHER,
    paymentSourceName: null,
    paymentReference: null,
    lines: lines.map((line) => ({
      inventoryItemId: line.inventoryItemId || null,
      newItemName: line.inventoryItemId ? null : line.newItemName || null,
      newItemSku: line.inventoryItemId ? null : line.newItemSku || null,
      newItemBarcode: line.inventoryItemId ? null : line.newItemBarcode || null,
      newItemCategory: line.inventoryItemId ? null : line.newItemCategory || null,
      compatibilityGroupIds: [],
      compatibilityReviewNeeded: false,
      matchReviewRequired: false,
      updateSalePrice: false,
      quantity: line.quantity,
      unitCost: line.unitCost,
      salePrice: line.salePrice || null,
    })),
  });

  await purchaseReceivingService.postPurchaseInvoice(auth.shop.id, auth.user.id, saved.id, `sales-employee-${crypto.randomUUID()}`, { receiptMode: "FULL" });
  revalidatePath("/employee/receiving");
  revalidatePath("/inventory");
  revalidatePath("/inventory/purchases");
  redirect(`/employee/receiving?received=1&purchase=${saved.id}`);
}

export async function createSalesEmployeeExpenseAction(formData: FormData) {
  const auth = await requirePermission("expenses:create");
  assertSalesEmployee(auth.membership.accessProfile);
  const input = z.object({
    title: z.string().trim().min(1).max(120),
    category: z.enum(["RENT", "SALARIES", "UTILITIES", "MARKETING", "TRANSPORT", "MAINTENANCE", "OTHER"]),
    amount: z.coerce.number().positive(),
    spentAt: z.string().date(),
    notes: z.string().trim().max(500).optional(),
  }).parse({ title: read(formData, "title"), category: read(formData, "category"), amount: read(formData, "amount"), spentAt: read(formData, "spentAt"), notes: read(formData, "notes") });
  const timeZone = timeZoneForCountry(auth.shop.countryCode);
  const spentAt = localNoonUtc(input.spentAt, timeZone);
  const movementOccurredAt = input.spentAt === localDateString(new Date(), timeZone) ? undefined : spentAt;
  await expenseMoneyService.createExpense(auth.shop.id, auth.user.id, {
    title: input.title,
    category: input.category,
    amount: input.amount.toFixed(2),
    spentAt,
    movementOccurredAt,
    notes: input.notes,
    fundingSource: "DRAWER",
  });
  revalidatePath("/employee/expenses");
  revalidatePath("/reports");
  revalidatePath("/cash-drawer");
  redirect("/employee/expenses?saved=1");
}
