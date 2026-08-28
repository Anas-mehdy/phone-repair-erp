import { randomBytes } from "node:crypto";
import {
  InstallmentFrequency,
  InstallmentPlanSource,
  InstallmentPlanStatus,
  InstallmentScheduleStatus,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizePhone } from "./customerService";
import { resolvePaymentSource, type PaymentSourceInput } from "./paymentSourceService";

export type CreateInstallmentPlanInput = {
  clientGeneratedId?: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  title: string;
  notes?: string;
  totalAmount: string;
  downPayment?: string;
  downPaymentMethod?: PaymentMethod;
  installmentCount: number;
  frequency: InstallmentFrequency;
  firstDueAt: string;
};

export type AddInstallmentPaymentInput = PaymentSourceInput & {
  clientGeneratedId?: string;
  amount: string;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  paidAt?: string;
};

export type UpdateInstallmentPlanInput = {
  title: string;
  notes?: string;
  totalAmount: string;
  installmentCount: number;
  frequency: InstallmentFrequency;
  firstDueAt: string;
};

const planInclude = {
  customer: true,
  invoice: { select: { id: true, invoiceNumber: true, balanceDue: true, status: true } },
  schedules: { orderBy: { installmentNo: "asc" as const } },
  payments: {
    where: { voidedAt: null },
    orderBy: { paidAt: "desc" as const },
    include: { allocations: true },
  },
} satisfies Prisma.InstallmentPlanInclude;

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function cents(value: string | number | Prisma.Decimal) {
  const normalized = String(value).trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("المبلغ غير صحيح.");
  return Math.round(Number(normalized) * 100);
}

function money(valueInCents: number) {
  return new Prisma.Decimal(valueInCents).div(100);
}

function parseDate(value: string, label: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) {
    throw new Error(`${label} غير صحيح.`);
  }
  return date;
}

function paidDate(value?: string) {
  return value?.trim() ? parseDate(value.trim(), "تاريخ الدفع") : new Date();
}

function dueDate(firstDueAt: Date, frequency: InstallmentFrequency, index: number) {
  const result = new Date(firstDueAt);
  if (frequency === InstallmentFrequency.WEEKLY) {
    result.setUTCDate(result.getUTCDate() + index * 7);
    return result;
  }

  const originalDay = firstDueAt.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + index);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export function buildInstallmentSchedule(
  financedCents: number,
  count: number,
  firstDueAt: Date,
  frequency: InstallmentFrequency,
) {
  if (!Number.isInteger(count) || count < 1 || count > 120) {
    throw new Error("عدد الأقساط يجب أن يكون بين 1 و120.");
  }
  if (financedCents < count) throw new Error("عدد الأقساط أكبر من المبلغ القابل للتقسيم.");

  const base = Math.floor(financedCents / count);
  const remainder = financedCents - base * count;
  return Array.from({ length: count }, (_, index) => ({
    installmentNo: index + 1,
    dueAt: dueDate(firstDueAt, frequency, index),
    amount: money(base + (index === count - 1 ? remainder : 0)),
  }));
}

function planNumber() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `INS-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createPlan(shopId: string, createdByUserId: string, input: CreateInstallmentPlanInput) {
  if (input.clientGeneratedId) {
    const existing = await prisma.installmentPlan.findUnique({
      where: { shopId_clientGeneratedId: { shopId, clientGeneratedId: input.clientGeneratedId } },
      include: planInclude,
    });
    if (existing) return existing;
  }

  const firstDueAt = parseDate(input.firstDueAt, "تاريخ أول قسط");
  const downCents = cents(input.downPayment || "0");
  let totalCents = cents(input.totalAmount);

  return prisma.$transaction(async (tx) => {
    let customerId = input.customerId?.trim() || "";
    let invoiceId: string | null = null;
    let source: InstallmentPlanSource = InstallmentPlanSource.MANUAL;

    if (input.invoiceId) {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${input.invoiceId}::uuid AND "shopId" = ${shopId}::uuid FOR UPDATE`;
      const invoice = await tx.invoice.findFirst({
        where: { id: input.invoiceId, shopId, deletedAt: null, status: { not: InvoiceStatus.VOID } },
        include: { installmentPlan: { select: { id: true } } },
      });
      if (!invoice) throw new Error("الفاتورة غير موجودة.");
      if (invoice.installmentPlan) throw new Error("توجد خطة أقساط لهذه الفاتورة مسبقاً.");
      if (!invoice.customerId) throw new Error("يجب ربط الفاتورة بعميل قبل تقسيطها.");
      if (downCents !== 0) throw new Error("سجّل الدفعة الأولى على الفاتورة قبل إنشاء الخطة.");
      totalCents = cents(invoice.balanceDue);
      if (totalCents <= 0) throw new Error("لا يوجد رصيد متبقٍ على الفاتورة.");
      customerId = invoice.customerId;
      invoiceId = invoice.id;
      source = InstallmentPlanSource.INVOICE;
    } else if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, shopId, deletedAt: null } });
      if (!customer) throw new Error("العميل غير موجود.");
    } else {
      const customerName = input.customerName?.trim();
      if (!customerName) throw new Error("اسم العميل مطلوب.");
      const phone = emptyToNull(input.customerPhone);
      const customer = await tx.customer.create({
        data: { shopId, name: customerName, phone, phoneNormalized: normalizePhone(phone) },
      });
      customerId = customer.id;
    }

    if (totalCents <= 0) throw new Error("المبلغ الإجمالي يجب أن يكون أكبر من صفر.");
    if (downCents < 0 || downCents >= totalCents) throw new Error("الدفعة الأولى يجب أن تكون أقل من المبلغ الإجمالي.");
    const financedCents = totalCents - downCents;
    const schedules = buildInstallmentSchedule(financedCents, input.installmentCount, firstDueAt, input.frequency);

    const plan = await tx.installmentPlan.create({
      data: {
        shopId,
        customerId,
        invoiceId,
        createdByUserId,
        clientGeneratedId: emptyToNull(input.clientGeneratedId),
        planNumber: planNumber(),
        source,
        title: input.title.trim(),
        notes: emptyToNull(input.notes),
        totalAmount: money(totalCents),
        downPayment: money(downCents),
        financedAmount: money(financedCents),
        amountPaid: money(downCents),
        balanceDue: money(financedCents),
        installmentCount: input.installmentCount,
        frequency: input.frequency,
        firstDueAt,
        schedules: { create: schedules },
        ...(downCents > 0 ? {
          payments: { create: {
            shopId,
            createdByUserId,
            amount: money(downCents),
            method: input.downPaymentMethod || PaymentMethod.CASH,
            isDownPayment: true,
            note: "الدفعة الأولى عند إنشاء الخطة",
          } },
        } : {}),
      },
      include: planInclude,
    });
    return plan;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });
}

export async function addPayment(
  shopId: string,
  planId: string,
  createdByUserId: string,
  input: AddInstallmentPaymentInput,
) {
  if (input.clientGeneratedId) {
    const existing = await prisma.installmentPayment.findUnique({
      where: { shopId_clientGeneratedId: { shopId, clientGeneratedId: input.clientGeneratedId } },
      select: { planId: true },
    });
    if (existing) return getPlanById(shopId, existing.planId);
  }

  const paymentCents = cents(input.amount);
  if (paymentCents <= 0) throw new Error("قيمة الدفعة يجب أن تكون أكبر من صفر.");

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "InstallmentPlan" WHERE id = ${planId}::uuid AND "shopId" = ${shopId}::uuid FOR UPDATE`;
    const plan = await tx.installmentPlan.findFirst({
      where: { id: planId, shopId, deletedAt: null },
      include: { schedules: { orderBy: [{ dueAt: "asc" }, { installmentNo: "asc" }] } },
    });
    if (!plan) throw new Error("خطة الأقساط غير موجودة.");
    if (plan.status !== InstallmentPlanStatus.ACTIVE) throw new Error("لا يمكن تسجيل دفعة على خطة غير نشطة.");
    if (paymentCents > cents(plan.balanceDue)) throw new Error("قيمة الدفعة أكبر من الرصيد المتبقي.");

    const sourceName = await resolvePaymentSource(tx, shopId, input);

    const payment = await tx.installmentPayment.create({
      data: {
        shopId,
        planId,
        createdByUserId,
        clientGeneratedId: emptyToNull(input.clientGeneratedId),
        amount: money(paymentCents),
        method: input.method,
        sourceName,
        reference: emptyToNull(input.reference),
        note: emptyToNull(input.note),
        paidAt: paidDate(input.paidAt),
      },
    });

    let remaining = paymentCents;
    for (const schedule of plan.schedules) {
      if (remaining <= 0 || schedule.status === InstallmentScheduleStatus.PAID) continue;
      const outstanding = cents(schedule.amount) - cents(schedule.amountPaid);
      const allocated = Math.min(remaining, outstanding);
      if (allocated <= 0) continue;
      const newPaid = cents(schedule.amountPaid) + allocated;
      await tx.installmentPaymentAllocation.create({
        data: { paymentId: payment.id, installmentId: schedule.id, amount: money(allocated) },
      });
      await tx.installmentSchedule.update({
        where: { id: schedule.id },
        data: {
          amountPaid: money(newPaid),
          status: newPaid >= cents(schedule.amount)
            ? InstallmentScheduleStatus.PAID
            : InstallmentScheduleStatus.PARTIALLY_PAID,
          paidAt: newPaid >= cents(schedule.amount) ? paidDate(input.paidAt) : null,
        },
      });
      remaining -= allocated;
    }
    if (remaining !== 0) throw new Error("تعذر توزيع كامل الدفعة على الأقساط.");

    const newAmountPaid = cents(plan.amountPaid) + paymentCents;
    const newBalance = cents(plan.totalAmount) - newAmountPaid;
    await tx.installmentPlan.update({
      where: { id: plan.id },
      data: {
        amountPaid: money(newAmountPaid),
        balanceDue: money(newBalance),
        status: newBalance === 0 ? InstallmentPlanStatus.COMPLETED : InstallmentPlanStatus.ACTIVE,
        completedAt: newBalance === 0 ? new Date() : null,
        version: { increment: 1 },
      },
    });

    if (plan.invoiceId) {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${plan.invoiceId}::uuid AND "shopId" = ${shopId}::uuid FOR UPDATE`;
      const invoice = await tx.invoice.findFirst({ where: { id: plan.invoiceId, shopId, deletedAt: null } });
      if (!invoice || invoice.status === InvoiceStatus.VOID) throw new Error("الفاتورة المرتبطة غير صالحة.");
      if (paymentCents > cents(invoice.balanceDue)) throw new Error("الدفعة أكبر من رصيد الفاتورة.");
      const invoicePaid = cents(invoice.amountPaid) + paymentCents;
      const invoiceBalance = cents(invoice.total) - invoicePaid;
      await tx.payment.create({
        data: {
          shopId,
          invoiceId: invoice.id,
          createdByUserId,
          clientGeneratedId: input.clientGeneratedId ? `installment:${input.clientGeneratedId}` : null,
          amount: money(paymentCents),
          method: input.method,
          sourceName,
          reference: emptyToNull(input.reference) || plan.planNumber,
          note: emptyToNull(input.note) || `دفعة أقساط ${plan.planNumber}`,
          paidAt: paidDate(input.paidAt),
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: money(invoicePaid),
          balanceDue: money(invoiceBalance),
          status: invoiceBalance === 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
          paidAt: invoiceBalance === 0 ? new Date() : null,
          version: { increment: 1 },
        },
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });

  return getPlanById(shopId, planId);
}

export async function updatePlan(
  shopId: string,
  planId: string,
  input: UpdateInstallmentPlanInput,
) {
  const firstDueAt = parseDate(input.firstDueAt, "تاريخ أول قسط");
  const requestedTotalCents = cents(input.totalAmount);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "InstallmentPlan" WHERE id = ${planId}::uuid AND "shopId" = ${shopId}::uuid FOR UPDATE`;
    const plan = await tx.installmentPlan.findFirst({
      where: { id: planId, shopId, deletedAt: null },
      include: {
        payments: { where: { voidedAt: null }, select: { isDownPayment: true } },
      },
    });
    if (!plan) throw new Error("خطة الأقساط غير موجودة.");

    const currentTotalCents = cents(plan.totalAmount);
    const downPaymentCents = cents(plan.downPayment);
    const structureChanged =
      requestedTotalCents !== currentTotalCents ||
      input.installmentCount !== plan.installmentCount ||
      input.frequency !== plan.frequency ||
      firstDueAt.toISOString().slice(0, 10) !== plan.firstDueAt.toISOString().slice(0, 10);
    const hasCollectedInstallments = plan.payments.some((payment) => !payment.isDownPayment);

    if (plan.invoiceId && requestedTotalCents !== currentTotalCents) {
      throw new Error("لا يمكن تغيير مبلغ خطة مرتبطة بفاتورة؛ يمكن تعديل الجدول والوصف فقط.");
    }
    if (hasCollectedInstallments && structureChanged) {
      throw new Error("بعد تسجيل دفعة يمكن تعديل الوصف والملاحظات فقط، حفاظاً على السجل المالي.");
    }

    if (structureChanged) {
      if (requestedTotalCents <= downPaymentCents) {
        throw new Error("المبلغ الإجمالي يجب أن يكون أكبر من الدفعة الأولى.");
      }
      const financedCents = requestedTotalCents - downPaymentCents;
      const schedules = buildInstallmentSchedule(
        financedCents,
        input.installmentCount,
        firstDueAt,
        input.frequency,
      );
      await tx.installmentSchedule.deleteMany({ where: { planId } });
      await tx.installmentSchedule.createMany({
        data: schedules.map((schedule) => ({ ...schedule, planId })),
      });
      await tx.installmentPlan.update({
        where: { id: planId },
        data: {
          title: input.title.trim(),
          notes: emptyToNull(input.notes),
          totalAmount: money(requestedTotalCents),
          financedAmount: money(financedCents),
          amountPaid: money(downPaymentCents),
          balanceDue: money(financedCents),
          installmentCount: input.installmentCount,
          frequency: input.frequency,
          firstDueAt,
          status: InstallmentPlanStatus.ACTIVE,
          completedAt: null,
          version: { increment: 1 },
        },
      });
    } else {
      await tx.installmentPlan.update({
        where: { id: planId },
        data: {
          title: input.title.trim(),
          notes: emptyToNull(input.notes),
          version: { increment: 1 },
        },
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 });
}

export async function softDeletePlan(shopId: string, planId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "InstallmentPlan" WHERE id = ${planId}::uuid AND "shopId" = ${shopId}::uuid FOR UPDATE`;
    const plan = await tx.installmentPlan.findFirst({
      where: { id: planId, shopId, deletedAt: null },
      include: { _count: { select: { payments: { where: { voidedAt: null } } } } },
    });
    if (!plan) throw new Error("خطة الأقساط غير موجودة.");
    if (plan._count.payments > 0) {
      throw new Error("لا يمكن حذف خطة سُجلت عليها دفعات. يمكنك الاحتفاظ بها كسجل مالي.");
    }

    return tx.installmentPlan.update({
      where: { id: planId },
      data: {
        deletedAt: new Date(),
        status: InstallmentPlanStatus.CANCELLED,
        publicAccessEnabled: false,
        invoiceId: null,
        version: { increment: 1 },
      },
    });
  });
}

export async function listPlans(shopId: string, search?: string) {
  const value = search?.trim();
  return prisma.installmentPlan.findMany({
    where: {
      shopId,
      deletedAt: null,
      ...(value ? { OR: [
        { planNumber: { contains: value, mode: "insensitive" } },
        { title: { contains: value, mode: "insensitive" } },
        { customer: { name: { contains: value, mode: "insensitive" } } },
        { customer: { phone: { contains: value, mode: "insensitive" } } },
      ] } : {}),
    },
    include: {
      customer: true,
      invoice: { select: { invoiceNumber: true } },
      schedules: { where: { status: { in: [InstallmentScheduleStatus.PENDING, InstallmentScheduleStatus.PARTIALLY_PAID] } }, orderBy: { dueAt: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function getPlanById(shopId: string, planId: string) {
  return prisma.installmentPlan.findFirst({ where: { id: planId, shopId, deletedAt: null }, include: planInclude });
}

export async function getCreationOptions(shopId: string) {
  const [customers, invoices] = await Promise.all([
    prisma.customer.findMany({ where: { shopId, deletedAt: null }, orderBy: { name: "asc" }, take: 300 }),
    prisma.invoice.findMany({
      where: { shopId, deletedAt: null, balanceDue: { gt: 0 }, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] }, installmentPlan: null, customerId: { not: null } },
      include: { customer: true }, orderBy: { issuedAt: "desc" }, take: 200,
    }),
  ]);
  return { customers, invoices };
}

export function rotatePublicLink(shopId: string, planId: string) {
  return prisma.installmentPlan.updateMany({
    where: { id: planId, shopId, deletedAt: null },
    data: { publicAccessEnabled: true, publicTokenVersion: { increment: 1 }, version: { increment: 1 } },
  });
}

export function getPublicPlan(planId: string, tokenVersion: number) {
  return prisma.installmentPlan.findFirst({
    where: { id: planId, publicTokenVersion: tokenVersion, publicAccessEnabled: true, deletedAt: null },
    include: {
      shop: { select: { name: true, phone: true, address: true, currency: true } },
      customer: { select: { name: true } },
      schedules: { orderBy: { installmentNo: "asc" } },
      payments: { where: { voidedAt: null }, select: { id: true, amount: true, method: true, sourceName: true, paidAt: true, isDownPayment: true }, orderBy: { paidAt: "desc" } },
    },
  });
}

export const installmentService = {
  createPlan,
  addPayment,
  updatePlan,
  softDeletePlan,
  listPlans,
  getPlanById,
  getCreationOptions,
  rotatePublicLink,
  getPublicPlan,
};
