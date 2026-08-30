"use server";

import { revalidatePath } from "next/cache";
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
