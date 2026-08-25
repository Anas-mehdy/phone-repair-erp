"use server";

import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/context";
import { invoiceService } from "@/lib/services/invoiceService";
import { paymentService } from "@/lib/services/paymentService";

const createFromRepairSchema = z.object({
  repairOrderId: z.string().uuid(),
});

const createFromSaleSchema = z.object({
  saleId: z.string().uuid(),
});

const addPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z
    .string()
    .trim()
    .min(1, "قيمة الدفعة مطلوبة")
    .refine((value) => Number(value.replace(",", ".")) > 0, {
      message: "قيمة الدفعة يجب أن تكون أكبر من صفر",
    }),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  note: z.string().optional(),
  paidAt: z.string().optional(),
});

const voidInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
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

export async function createInvoiceFromRepairOrderAction(formData: FormData) {
  const input = createFromRepairSchema.parse({
    repairOrderId: readString(formData, "repairOrderId"),
  });
  let redirectTo = `/repair-orders/${input.repairOrderId}`;

  try {
    const auth = await requirePermission("repairs:update");
    const invoice = await invoiceService.createInvoiceFromRepairOrder(
      auth.shop.id,
      input.repairOrderId,
      auth.user.id,
    );
    redirectTo = `/invoices/${invoice.id}`;
    revalidatePath("/invoices");
    revalidatePath(`/repair-orders/${input.repairOrderId}`);
  } catch (error) {
    redirectTo = `/repair-orders/${input.repairOrderId}?invoiceError=${encodeURIComponent(
      getErrorMessage(error),
    )}`;
  }

  redirect(redirectTo);
}

export async function createInvoiceFromSaleAction(formData: FormData) {
  const input = createFromSaleSchema.parse({
    saleId: readString(formData, "saleId"),
  });
  let redirectTo = `/sales/${input.saleId}`;

  try {
    const auth = await requirePermission("sales:create");
    const invoice = await invoiceService.createInvoiceFromSale(
      auth.shop.id,
      input.saleId,
      auth.user.id,
    );
    redirectTo = `/invoices/${invoice.id}`;
    revalidatePath("/invoices");
    revalidatePath(`/sales/${input.saleId}`);
  } catch (error) {
    redirectTo = `/sales/${input.saleId}?invoiceError=${encodeURIComponent(
      getErrorMessage(error),
    )}`;
  }

  redirect(redirectTo);
}

export async function addPaymentAction(formData: FormData) {
  const input = addPaymentSchema.parse({
    invoiceId: readString(formData, "invoiceId"),
    amount: readString(formData, "amount"),
    method: readString(formData, "method"),
    reference: readString(formData, "reference"),
    note: readString(formData, "note"),
    paidAt: readString(formData, "paidAt"),
  });

  try {
    const auth = await requirePermission("invoices:pay");
    await paymentService.addPayment(auth.shop.id, input.invoiceId, auth.user.id, {
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      note: input.note,
      paidAt: input.paidAt,
    });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${input.invoiceId}`);
    revalidatePath("/dashboard");
    revalidatePath("/customers");
  } catch (error) {
    redirect(`/invoices/${input.invoiceId}?paymentError=${encodeURIComponent(
      getErrorMessage(error),
    )}`);
  }
}

export async function voidInvoiceAction(formData: FormData) {
  const input = voidInvoiceSchema.parse({
    invoiceId: readString(formData, "invoiceId"),
  });

  try {
    const auth = await requirePermission("invoices:void");
    await invoiceService.voidInvoice(auth.shop.id, input.invoiceId, auth.user.id);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${input.invoiceId}`);
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(`/invoices/${input.invoiceId}?invoiceError=${encodeURIComponent(
      getErrorMessage(error),
    )}`);
  }
}
