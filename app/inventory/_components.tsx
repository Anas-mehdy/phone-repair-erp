import { InventoryMovementType } from "@prisma/client";
import type { ReactNode } from "react";
import { inventoryMovementTypeLabels } from "@/components/status-badge";
import { formatCurrency, formatDate as sharedFormatDate } from "@/lib/format";

export const inputClassName = "erp-input";
export const textareaClassName = "erp-textarea";

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
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-extrabold text-slate-800">{label}</span>
      {children}
      {helper ? (
        <span className="text-xs font-medium text-slate-500 leading-normal">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

export function formatDate(value: Date | string | null | undefined, timeZone?: string) {
  return sharedFormatDate(value, timeZone);
}

export function formatMoney(value: unknown, currency: string = "SAR") {
  return formatCurrency(value, currency);
}

export function getMovementTypeLabel(type: InventoryMovementType) {
  return inventoryMovementTypeLabels[type];
}

export function isLowStock(quantity: number, reorderLevel: number) {
  return quantity <= reorderLevel;
}
