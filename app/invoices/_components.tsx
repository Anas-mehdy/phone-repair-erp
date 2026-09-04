import { InvoiceStatus, InvoiceType, PaymentMethod } from "@prisma/client";
import type { ReactNode } from "react";
import {
  invoiceStatusLabels,
  invoiceTypeLabels,
  paymentMethodLabels,
} from "@/components/status-badge";
import {
  formatCurrency,
  formatDateTime as sharedFormatDateTime,
} from "@/lib/format";

export const inputClassName = "erp-input";
export const textareaClassName = "erp-textarea";
export const selectClassName = "erp-input";

export function Field({
  label,
  children,
  helper,
}: {
  label: string;
  children: ReactNode;
  helper?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold text-slate-800">{label}</span>
      {children}
      {helper ? (
        <span className="text-xs font-medium text-slate-500">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

export const invoiceStatusOptions: Array<{
  value: InvoiceStatus;
  label: string;
}> = Object.values(InvoiceStatus).map((status) => ({
  value: status,
  label: invoiceStatusLabels[status],
}));

export const invoiceTypeOptions: Array<{ value: InvoiceType; label: string }> =
  Object.values(InvoiceType).map((type) => ({
    value: type,
    label: invoiceTypeLabels[type],
  }));

export const paymentMethodOptions: Array<{
  value: PaymentMethod;
  label: string;
}> = Object.values(PaymentMethod).map((method) => ({
  value: method,
  label: paymentMethodLabels[method],
}));

export function getInvoiceStatusLabel(status: InvoiceStatus) {
  return invoiceStatusLabels[status] ?? status;
}

export function getInvoiceTypeLabel(type: InvoiceType) {
  return invoiceTypeLabels[type] ?? type;
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethodLabels[method] ?? method;
}

export function formatDate(value: Date | string | null | undefined, timeZone?: string) {
  return sharedFormatDateTime(value, timeZone);
}

export function formatMoney(value: unknown, currency: string = "SAR") {
  return formatCurrency(value, currency);
}
