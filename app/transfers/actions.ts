"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";
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

const balanceSchema = z.object({
  walletId: z.string().uuid("المحفظة غير صحيحة"),
  balance: z.string().trim().min(1, "أدخل الرصيد الجديد"),
});

export async function setWalletBalanceAction(formData: FormData) {
  let redirectTo = "/transfers";
  try {
    const input = balanceSchema.parse({
      walletId: readString(formData, "walletId"),
      balance: readString(formData, "balance"),
    });
    const balance = Number(input.balance.replace(",", "."));
    if (!Number.isFinite(balance) || balance < 0) throw new Error("الرصيد يجب أن يكون صفراً أو أكبر.");
    const auth = await requirePermission("sales:create");
    const updated = await prisma.$executeRaw`
      UPDATE "FinancialWallet"
      SET "currentBalance" = ${balance}, "updatedAt" = NOW()
      WHERE "id" = ${input.walletId}::uuid
        AND "shopId" = ${auth.shop.id}::uuid
        AND "deletedAt" IS NULL
        AND "isActive" = TRUE
    `;
    if (!updated) throw new Error("المحفظة غير موجودة.");
    revalidatePath("/transfers");
    redirectTo = "/transfers?balanceUpdated=1";
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
  commissionMode: z.enum(["DEDUCTED", "ADDED", "NONE"]).optional(),
  isDeferred: z.boolean().optional(),
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
      commissionMode: readString(formData, "commissionMode") || undefined,
      isDeferred: readString(formData, "isDeferred") === "on",
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
    revalidatePath("/debts");
    if (input.customerId) revalidatePath(`/debts/${input.customerId}`);
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
    revalidatePath("/debts");
    redirectTo = "/transfers?voided=1";
  } catch (error) {
    redirectTo = `/transfers?error=${encodeURIComponent(errorMessage(error))}`;
  }
  redirect(redirectTo);
}
