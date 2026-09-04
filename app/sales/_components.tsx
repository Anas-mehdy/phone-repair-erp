import { InventoryMovementType, SaleStatus } from "@prisma/client";
import type { ReactNode } from "react";
import {
  inventoryMovementTypeLabels,
  saleStatusLabels,
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
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

export const saleStatusOptions: Array<{ value: SaleStatus; label: string }> =
  Object.values(SaleStatus).map((status) => ({
    value: status,
    label: saleStatusLabels[status],
  }));

export function getSaleStatusLabel(status: SaleStatus) {
  return saleStatusLabels[status] ?? status;
}

export function getMovementTypeLabel(type: InventoryMovementType) {
  return inventoryMovementTypeLabels[type];
}

export function formatDate(value: Date | string | null | undefined, timeZone?: string) {
  return sharedFormatDateTime(value, timeZone);
}

export function formatMoney(value: unknown, currency: string = "SAR") {
  return formatCurrency(value, currency);
}
