import {
  InvoiceStatus,
  InvoiceType,
  RepairStatus,
  type Payment,
} from "@prisma/client";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type WhatsAppShareResult =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      message: string;
    };

export function normalizePhoneForWhatsApp(phone: string): string | null {
  const cleaned = phone.trim().replace(/[\s\-()+]/g, "");
  const withoutInternationalPrefix = cleaned.startsWith("00")
    ? cleaned.slice(2)
    : cleaned;
  const digits = withoutInternationalPrefix.replace(/\D/g, "");

  if (digits.length < 8) {
    return null;
  }

  return digits;
}

export function buildWaMeLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function phoneFromCustomer(
  customer: { phone?: string | null; phoneNormalized?: string | null } | null,
) {
  if (!customer) {
    return null;
  }

  const preferred = customer.phoneNormalized ?? customer.phone;
  return preferred ? normalizePhoneForWhatsApp(preferred) : null;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getInvoiceStatusLabel(status: InvoiceStatus) {
  const labels: Record<InvoiceStatus, string> = {
    UNPAID: "غير مدفوعة",
    PARTIALLY_PAID: "مدفوعة جزئياً",
    PAID: "مدفوعة",
    VOID: "ملغاة",
  };

  return labels[status];
}

function getInvoiceTypeLabel(type: InvoiceType) {
  const labels: Record<InvoiceType, string> = {
    REPAIR: "صيانة",
    SALE: "بيع",
    MANUAL: "يدوية",
  };

  return labels[type];
}

function getRepairStatusLabel(status: RepairStatus) {
  const labels: Record<RepairStatus, string> = {
    PENDING: "قيد الانتظار",
    DIAGNOSING: "قيد التشخيص",
    REPAIRING: "قيد الإصلاح",
    WAITING_PARTS: "بانتظار القطع",
    DONE: "جاهز للتسليم",
    DELIVERED: "تم التسليم",
    CANCELLED: "ملغي",
  };

  return labels[status];
}

function buildPaymentSummary(payments: Payment[]) {
  if (payments.length === 0) {
    return "لا توجد دفعات مسجلة بعد.";
  }

  return `عدد الدفعات: ${payments.length}`;
}

export async function buildInvoiceShareLink(
  shopId: string,
  invoiceId: string,
): Promise<WhatsAppShareResult> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      shopId,
      deletedAt: null,
    },
    include: {
      customer: true,
      shop: true,
      payments: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  if (!invoice) {
    return {
      ok: false,
      message: "الفاتورة غير موجودة.",
    };
  }

  const phone = phoneFromCustomer(invoice.customer);

  if (!invoice.customer || !phone) {
    return {
      ok: false,
      message: "لا يوجد رقم واتساب لهذا العميل",
    };
  }

  const message = [
    `مرحباً ${invoice.customer.name},`,
    `فاتورتك من ${invoice.shop.name}`,
    `رقم الفاتورة: ${invoice.invoiceNumber}`,
    `نوع الفاتورة: ${getInvoiceTypeLabel(invoice.type)}`,
    `الإجمالي: ${formatCurrency(invoice.total)}`,
    `المدفوع: ${formatCurrency(invoice.amountPaid)}`,
    `المتبقي: ${formatCurrency(invoice.balanceDue)}`,
    `الحالة: ${getInvoiceStatusLabel(invoice.status)}`,
    `ملخص الدفع: ${buildPaymentSummary(invoice.payments)}`,
    "شكراً لتعاملكم معنا.",
  ].join("\n");

  return {
    ok: true,
    url: buildWaMeLink(phone, message),
  };
}

export async function buildRepairUpdateShareLink(
  shopId: string,
  repairOrderId: string,
): Promise<WhatsAppShareResult> {
  const repairOrder = await prisma.repairOrder.findFirst({
    where: {
      id: repairOrderId,
      shopId,
      deletedAt: null,
    },
    include: {
      customer: true,
      shop: true,
    },
  });

  if (!repairOrder) {
    return {
      ok: false,
      message: "طلب الصيانة غير موجود.",
    };
  }

  const phone = phoneFromCustomer(repairOrder.customer);

  if (!repairOrder.customer || !phone) {
    return {
      ok: false,
      message: "لا يوجد رقم واتساب لهذا العميل",
    };
  }

  const device =
    [repairOrder.deviceBrand, repairOrder.deviceModel].filter(Boolean).join(" ") ||
    "-";
  const status = getRepairStatusLabel(repairOrder.status);

  const message = [
    `مرحباً ${repairOrder.customer.name},`,
    `تحديث بخصوص جهازك لدى ${repairOrder.shop.name}`,
    `رقم الطلب: ${repairOrder.ticketNumber}`,
    `الجهاز: ${device}`,
    `الحالة الحالية: ${status}`,
    `ملاحظة: طلب الصيانة الآن ${status}.`,
    "شكراً لتعاملكم معنا.",
  ].join("\n");

  return {
    ok: true,
    url: buildWaMeLink(phone, message),
  };
}

export async function buildSaleReceiptShareLink(
  shopId: string,
  saleId: string,
): Promise<WhatsAppShareResult> {
  const sale = await prisma.sale.findFirst({
    where: {
      id: saleId,
      shopId,
      deletedAt: null,
    },
    include: {
      customer: true,
      shop: true,
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!sale) {
    return {
      ok: false,
      message: "عملية البيع غير موجودة.",
    };
  }

  const phone = phoneFromCustomer(sale.customer);

  if (!sale.customer || !phone) {
    return {
      ok: false,
      message: "لا يوجد رقم واتساب لهذا العميل",
    };
  }

  const itemSummary = sale.items
    .slice(0, 5)
    .map((item) => `- ${item.description} × ${item.quantity}`)
    .join("\n");

  const message = [
    `مرحباً ${sale.customer.name},`,
    `إيصالك من ${sale.shop.name}`,
    `رقم الإيصال: ${sale.receiptNumber ?? "-"}`,
    `تاريخ البيع: ${formatDate(sale.soldAt)}`,
    `الإجمالي: ${formatCurrency(sale.total)}`,
    itemSummary ? `البنود:\n${itemSummary}` : "",
    "شكراً لتعاملكم معنا.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    ok: true,
    url: buildWaMeLink(phone, message),
  };
}

export const whatsappService = {
  normalizePhoneForWhatsApp,
  buildWaMeLink,
  buildInvoiceShareLink,
  buildRepairUpdateShareLink,
  buildSaleReceiptShareLink,
};
