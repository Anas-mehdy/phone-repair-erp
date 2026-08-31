export const CURRENCY_OPTIONS = [
  { code: "SAR", name: "ريال سعودي (SAR)", symbol: "ر.س" },
  { code: "AED", name: "درهم إماراتي (AED)", symbol: "د.إ" },
  { code: "EGP", name: "جنيه مصري (EGP)", symbol: "ج.م" },
  { code: "TRY", name: "ليرة تركية (TRY / ₺)", symbol: "₺" },
  { code: "ILS", name: "شيكل (ILS / ₪)", symbol: "₪" },
  { code: "JOD", name: "دينار أردني (JOD)", symbol: "د.أ" },
  { code: "KWD", name: "دينار كويتي (KWD)", symbol: "د.ك" },
  { code: "BHD", name: "دينار بحريني (BHD)", symbol: "د.ب" },
  { code: "OMR", name: "ريال عماني (OMR)", symbol: "ر.ع" },
  { code: "QAR", name: "ريال قطري (QAR)", symbol: "ر.ق" },
  { code: "IQD", name: "دينار عراقي (IQD)", symbol: "د.ع" },
  { code: "SYP", name: "ليرة سورية (SYP)", symbol: "ل.س" },
  { code: "LBP", name: "ليرة لبنانية (LBP)", symbol: "ل.ل" },
  { code: "YER", name: "ريال يمني (YER)", symbol: "ر.ي" },
  { code: "LYD", name: "دينار ليبي (LYD)", symbol: "د.ل" },
  { code: "TND", name: "دينار تونسي (TND)", symbol: "د.ت" },
  { code: "DZD", name: "دينار جزائري (DZD)", symbol: "د.ج" },
  { code: "MAD", name: "درهم مغربي (MAD)", symbol: "د.م" },
  { code: "SDG", name: "جنيه سوداني (SDG)", symbol: "ج.س" },
  { code: "MRU", name: "أوقية موريتانية (MRU)", symbol: "أ.م" },
  { code: "SOS", name: "شلن صومالي (SOS)", symbol: "ش.ص" },
  { code: "DJF", name: "فرنك جيبوتي (DJF)", symbol: "ف.ج" },
  { code: "KMF", name: "فرنك قمري (KMF)", symbol: "ف.ق" },
  { code: "USD", name: "دولار أمريكي (USD / $)", symbol: "$" },
  { code: "EUR", name: "يورو (EUR / €)", symbol: "€" },
];

export const currencyLabels: Record<string, string> = {
  SAR: "ر.س",
  AED: "د.إ",
  EGP: "ج.م",
  TRY: "₺",
  ILS: "₪",
  JOD: "د.أ",
  KWD: "د.ك",
  BHD: "د.ب",
  OMR: "ر.ع",
  QAR: "ر.ق",
  IQD: "د.ع",
  SYP: "ل.س",
  LBP: "ل.ل",
  YER: "ر.ي",
  LYD: "د.ل",
  TND: "د.ت",
  DZD: "د.ج",
  MAD: "د.م",
  SDG: "ج.س",
  MRU: "أ.م",
  SOS: "ش.ص",
  DJF: "ف.ج",
  KMF: "ف.ق",
  USD: "$",
  EUR: "€",
};

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
