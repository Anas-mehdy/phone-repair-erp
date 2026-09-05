export type DebtActivationProgressInput = {
  hasDebt: boolean;
  hasPayment: boolean;
};

export type DebtPaymentPreview = {
  valid: boolean;
  payment: number;
  remainingBalance: number;
  error: string | null;
};

export function parseDebtAmount(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

export function isPositiveDebtAmount(value: string | number) {
  return parseDebtAmount(value) > 0;
}

export function previewDebtPayment(
  currentBalance: number,
  rawPayment: string | number,
): DebtPaymentPreview {
  const balance = Math.max(0, parseDebtAmount(currentBalance));
  const payment = parseDebtAmount(rawPayment);

  if (payment <= 0) {
    return {
      valid: false,
      payment,
      remainingBalance: balance,
      error: "أدخل مبلغ تحصيل صحيحاً أكبر من صفر.",
    };
  }

  if (balance <= 0) {
    return {
      valid: false,
      payment,
      remainingBalance: 0,
      error: "لا يوجد رصيد مستحق على هذا العميل.",
    };
  }

  if (payment - balance > 0.005) {
    return {
      valid: false,
      payment,
      remainingBalance: balance,
      error: "مبلغ التحصيل أكبر من الرصيد المستحق.",
    };
  }

  return {
    valid: true,
    payment,
    remainingBalance: Math.max(0, Math.round((balance - payment) * 100) / 100),
    error: null,
  };
}

export function debtActivationProgress({ hasDebt, hasPayment }: DebtActivationProgressInput) {
  if (!hasDebt) return { completed: 0, total: 3, complete: false };
  const completed = hasPayment ? 3 : 2;
  return { completed, total: 3, complete: completed === 3 };
}
