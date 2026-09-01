"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { financialTransferService } from "@/lib/services/financialTransferService";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "البيانات غير صحيحة.";
  if (error instanceof Error) return error.message;
  return "حدث خطأ غير متوقع.";
}

const walletSchema = z.object({
  name: z.string().trim().min(1, "اسم المحفظة مطلوب").max(120),
  openingBalance: z.string().trim().optional(),
  monthlyLimit: z.string().trim().optional(),
  defaultDepositCommission: z.string().trim().optional(),
  defaultWithdrawalCommission: z.string().trim().optional(),
});

export async function createWalletAction(formData: FormData) {
  let redirectTo = "/transfers";
  try {
    const input = walletSchema.parse({
      name: readString(formData, "name"),
      openingBalance: readString(formData, "openingBalance"),
      monthlyLimit: readString(formData, "monthlyLimit"),
      defaultDepositCommission: readString(formData, "defaultDepositCommission"),
      defaultWithdrawalCommission: readString(formData, "defaultWithdrawalCommission"),
    });
    const auth = await requirePermission("sales:create");
    await financialTransferService.createWallet(auth.shop.id, input);
    revalidatePath("/transfers");
    redirectTo = "/transfers?walletSaved=1";
  } catch (error) {
    redirectTo = `/transfers?error=${encodeURIComponent(errorMessage(error))}`;
  }
  redirect(redirectTo);
}

const transferSchema = z.object({
  walletId: z.string().uuid("اختر محفظة صحيحة"),
  operationType: z.enum(["CUSTOMER_DEPOSIT", "CUSTOMER_WITHDRAWAL", "WALLET_TOPUP", "WALLET_WITHDRAWAL"]),
  amount: z.string().trim().min(1, "المبلغ مطلوب"),
  commission: z.string().trim().optional(),
  customerId: z.string().uuid().optional().or(z.literal("")),
  customerName: z.string().trim().max(120).optional(),
  customerPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createTransferAction(formData: FormData) {
  let redirectTo = "/transfers";
  try {
    const input = transferSchema.parse({
      walletId: readString(formData, "walletId"),
      operationType: readString(formData, "operationType"),
      amount: readString(formData, "amount"),
      commission: readString(formData, "commission"),
      customerId: readString(formData, "customerId"),
      customerName: readString(formData, "customerName"),
      customerPhone: readString(formData, "customerPhone"),
      notes: readString(formData, "notes"),
    });
    const auth = await requirePermission("sales:create");
    await financialTransferService.createTransfer(auth.shop.id, auth.user.id, {
      ...input,
      customerId: input.customerId || undefined,
    });
    revalidatePath("/transfers");
    revalidatePath("/reports");
    redirectTo = "/transfers?saved=1";
  } catch (error) {
    redirectTo = `/transfers?error=${encodeURIComponent(errorMessage(error))}`;
  }
  redirect(redirectTo);
}

export async function voidTransferAction(formData: FormData) {
  const id = readString(formData, "id");
  let redirectTo = "/transfers";
  try {
    const auth = await requirePermission("sales:create");
    await financialTransferService.voidTransfer(auth.shop.id, id, auth.user.id);
    revalidatePath("/transfers");
    revalidatePath("/reports");
    redirectTo = "/transfers?voided=1";
  } catch (error) {
    redirectTo = `/transfers?error=${encodeURIComponent(errorMessage(error))}`;
  }
  redirect(redirectTo);
}
