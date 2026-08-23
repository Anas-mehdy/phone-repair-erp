export function formatCurrency(value: unknown, currency: string = "SAR") {
  if (value === null || value === undefined) {
    return "-";
  }

  let amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "-";
  }

  if (amount === 0) {
    amount = 0;
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  const currencyLabels: Record<string, string> = {
    SAR: "ر.س",
    AED: "د.إ",
    KWD: "د.ك",
    BHD: "د.ب",
    OMR: "ر.ع",
    QAR: "ر.ق",
    EGP: "ج.م",
    JOD: "د.أ",
    USD: "$",
    EUR: "€",
  };

  const symbol = currencyLabels[currency] || currency;

  return `\u2066${formattedAmount}\u00A0${symbol}\u2069`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
