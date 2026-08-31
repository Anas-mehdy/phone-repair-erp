export interface CountryDialInfo {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  currency: string;
  placeholder: string;
  expectedDigits: number[];
  startDigits?: string[];
  description: string;
}

export const COUNTRY_DIAL_CODES: CountryDialInfo[] = [
  {
    code: "SA",
    name: "السعودية",
    dialCode: "+966",
    flag: "🇸🇦",
    currency: "SAR",
    placeholder: "501234567",
    expectedDigits: [9],
    startDigits: ["5"],
    description: "9 أرقام (يبدأ بـ 5)",
  },
  {
    code: "EG",
    name: "مصر",
    dialCode: "+20",
    flag: "🇪🇬",
    currency: "EGP",
    placeholder: "1012345678",
    expectedDigits: [10],
    startDigits: ["10", "11", "12", "15", "1"],
    description: "10 أرقام (يبدأ بـ 10, 11, 12, 15)",
  },
  {
    code: "AE",
    name: "الإمارات",
    dialCode: "+971",
    flag: "🇦🇪",
    currency: "AED",
    placeholder: "501234567",
    expectedDigits: [9],
    startDigits: ["50", "52", "54", "55", "56", "58", "5"],
    description: "9 أرقام (يبدأ بـ 5)",
  },
  {
    code: "KW",
    name: "الكويت",
    dialCode: "+965",
    flag: "🇰🇼",
    currency: "KWD",
    placeholder: "51234567",
    expectedDigits: [8],
    startDigits: ["5", "6", "9", "2", "4"],
    description: "8 أرقام",
  },
  {
    code: "QA",
    name: "قطر",
    dialCode: "+974",
    flag: "🇶🇦",
    currency: "QAR",
    placeholder: "55123456",
    expectedDigits: [8],
    startDigits: ["3", "5", "6", "7"],
    description: "8 أرقام",
  },
  {
    code: "BH",
    name: "البحرين",
    dialCode: "+973",
    flag: "🇧🇭",
    currency: "BHD",
    placeholder: "39123456",
    expectedDigits: [8],
    startDigits: ["3", "6", "1"],
    description: "8 أرقام",
  },
  {
    code: "OM",
    name: "عُمان",
    dialCode: "+968",
    flag: "🇴🇲",
    currency: "OMR",
    placeholder: "91234567",
    expectedDigits: [8],
    startDigits: ["7", "9", "2"],
    description: "8 أرقام",
  },
  {
    code: "JO",
    name: "الأردن",
    dialCode: "+962",
    flag: "🇯🇴",
    currency: "JOD",
    placeholder: "791234567",
    expectedDigits: [9],
    startDigits: ["77", "78", "79", "7"],
    description: "9 أرقام (يبدأ بـ 7)",
  },
  {
    code: "IQ",
    name: "العراق",
    dialCode: "+964",
    flag: "🇮🇶",
    currency: "IQD",
    placeholder: "7712345678",
    expectedDigits: [10],
    startDigits: ["7"],
    description: "10 أرقام (يبدأ بـ 7)",
  },
  {
    code: "SY",
    name: "سوريا",
    dialCode: "+963",
    flag: "🇸🇾",
    currency: "SYP",
    placeholder: "931234567",
    expectedDigits: [9],
    startDigits: ["9"],
    description: "9 أرقام (يبدأ بـ 9)",
  },
  {
    code: "PS",
    name: "فلسطين",
    dialCode: "+970",
    flag: "🇵🇸",
    currency: "ILS",
    placeholder: "599123456",
    expectedDigits: [9],
    startDigits: ["59", "56", "5"],
    description: "9 أرقام (يبدأ بـ 5)",
  },
  {
    code: "YE",
    name: "اليمن",
    dialCode: "+967",
    flag: "🇾🇪",
    currency: "YER",
    placeholder: "771234567",
    expectedDigits: [9],
    startDigits: ["7"],
    description: "9 أرقام (يبدأ بـ 7)",
  },
  {
    code: "LB",
    name: "لبنان",
    dialCode: "+961",
    flag: "🇱🇧",
    currency: "LBP",
    placeholder: "70123456",
    expectedDigits: [7, 8],
    description: "7 إلى 8 أرقام",
  },
  {
    code: "LY",
    name: "ليبيا",
    dialCode: "+218",
    flag: "🇱🇾",
    currency: "LYD",
    placeholder: "911234567",
    expectedDigits: [9],
    startDigits: ["9"],
    description: "9 أرقام (يبدأ بـ 9)",
  },
  {
    code: "TN",
    name: "تونس",
    dialCode: "+216",
    flag: "🇹🇳",
    currency: "TND",
    placeholder: "20123456",
    expectedDigits: [8],
    startDigits: ["2", "4", "5", "9"],
    description: "8 أرقام",
  },
  {
    code: "DZ",
    name: "الجزائر",
    dialCode: "+213",
    flag: "🇩🇿",
    currency: "DZD",
    placeholder: "551234567",
    expectedDigits: [9],
    startDigits: ["5", "6", "7"],
    description: "9 أرقام (يبدأ بـ 5, 6, 7)",
  },
  {
    code: "MA",
    name: "المغرب",
    dialCode: "+212",
    flag: "🇲🇦",
    currency: "MAD",
    placeholder: "612345678",
    expectedDigits: [9],
    startDigits: ["6", "7"],
    description: "9 أرقام (يبدأ بـ 6, 7)",
  },
  {
    code: "SD",
    name: "السودان",
    dialCode: "+249",
    flag: "🇸🇩",
    currency: "SDG",
    placeholder: "912345678",
    expectedDigits: [9],
    startDigits: ["9", "1"],
    description: "9 أرقام (يبدأ بـ 9 أو 1)",
  },
  {
    code: "MR",
    name: "موريتانيا",
    dialCode: "+222",
    flag: "🇲🇷",
    currency: "MRU",
    placeholder: "45123456",
    expectedDigits: [8],
    startDigits: ["2", "3", "4"],
    description: "8 أرقام",
  },
  {
    code: "SO",
    name: "الصومال",
    dialCode: "+252",
    flag: "🇸🇴",
    currency: "SOS",
    placeholder: "612345678",
    expectedDigits: [8, 9],
    description: "8 إلى 9 أرقام",
  },
  {
    code: "DJ",
    name: "جيبوتي",
    dialCode: "+253",
    flag: "🇩🇯",
    currency: "DJF",
    placeholder: "77123456",
    expectedDigits: [8],
    startDigits: ["77", "7"],
    description: "8 أرقام",
  },
  {
    code: "KM",
    name: "جزر القمر",
    dialCode: "+269",
    flag: "🇰🇲",
    currency: "KMF",
    placeholder: "3212345",
    expectedDigits: [7],
    startDigits: ["3"],
    description: "7 أرقام",
  },
  {
    code: "TR",
    name: "تركيا",
    dialCode: "+90",
    flag: "🇹🇷",
    currency: "TRY",
    placeholder: "5351234567",
    expectedDigits: [10],
    startDigits: ["5"],
    description: "10 أرقام (يبدأ بـ 5)",
  },
  {
    code: "US",
    name: "الولايات المتحدة (أمريكا)",
    dialCode: "+1",
    flag: "🇺🇸",
    currency: "USD",
    placeholder: "2025550143",
    expectedDigits: [10],
    description: "10 أرقام",
  },
];

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  country: CountryDialInfo;
  cleanDigits: string;
  currentCount: number;
  expectedCountMin: number;
  expectedCountMax: number;
  expectedDesc: string;
  formattedInternational: string;
}

export function findCountryByDialCode(dialCodeOrCode: string): CountryDialInfo {
  const cleanDial = (dialCodeOrCode || "").trim();
  return (
    COUNTRY_DIAL_CODES.find(
      (c) =>
        c.dialCode === cleanDial ||
        c.code.toUpperCase() === cleanDial.toUpperCase() ||
        c.dialCode.replace(/\D/g, "") === cleanDial.replace(/\D/g, "")
    ) || COUNTRY_DIAL_CODES[0]
  );
}

export function validatePhoneForCountry(
  dialCodeOrCode: string,
  rawPhone: string
): PhoneValidationResult {
  const country = findCountryByDialCode(dialCodeOrCode);
  const raw = (rawPhone || "").trim();
  const digitsOnly = raw.replace(/\D/g, "");

  const minExpected = Math.min(...country.expectedDigits);
  const maxExpected = Math.max(...country.expectedDigits);

  // If user pasted dial code prefix, remove it
  const dialDigits = country.dialCode.replace(/\D/g, "");
  let localDigits = digitsOnly;
  if (localDigits.startsWith(dialDigits) && localDigits.length > dialDigits.length) {
    localDigits = localDigits.slice(dialDigits.length);
  }

  // Remove leading zeros (e.g. 0501234567 -> 501234567)
  const cleanDigits = localDigits.replace(/^0+/, "");
  const currentCount = cleanDigits.length;

  const expectedDesc =
    minExpected === maxExpected
      ? `${minExpected} أرقام`
      : `${minExpected} إلى ${maxExpected} أرقام`;

  if (!raw || currentCount === 0) {
    return {
      isValid: false,
      error: `رقم هاتف المتجر مطلوب. لدولة ${country.name} يتطلب ${expectedDesc} (مثال: ${country.placeholder})`,
      country,
      cleanDigits: "",
      currentCount: 0,
      expectedCountMin: minExpected,
      expectedCountMax: maxExpected,
      expectedDesc,
      formattedInternational: "",
    };
  }

  // Check digit count
  if (currentCount < minExpected) {
    const missing = minExpected - currentCount;
    const missingWord = missing === 1 ? "رقم واحد" : missing === 2 ? "رقمين" : `${missing} أرقام`;
    return {
      isValid: false,
      error: `رقم الهاتف غير مكتمل لدولة ${country.name}: المدخل ${currentCount} أرقام (ناقص ${missingWord}). المطلوب ${country.description}`,
      country,
      cleanDigits,
      currentCount,
      expectedCountMin: minExpected,
      expectedCountMax: maxExpected,
      expectedDesc,
      formattedInternational: `${country.dialCode}${cleanDigits}`,
    };
  }

  if (currentCount > maxExpected) {
    const excess = currentCount - maxExpected;
    const excessWord = excess === 1 ? "رقم واحد" : excess === 2 ? "رقمين" : `${excess} أرقام`;
    return {
      isValid: false,
      error: `رقم الهاتف أطول من اللازم لدولة ${country.name}: المدخل ${currentCount} أرقام (زيادة ${excessWord}). المطلوب ${country.description}`,
      country,
      cleanDigits,
      currentCount,
      expectedCountMin: minExpected,
      expectedCountMax: maxExpected,
      expectedDesc,
      formattedInternational: `${country.dialCode}${cleanDigits}`,
    };
  }

  // Check start digits if specified
  if (country.startDigits && country.startDigits.length > 0) {
    const matchesPrefix = country.startDigits.some((prefix) => cleanDigits.startsWith(prefix));
    if (!matchesPrefix) {
      const allowedPrefixes = country.startDigits.join(" أو ");
      return {
        isValid: false,
        error: `رقم الهاتف لدولة ${country.name} يجب أن يبدأ بـ (${allowedPrefixes}) - مثال: ${country.placeholder}`,
        country,
        cleanDigits,
        currentCount,
        expectedCountMin: minExpected,
        expectedCountMax: maxExpected,
        expectedDesc,
        formattedInternational: `${country.dialCode}${cleanDigits}`,
      };
    }
  }

  return {
    isValid: true,
    country,
    cleanDigits,
    currentCount,
    expectedCountMin: minExpected,
    expectedCountMax: maxExpected,
    expectedDesc,
    formattedInternational: `${country.dialCode}${cleanDigits}`,
  };
}

/**
 * Combines selected dial code with a local phone input, ensuring no duplicated 0 or +
 */
export function combineCountryDialWithPhone(dialCode: string, localPhone: string): string {
  const validation = validatePhoneForCountry(dialCode, localPhone);
  if (validation.isValid) {
    return validation.formattedInternational;
  }

  const cleanPhone = (localPhone || "").trim().replace(/[\s\-()+]/g, "");
  if (!cleanPhone) return "";

  const cleanDialDigits = dialCode.replace(/\D/g, "");
  if (cleanPhone.startsWith(cleanDialDigits)) {
    return `+${cleanPhone}`;
  }

  const digitsWithoutZero = cleanPhone.replace(/^0+/, "");
  const normalizedDial = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;
  return `${normalizedDial}${digitsWithoutZero}`;
}

/**
 * Parses an existing phone string into dial code and local phone digits
 */
export function parseStoredPhone(
  phone?: string | null,
  defaultCurrency: string = "SAR"
): { dialCode: string; localPhone: string } {
  if (!phone) {
    const defaultCountry =
      COUNTRY_DIAL_CODES.find((c) => c.currency === defaultCurrency) || COUNTRY_DIAL_CODES[0];
    return { dialCode: defaultCountry.dialCode, localPhone: "" };
  }

  const clean = phone.trim().replace(/[\s\-()+]/g, "");
  const withoutInternationalPrefix = clean.startsWith("00") ? clean.slice(2) : clean;
  const digits = withoutInternationalPrefix.replace(/\D/g, "");

  // Find if digits start with any known dialCode (sorted by length descending)
  const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const country of sorted) {
    const dialDigits = country.dialCode.replace(/\D/g, "");
    if (digits.startsWith(dialDigits) && digits.length >= dialDigits.length + 6) {
      return {
        dialCode: country.dialCode,
        localPhone: digits.slice(dialDigits.length),
      };
    }
  }

  // If starts with 0 (e.g. 01015605228 or 0785155050)
  if (digits.startsWith("0")) {
    const defaultCountry =
      COUNTRY_DIAL_CODES.find((c) => c.currency === defaultCurrency) || COUNTRY_DIAL_CODES[0];
    return {
      dialCode: defaultCountry.dialCode,
      localPhone: digits.replace(/^0+/, ""),
    };
  }

  const defaultCountry =
    COUNTRY_DIAL_CODES.find((c) => c.currency === defaultCurrency) || COUNTRY_DIAL_CODES[0];
  return { dialCode: defaultCountry.dialCode, localPhone: digits };
}
