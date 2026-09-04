import type { CashDrawerMovementRow, CashDrawerSourceType } from "@/lib/services/cashDrawerService";

export function cashDrawerMovementLabel(movement: Pick<CashDrawerMovementRow, "type" | "direction" | "sourceType">) {
  if (String(movement.type) === "ELECTRONIC_SERVICE_PAYMENT") return "تحصيل خدمة إلكترونية";
  switch (movement.type) {
    case "OPENING_BALANCE": return "الرصيد الافتتاحي";
    case "MANUAL_IN": return "إضافة نقد للدرج";
    case "MANUAL_OUT": return "سحب نقد من الدرج";
    case "WALLET_TRANSFER_IN": return "تحويل من محفظة";
    case "WALLET_TRANSFER_OUT": return "تحويل إلى محفظة";
    case "SALE_CASH": return "تحصيل مبيعة";
    case "INVOICE_PAYMENT": return "تحصيل فاتورة / خدمة";
    case "INSTALLMENT_PAYMENT": return "تحصيل قسط";
    case "INSTALLMENT_DOWN_PAYMENT": return "دفعة أولى للأقساط";
    case "DEBT_PAYMENT": return "تحصيل دين";
    case "CHANGE_RETURN": return movement.sourceType === "INVOICE" ? "إرجاع باقي فاتورة / خدمة" : "إرجاع باقي مبيعة";
    default: return movement.direction === "IN" ? "دخول نقد" : "خروج نقد";
  }
}

export function cashDrawerSourceHref(movement: Pick<CashDrawerMovementRow, "sourceType" | "sourceId" | "customerId" | "financialTransferId">) {
  const sourceType = String(movement.sourceType);
  if (sourceType === "ELECTRONIC_SERVICE" && movement.sourceId) return `/electronic-services/new?transaction=${movement.sourceId}`;
  if ((movement.sourceType === "SALE" || movement.sourceType === "SALE_CHANGE") && movement.sourceId) return `/sales/${movement.sourceId}`;
  if (movement.sourceType === "INVOICE" && movement.sourceId) return `/invoices/${movement.sourceId}`;
  if ((movement.sourceType === "INSTALLMENT" || movement.sourceType === "INSTALLMENT_DOWN_PAYMENT") && movement.sourceId) return `/installments/${movement.sourceId}`;
  if (movement.sourceType === "DEBT" && movement.customerId) return `/debts/${movement.customerId}`;
  if (movement.sourceType === "CASH_DRAWER_TRANSFER" && movement.financialTransferId) return `/transfers/${movement.financialTransferId}`;
  return null;
}

export function cashDrawerSourceLinkLabel(sourceType: CashDrawerSourceType) {
  if (String(sourceType) === "ELECTRONIC_SERVICE") return "فتح الخدمة الإلكترونية";
  if (sourceType === "SALE" || sourceType === "SALE_CHANGE") return "فتح المبيعة";
  if (sourceType === "INVOICE") return "فتح الفاتورة";
  if (sourceType === "INSTALLMENT" || sourceType === "INSTALLMENT_DOWN_PAYMENT") return "فتح خطة الأقساط";
  if (sourceType === "DEBT") return "فتح دفتر الدين";
  if (sourceType === "CASH_DRAWER_TRANSFER") return "فتح حركة المحفظة";
  return "فتح المصدر";
}

export function cashDrawerSourceLabel(sourceType: CashDrawerSourceType) {
  if (String(sourceType) === "ELECTRONIC_SERVICE") return "خدمة إلكترونية";
  if (sourceType === "SALE") return "مبيعة";
  if (sourceType === "SALE_CHANGE") return "باقي مبيعة";
  if (sourceType === "INVOICE") return "فاتورة / خدمة";
  if (sourceType === "INSTALLMENT") return "خطة أقساط";
  if (sourceType === "INSTALLMENT_DOWN_PAYMENT") return "دفعة أولى";
  if (sourceType === "DEBT") return "دفتر دين";
  if (sourceType === "CASH_DRAWER_TRANSFER") return "تحويل محفظة";
  return "حركة يدوية";
}
