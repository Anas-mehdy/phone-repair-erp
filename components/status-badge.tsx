import {
  InventoryMovementType,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  RepairStatus,
  SaleStatus,
} from "@prisma/client";
import { cn } from "@/lib/utils";

type BadgeTone =
  | "neutral"
  | "blue"
  | "amber"
  | "orange"
  | "green"
  | "emerald"
  | "red";

const toneClassName: Record<BadgeTone, string> = {
  neutral: "border-slate-300/80 bg-slate-100/80 text-slate-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  orange: "border-orange-200 bg-orange-50 text-orange-800",
  green: "border-teal-200 bg-teal-50 text-teal-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-850",
  red: "border-rose-200 bg-rose-50 text-rose-800",
};

const dotColor: Record<BadgeTone, string> = {
  neutral: "bg-slate-500",
  blue: "bg-blue-600",
  amber: "bg-amber-600",
  orange: "bg-orange-600",
  green: "bg-teal-600",
  emerald: "bg-emerald-600",
  red: "bg-rose-600",
};

export const repairStatusLabels: Record<RepairStatus, string> = {
  PENDING: "قيد الانتظار",
  DIAGNOSING: "قيد التشخيص",
  REPAIRING: "قيد الإصلاح",
  WAITING_PARTS: "بانتظار القطع",
  DONE: "جاهز للتسليم",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  UNPAID: "غير مدفوعة",
  PARTIALLY_PAID: "مدفوعة جزئياً",
  PAID: "مدفوعة",
  VOID: "ملغاة",
};

export const invoiceTypeLabels: Record<InvoiceType, string> = {
  REPAIR: "صيانة",
  SALE: "بيع",
  MANUAL: "يدوية",
};

export const saleStatusLabels: Record<SaleStatus, string> = {
  DRAFT: "مسودة",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
  REFUNDED: "مرتجعة",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "نقداً",
  CARD: "بطاقة",
  BANK_TRANSFER: "تحويل بنكي",
  OTHER: "أخرى",
};

export const inventoryMovementTypeLabels: Record<InventoryMovementType, string> = {
  STOCK_IN: "إدخال مخزون",
  STOCK_OUT: "إخراج مخزون",
  ADJUSTMENT: "تسوية",
  SALE: "بيع",
  REPAIR_USAGE: "استخدام في صيانة",
  RETURN: "مرتجع",
};

const repairStatusTones: Record<RepairStatus, BadgeTone> = {
  PENDING: "neutral",
  DIAGNOSING: "blue",
  REPAIRING: "amber",
  WAITING_PARTS: "orange",
  DONE: "green",
  DELIVERED: "emerald",
  CANCELLED: "red",
};

const invoiceStatusTones: Record<InvoiceStatus, BadgeTone> = {
  UNPAID: "orange",
  PARTIALLY_PAID: "amber",
  PAID: "green",
  VOID: "neutral",
};

const saleStatusTones: Record<SaleStatus, BadgeTone> = {
  DRAFT: "neutral",
  COMPLETED: "green",
  CANCELLED: "red",
  REFUNDED: "orange",
};

const movementTypeTones: Record<InventoryMovementType, BadgeTone> = {
  STOCK_IN: "green",
  STOCK_OUT: "orange",
  ADJUSTMENT: "blue",
  SALE: "amber",
  REPAIR_USAGE: "orange",
  RETURN: "emerald",
};

function Badge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none tracking-wide shadow-xs",
        toneClassName[tone],
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", dotColor[tone])} />
      <span>{label}</span>
    </span>
  );
}


export function RepairStatusBadge({ status }: { status: RepairStatus }) {
  return <Badge label={repairStatusLabels[status]} tone={repairStatusTones[status]} />;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge label={invoiceStatusLabels[status]} tone={invoiceStatusTones[status]} />
  );
}

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return <Badge label={saleStatusLabels[status]} tone={saleStatusTones[status]} />;
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge label={paymentMethodLabels[method]} tone="blue" />;
}

export function InventoryMovementTypeBadge({
  type,
}: {
  type: InventoryMovementType;
}) {
  return <Badge label={inventoryMovementTypeLabels[type]} tone={movementTypeTones[type]} />;
}

export function PlainBadge({
  label,
  tone,
}: {
  label: string;
  tone?: BadgeTone;
}) {
  return <Badge label={label} tone={tone} />;
}
