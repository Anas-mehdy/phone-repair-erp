"use server";

import { RepairStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentShopContext } from "@/lib/current-shop";
import { repairOrderService } from "@/lib/services/repairOrderService";

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
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  partName: z.string().optional(),
  partCost: z.string().optional(),
  deductPartCost: z.boolean().optional(),
  supplierNotes: z.string().optional(),
});

const updateRepairOrderDetailsSchema = z.object({
  repairOrderId: z.string().uuid(),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceSerial: z.string().optional(),
  reportedIssue: z.string().trim().min(1, "وصف المشكلة مطلوب"),
  diagnosis: z.string().optional(),
  resolutionNotes: z.string().optional(),
  estimatedTotal: z.string().optional(),
  finalTotal: z.string().optional(),
  dueAt: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  partName: z.string().optional(),
  partCost: z.string().optional(),
  deductPartCost: z.boolean().optional(),
  supplierNotes: z.string().optional(),
});

const updateRepairOrderStatusSchema = z.object({
  repairOrderId: z.string().uuid(),
  status: z.nativeEnum(RepairStatus),
  note: z.string().optional(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readCheckbox(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
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
    supplierId: readString(formData, "supplierId"),
    supplierName: readString(formData, "supplierName"),
    partName: readString(formData, "partName"),
    partCost: readString(formData, "partCost"),
    deductPartCost: readCheckbox(formData, "deductPartCost"),
    supplierNotes: readString(formData, "supplierNotes"),
  });

  const { shopId, userId } = await getCurrentShopContext();
  const repairOrder = await repairOrderService.createRepairOrder(
    shopId,
    userId,
    input,
  );

  revalidatePath("/repair-orders");
  redirect(`/repair-orders/${repairOrder.id}`);
}

export async function updateRepairOrderDetailsAction(formData: FormData) {
  const input = updateRepairOrderDetailsSchema.parse({
    repairOrderId: readString(formData, "repairOrderId"),
    deviceBrand: readString(formData, "deviceBrand"),
    deviceModel: readString(formData, "deviceModel"),
    deviceSerial: readString(formData, "deviceSerial"),
    reportedIssue: readString(formData, "reportedIssue"),
    diagnosis: readString(formData, "diagnosis"),
    resolutionNotes: readString(formData, "resolutionNotes"),
    estimatedTotal: readString(formData, "estimatedTotal"),
    finalTotal: readString(formData, "finalTotal"),
    dueAt: readString(formData, "dueAt"),
    supplierId: readString(formData, "supplierId"),
    supplierName: readString(formData, "supplierName"),
    partName: readString(formData, "partName"),
    partCost: readString(formData, "partCost"),
    deductPartCost: readCheckbox(formData, "deductPartCost"),
    supplierNotes: readString(formData, "supplierNotes"),
  });

  const { shopId } = await getCurrentShopContext();

  await repairOrderService.updateRepairOrderDetails(
    shopId,
    input.repairOrderId,
    input,
  );

  revalidatePath("/repair-orders");
  revalidatePath(`/repair-orders/${input.repairOrderId}`);
  revalidatePath("/dashboard");
}

export async function updateRepairOrderStatusAction(formData: FormData) {
  const input = updateRepairOrderStatusSchema.parse({
    repairOrderId: readString(formData, "repairOrderId"),
    status: readString(formData, "status"),
    note: readString(formData, "note"),
  });

  const { shopId, userId } = await getCurrentShopContext();

  await repairOrderService.updateRepairOrderStatus(
    shopId,
    input.repairOrderId,
    userId,
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

  const { shopId } = await getCurrentShopContext();

  await repairOrderService.deleteRepairOrder(shopId, parsed.repairOrderId);

  revalidatePath("/repair-orders");
  revalidatePath("/dashboard");
  redirect("/repair-orders");
}

