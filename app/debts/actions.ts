"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
import { createDebtEntry, recordDebtPayment } from "@/lib/services/debtLedgerService";

export type DebtActionResult = { success: true } | { success: false; error: string };

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع. حاول مرة أخرى.";
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
  paymentMethod?: string | null;
  description?: string | null;
  reference?: string | null;
}): Promise<DebtActionResult> {
  try {
    await recordDebtPayment(input);
    revalidatePath("/debts");
    revalidatePath(`/debts/${input.customerId}`);
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
