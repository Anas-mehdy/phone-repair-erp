import { InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AddPaymentInput = {
  amount: string;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  paidAt?: string;
};

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(String(value).replace(",", "."));
}

function dateOrNow(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return new Date();
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const date = new Date(year, month, day);

    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function recalculateInvoicePaymentState(
  tx: Prisma.TransactionClient,
  shopId: string,
  invoiceId: string,
) {
  const invoice = await tx.invoice.findFirst({
    where: {
      id: invoiceId,
      shopId,
      deletedAt: null,
    },
  });

  if (!invoice) {
    throw new Error("الفاتورة غير موجودة.");
  }

  const payments = await tx.payment.findMany({
    where: {
      shopId,
      invoiceId,
      deletedAt: null,
    },
    select: {
      amount: true,
    },
  });

  const amountPaid = payments.reduce(
    (sum, payment) => sum.add(payment.amount),
    new Prisma.Decimal(0),
  );
  const balanceDue = invoice.total.sub(amountPaid);

  let status: InvoiceStatus = InvoiceStatus.UNPAID;
  let paidAt: Date | null = null;

  if (amountPaid.gt(0) && balanceDue.gt(0)) {
    status = InvoiceStatus.PARTIALLY_PAID;
  }

  if (balanceDue.lte(0)) {
    status = InvoiceStatus.PAID;
    paidAt = invoice.paidAt ?? new Date();
  }

  return tx.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      amountPaid,
      balanceDue,
      status,
      paidAt,
      version: {
        increment: 1,
      },
    },
  });
}

export async function addPayment(
  shopId: string,
  invoiceId: string,
  createdByUserId: string | null,
  input: AddPaymentInput,
) {
  const amount = decimal(input.amount);

  if (amount.lte(0)) {
    throw new Error("قيمة الدفعة يجب أن تكون أكبر من صفر.");
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      shopId,
      deletedAt: null,
    },
  });

  if (!invoice) {
    throw new Error("الفاتورة غير موجودة.");
  }

  if (invoice.status === InvoiceStatus.VOID) {
    throw new Error("لا يمكن إضافة دفعة على فاتورة ملغاة.");
  }

  if (amount.gt(invoice.balanceDue)) {
    throw new Error("قيمة الدفعة أكبر من الرصيد المتبقي.");
  }

  const newAmountPaid = invoice.amountPaid.add(amount);
  const newBalanceDue = invoice.total.sub(newAmountPaid);

  let newStatus: InvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
  let paidAt: Date | null = invoice.paidAt;

  if (newBalanceDue.lte(0)) {
    newStatus = InvoiceStatus.PAID;
    paidAt = paidAt ?? new Date();
  }

  const [, updatedInvoice] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        shopId,
        invoiceId,
        createdByUserId,
        method: input.method,
        amount,
        reference: emptyToNull(input.reference),
        note: emptyToNull(input.note),
        paidAt: dateOrNow(input.paidAt),
      },
    }),
    prisma.invoice.update({
      where: {
        id: invoiceId,
      },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        paidAt,
        version: {
          increment: 1,
        },
      },
    }),
  ]);

  return updatedInvoice;
}

export const paymentService = {
  addPayment,
  recalculateInvoicePaymentState,
};
