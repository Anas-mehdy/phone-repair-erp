"use server";

import { RepairStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { repairOrderService } from "@/lib/services/repairOrderService";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";

const repairOrderItemSchema = z.object({
  id: z.string().optional(),
  inventoryItemId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  supplierName: z.string().nullable().optional(),
  partName: z.string().trim().min(1, "اسم القطعة مطلوب"),
  quantity: z.number().int().min(1).default(1),
  unitCost: z.union([z.string(), z.number()]).optional().nullable(),
  unitPrice: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createRepairOrderSchema = z.object({
  customerName: z.string().trim().min(1, "اسم العميل مطلوب"),
  customerPhone: z.string().trim().min(1, "رقم العميل مطلوب"),
  customerNotes: z.string().optional(),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceSerial: z.string().optional(),
  reportedIssue: z.string().trim().min(1, "وصف المشكلة مطلوب"),
  estimatedTotal: z.string().optional(),
  dueAt: z.string().optional(),
  notes: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  partName: z.string().optional(),
  partCost: z.string().optional(),
  deductPartCost: z.boolean().optional(),
  supplierNotes: z.string().optional(),
  items: z.array(repairOrderItemSchema).optional(),
});

const updateRepairOrderDetailsSchema = z.object({
  repairOrderId: z.string().uuid(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerNotes: z.string().optional(),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceSerial: z.string().optional(),
  reportedIssue: z.string().trim().min(1, "وصف المشكلة مطلوب"),
  diagnosis: z.string().optional(),
  resolutionNotes: z.string().optional(),
  estimatedTotal: z.string().optional(),
  finalTotal: z.string().optional(),
  dueAt: z.string().optional(),
  status: z.nativeEnum(RepairStatus).optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  partName: z.string().optional(),
  partCost: z.string().optional(),
  deductPartCost: z.boolean().optional(),
  supplierNotes: z.string().optional(),
  items: z.array(repairOrderItemSchema).optional(),
  redirectTo: z.string().optional(),
});

const updateRepairOrderStatusSchema = z.object({
  repairOrderId: z.string().uuid(),
  status: z.nativeEnum(RepairStatus),
  note: z.string().optional(),
});

const assignRepairOrderSchema = z.object({
  repairOrderId: z.string().uuid("معرف تذكرة الصيانة غير صحيح"),
  assignedToUserId: z.string().uuid("الفني المحدد غير صحيح").nullable(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function readItems(formData: FormData): z.infer<typeof repairOrderItemSchema>[] | undefined {
  const itemsRaw = formData.get("items");
  if (!itemsRaw || typeof itemsRaw !== "string") {
    return undefined;
  }
  try {
    const parsed = JSON.parse(itemsRaw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        id: item.id || undefined,
        inventoryItemId: item.inventoryItemId || null,
        supplierId: item.supplierId || null,
        supplierName: item.supplierName || null,
        partName: String(item.partName || "").trim(),
        quantity: Number(item.quantity) || 1,
        unitCost: item.unitCost !== undefined ? item.unitCost : null,
        unitPrice: item.unitPrice !== undefined ? item.unitPrice : null,
        notes: item.notes || null,
      })).filter((item) => Boolean(item.partName));
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function createRepairOrderAction(formData: FormData) {
  const input = createRepairOrderSchema.parse({
    customerName: readString(formData, "customerName"),
    customerPhone: readString(formData, "customerPhone"),
    customerNotes: readString(formData, "customerNotes"),
    deviceBrand: readString(formData, "deviceBrand"),
    deviceModel: readString(formData, "deviceModel"),
    deviceSerial: readString(formData, "deviceSerial"),
    reportedIssue: readString(formData, "reportedIssue"),
    estimatedTotal: readString(formData, "estimatedTotal"),
    dueAt: readString(formData, "dueAt"),
    notes: readString(formData, "notes"),
    assignedToUserId: readString(formData, "assignedToUserId") || undefined,
    supplierId: readString(formData, "supplierId"),
    supplierName: readString(formData, "supplierName"),
    partName: readString(formData, "partName"),
    partCost: readString(formData, "partCost"),
    deductPartCost: readCheckbox(formData, "deductPartCost"),
    supplierNotes: readString(formData, "supplierNotes"),
    items: readItems(formData),
  });

  const auth = await requirePermission("repairs:create");
  if (input.assignedToUserId) {
    await requirePermission("repairs:assign");
  }
  if (input.items && input.items.some((i) => Boolean(i.inventoryItemId))) {
    await requirePermission("inventory:use_parts");
  }

  const guarded = await entitlementService.withRepairOrderLimitGuard(
    auth.shop.id,
    async () => repairOrderService.createRepairOrder(
      auth.shop.id,
      auth.user.id,
      input,
    ),
  );

  if (!("result" in guarded)) {
    redirect(`/repair-orders/new?entitlement=${encodeURIComponent(guarded.code)}`);
  }

  const repairOrder = guarded.result;
  revalidatePath("/repair-orders");
  redirect(`/repair-orders/${repairOrder.id}`);
}

export async function assignRepairOrderAction(formData: FormData) {
  const rawAssignedToUserId = readString(formData, "assignedToUserId");
  const input = assignRepairOrderSchema.parse({
    repairOrderId: readString(formData, "repairOrderId"),
    assignedToUserId: rawAssignedToUserId || null,
  });

  const auth = await requirePermission("repairs:assign");
  await repairOrderService.assignRepairOrder(
    auth.shop.id,
    input.repairOrderId,
    auth.user.id,
    input.assignedToUserId,
  );

  revalidatePath("/repair-orders");
  revalidatePath(`/repair-orders/${input.repairOrderId}`);
  revalidatePath("/dashboard");
}

export async function markRepairAssignmentSeenAction(repairOrderId: string) {
  const parsedId = z.string().uuid().parse(repairOrderId);
  const auth = await requirePermission("repairs:read");
  await repairOrderService.markRepairAssignmentSeen(
    auth.shop.id,
    parsedId,
    auth.user.id,
  );

  revalidatePath("/repair-orders");
}

export async function updateRepairOrderDetailsAction(formData: FormData) {
  const statusStr = readString(formData, "status");
  const status = Object.values(RepairStatus).includes(statusStr as RepairStatus)
    ? (statusStr as RepairStatus)
    : undefined;

  const input = updateRepairOrderDetailsSchema.parse({
    repairOrderId: readString(formData, "repairOrderId"),
    customerName: readString(formData, "customerName") || undefined,
    customerPhone: readString(formData, "customerPhone") || undefined,
    customerNotes: readString(formData, "customerNotes") || undefined,
    deviceBrand: readString(formData, "deviceBrand"),
    deviceModel: readString(formData, "deviceModel"),
    deviceSerial: readString(formData, "deviceSerial"),
    reportedIssue: readString(formData, "reportedIssue"),
    diagnosis: readString(formData, "diagnosis"),
    resolutionNotes: readString(formData, "resolutionNotes"),
    estimatedTotal: readString(formData, "estimatedTotal"),
    finalTotal: readString(formData, "finalTotal"),
    dueAt: readString(formData, "dueAt"),
    status,
    supplierId: readString(formData, "supplierId"),
    supplierName: readString(formData, "supplierName"),
    partName: readString(formData, "partName"),
    partCost: readString(formData, "partCost"),
    deductPartCost: readCheckbox(formData, "deductPartCost"),
    supplierNotes: readString(formData, "supplierNotes"),
    items: readItems(formData),
    redirectTo: readString(formData, "redirectTo") || undefined,
  });

  const auth = await requirePermission("repairs:update");
  if (input.items && input.items.some((i) => Boolean(i.inventoryItemId))) {
    await requirePermission("inventory:use_parts");
  }

  await repairOrderService.updateRepairOrderDetails(
    auth.shop.id,
    input.repairOrderId,
    auth.user.id,
    input,
  );

  revalidatePath("/repair-orders");
  revalidatePath(`/repair-orders/${input.repairOrderId}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
}

export async function updateRepairOrderStatusAction(formData: FormData) {
  const input = updateRepairOrderStatusSchema.parse({
    repairOrderId: readString(formData, "repairOrderId"),
    status: readString(formData, "status"),
    note: readString(formData, "note"),
  });

  const auth = await requirePermission("repairs:update_status");

  await repairOrderService.updateRepairOrderStatus(
    auth.shop.id,
    input.repairOrderId,
    auth.user.id,
    {
      status: input.status,
      note: input.note,
    },
  );

  revalidatePath("/repair-orders");
  revalidatePath(`/repair-orders/${input.repairOrderId}`);
  revalidatePath("/dashboard");
}

const deleteRepairOrderSchema = z.object({
  repairOrderId: z.string().uuid("معرف طلب الصيانة غير صحيح"),
});

export async function deleteRepairOrderAction(formData: FormData) {
  const parsed = deleteRepairOrderSchema.parse({
    repairOrderId: readString(formData, "repairOrderId"),
  });

  const auth = await requirePermission("repairs:delete");

  await repairOrderService.deleteRepairOrder(
    auth.shop.id,
    parsed.repairOrderId,
    auth.user.id
  );

  revalidatePath("/repair-orders");
  revalidatePath("/dashboard");
  redirect("/repair-orders");
}
