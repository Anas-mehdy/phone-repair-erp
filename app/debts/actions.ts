"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { customerService } from "@/lib/services/customerService";
import {
  createDebtEntry,
  recordDebtPayment,
  updateDebtLedgerEntry,
} from "@/lib/services/debtLedgerService";

export type DebtActionResult = { success: true } | { success: false; error: string };
export type CreateDebtCustomerResult =
  | { success: true; customer: { id: string; name: string; phone: string | null } }
  | { success: false; error: string };

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

export async function createDebtCustomerAction(input: {
  name: string;
  phone?: string | null;
  email?: string | null;
}): Promise<CreateDebtCustomerResult> {
  try {
    const auth = await requirePermission("debts:manage");
    const customer = await customerService.createCustomer(auth.shop.id, {
      name: input.name,
      phone: input.phone,
      email: input.email,
      notes: "تمت إضافة العميل من دفتر الديون",
    });

    revalidatePath("/customers");
    revalidatePath("/debts");
    return {
      success: true,
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
    };
  } catch (error) {
    return { success: false, error: messageFromError(error) };
  }
}

export async function createDebtAction(input: {
  customerId: string;
  amount: number;
  type?: "DEBT" | "OPENING_BALANCE";
  occurredAt?: string | null;
  dueAt?: string | null;
  description?: string | null;
  reference?: string | null;
}): Promise<DebtActionResult> {
  try {
    await createDebtEntry(input);
    revalidatePath("/debts");
    revalidatePath(`/debts/${input.customerId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: messageFromError(error) };
  }
}

export async function recordDebtPaymentAction(input: {
  customerId: string;
  amount: number;
  occurredAt?: string | null;
  sourceOptionId?: string;
  customSourceName?: string | null;
  saveCustomSource?: boolean;
  description?: string | null;
  reference?: string | null;
}): Promise<DebtActionResult> {
  try {
    await recordDebtPayment(input);
    revalidatePath("/debts");
    revalidatePath(`/debts/${input.customerId}`);
    revalidatePath(`/debts/${input.customerId}/print`);
    return { success: true };
  } catch (error) {
    return { success: false, error: messageFromError(error) };
  }
}

export async function updateDebtLedgerEntryAction(input: {
  customerId: string;
  entryId: string;
  amount: number;
  occurredAt?: string | null;
  dueAt?: string | null;
  sourceOptionId?: string;
  customSourceName?: string | null;
  saveCustomSource?: boolean;
  description?: string | null;
  reference?: string | null;
}): Promise<DebtActionResult> {
  try {
    await updateDebtLedgerEntry(input);
    revalidatePath("/debts");
    revalidatePath(`/debts/${input.customerId}`);
    revalidatePath(`/debts/${input.customerId}/print`);
    return { success: true };
  } catch (error) {
    return { success: false, error: messageFromError(error) };
  }
}

export async function deleteDebtLedgerAction(customerId: string): Promise<DebtActionResult> {
  try {
    const auth = await requirePermission("debts:manage");

    const deleted = await prisma.$queryRaw<Array<{ id: string }>>`
      DELETE FROM "DebtLedgerAccount"
      WHERE "shopId" = ${auth.shop.id}::uuid
        AND "customerId" = ${customerId}::uuid
      RETURNING "id"
    `;

    if (deleted.length === 0) {
      return { success: false, error: "دفتر الدين غير موجود أو تم حذفه مسبقاً." };
    }

    revalidatePath("/debts");
    revalidatePath(`/debts/${customerId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: messageFromError(error) };
  }
}
