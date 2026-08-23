import {
  InvoiceStatus,
  InvoiceType,
  RepairStatus,
  type Payment,
} from "@prisma/client";
import { formatCurrency } from "@/lib/format";

export type WhatsAppShareResult =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      message: string;
    };

const CURRENCY_CALLING_CODES: Record<string, string> = {
  SAR: "966", // Saudi Arabia
  EGP: "20",  // Egypt
  TRY: "90",  // Turkey
  AED: "971", // UAE
  JOD: "962", // Jordan
  IQD: "964", // Iraq
  SYP: "963", // Syria
  KWD: "965", // Kuwait
  BHD: "973", // Bahrain
  OMR: "968", // Oman
  QAR: "974", // Qatar
  LBP: "961", // Lebanon
  YER: "967", // Yemen
  LYD: "218", // Libya
  TND: "216", // Tunisia
  DZD: "213", // Algeria
  MAD: "212", // Morocco
  SDG: "249", // Sudan
  MRU: "222", // Mauritania
  SOS: "252", // Somalia
  DJF: "253", // Djibouti
  KMF: "269", // Comoros
};

// Known international calling prefixes sorted by length descending
const KNOWN_CALLING_PREFIXES = Array.from(
  new Set([
    "966", "971", "965", "973", "968", "974", "964", "963", "961", "970", "967",
    "218", "216", "213", "212", "249", "222", "252", "253", "269", "962",
    "20", "90", "44", "49", "33", "39", "34", "31", "32", "41", "43", "46", "47", "48", "30",
    "1", "7",
  ])
).sort((a, b) => b.length - a.length);

export function normalizePhoneForWhatsApp(
  phone?: string | null,
  currency?: string,
): string | null {
  if (!phone) return null;
  const cleaned = phone.trim().replace(/[\s\-()+]/g, "");
  const withoutInternationalPrefix = cleaned.startsWith("00")
    ? cleaned.slice(2)
    : cleaned;
  let digits = withoutInternationalPrefix.replace(/\D/g, "");

  if (digits.length < 7) {
    return null;
  }

  // Handle common typo for Turkish numbers where '95...' is entered instead of '905...' (11 or 12 digits)
  if (digits.startsWith("95") && (digits.length === 11 || digits.length === 12)) {
    digits = "90" + digits.slice(1);
  }

  // Check if it already has a valid known international calling code prefix
  const matchedPrefix = KNOWN_CALLING_PREFIXES.find(
    (prefix) => digits.startsWith(prefix) && digits.length >= prefix.length + 7,
  );

  if (matchedPrefix) {
    // Already has an international calling code prefix
    return digits;
  }

  // If it does not have an international prefix, apply country code based on currency or local format
  const defaultCode = currency ? CURRENCY_CALLING_CODES[currency.toUpperCase()] : null;

  if (defaultCode) {
    const localDigits = digits.startsWith("0") ? digits.slice(1) : digits;
    return `${defaultCode}${localDigits}`;
  }

  // If no currency provided, check common local starting numbers
  if (digits.startsWith("0")) {
    const localDigits = digits.slice(1);
    // 010, 011, 012, 015 -> Egypt (+20)
    if (localDigits.startsWith("1") && localDigits.length === 10) {
      return `20${localDigits}`;
    }
    // 05X -> Saudi (+966) or Turkey (+90) or UAE (+971)
    if (localDigits.startsWith("5") && localDigits.length === 9) {
      return `966${localDigits}`;
    }
    if (localDigits.startsWith("5") && localDigits.length === 10) {
      return `90${localDigits}`;
    }
    // 07X -> Jordan (+962) or Iraq (+964)
    if (localDigits.startsWith("7") && localDigits.length === 9) {
      return `962${localDigits}`;
    }
    if (localDigits.startsWith("7") && localDigits.length === 10) {
      return `964${localDigits}`;
    }
    // 09X -> Syria (+963)
    if (localDigits.startsWith("9") && localDigits.length === 9) {
      return `963${localDigits}`;
    }
    return localDigits;
  }

  return digits;
}

export function buildWaMeLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function phoneFromCustomer(
  customer?: { phone?: string | null; phoneNormalized?: string | null } | null,
  currency?: string,
) {
  if (!customer) {
    return null;
  }

  const preferred = customer.phoneNormalized ?? customer.phone;
  return preferred ? normalizePhoneForWhatsApp(preferred, currency) : null;
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

// --- In-memory builders that take already-loaded data (no extra DB queries) ---

export function buildInvoiceShareLinkFromData(
  invoice: {
    invoiceNumber: string;
    type: InvoiceType;
    status: InvoiceStatus;
    total: unknown;
    amountPaid: unknown;
    balanceDue: unknown;
    customer?: { name: string; phone?: string | null; phoneNormalized?: string | null } | null;
    shop?: { name: string } | null;
    payments?: Payment[];
  },
  shopName: string,
  currency?: string,
): WhatsAppShareResult {
  const phone = phoneFromCustomer(invoice.customer, currency);

  if (!invoice.customer || !phone) {
    return {
      ok: false,
      message: "لا يوجد رقم واتساب لهذا العميل",
    };
  }

  const message = [
    `مرحباً ${invoice.customer.name},`,
    `فاتورتك من ${shopName}`,
    `رقم الفاتورة: ${invoice.invoiceNumber}`,
    `نوع الفاتورة: ${getInvoiceTypeLabel(invoice.type)}`,
    `الإجمالي: ${formatCurrency(invoice.total)}`,
    `المدفوع: ${formatCurrency(invoice.amountPaid)}`,
    `المتبقي: ${formatCurrency(invoice.balanceDue)}`,
    `الحالة: ${getInvoiceStatusLabel(invoice.status)}`,
    `ملخص الدفع: ${buildPaymentSummary(invoice.payments ?? [])}`,
    "شكراً لتعاملكم معنا.",
  ].join("\n");

  return {
    ok: true,
    url: buildWaMeLink(phone, message),
  };
}

export function buildRepairUpdateShareLinkFromData(
  repairOrder: {
    ticketNumber: string;
    status: RepairStatus;
    deviceBrand?: string | null;
    deviceModel?: string | null;
    customer?: { name: string; phone?: string | null; phoneNormalized?: string | null } | null;
  },
  shopName: string,
  currency?: string,
): WhatsAppShareResult {
  const phone = phoneFromCustomer(repairOrder.customer, currency);

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
    `تحديث بخصوص جهازك لدى ${shopName}`,
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

export function buildSaleReceiptShareLinkFromData(
  sale: {
    receiptNumber?: string | null;
    total: unknown;
    soldAt: Date | string | null;
    customer?: { name: string; phone?: string | null; phoneNormalized?: string | null } | null;
    items?: { description: string; quantity: number }[];
  },
  shopName: string,
  currency?: string,
): WhatsAppShareResult {
  const phone = phoneFromCustomer(sale.customer, currency);

  if (!sale.customer || !phone) {
    return {
      ok: false,
      message: "لا يوجد رقم واتساب لهذا العميل",
    };
  }

  const itemSummary = (sale.items ?? [])
    .slice(0, 5)
    .map((item) => `- ${item.description} × ${item.quantity}`)
    .join("\n");

  const message = [
    `مرحباً ${sale.customer.name},`,
    `إيصالك من ${shopName}`,
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
  buildInvoiceShareLinkFromData,
  buildRepairUpdateShareLinkFromData,
  buildSaleReceiptShareLinkFromData,
};
