export interface CountryDialInfo {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  currency: string;
  placeholder: string;
}

export const COUNTRY_DIAL_CODES: CountryDialInfo[] = [
  { code: "SA", name: "السعودية", dialCode: "+966", flag: "🇸🇦", currency: "SAR", placeholder: "501234567" },
  { code: "EG", name: "مصر", dialCode: "+20", flag: "🇪🇬", currency: "EGP", placeholder: "1012345678" },
  { code: "US", name: "الولايات المتحدة (أمريكا)", dialCode: "+1", flag: "🇺🇸", currency: "USD", placeholder: "2025550143" },
  { code: "TR", name: "تركيا", dialCode: "+90", flag: "🇹🇷", currency: "TRY", placeholder: "5351234567" },
  { code: "AE", name: "الإمارات", dialCode: "+971", flag: "🇦🇪", currency: "AED", placeholder: "501234567" },
  { code: "JO", name: "الأردن", dialCode: "+962", flag: "🇯🇴", currency: "JOD", placeholder: "791234567" },
  { code: "IQ", name: "العراق", dialCode: "+964", flag: "🇮🇶", currency: "IQD", placeholder: "7712345678" },
  { code: "SY", name: "سوريا", dialCode: "+963", flag: "🇸🇾", currency: "SYP", placeholder: "931234567" },
  { code: "KW", name: "الكويت", dialCode: "+965", flag: "🇰🇼", currency: "KWD", placeholder: "51234567" },
  { code: "QA", name: "قطر", dialCode: "+974", flag: "🇶🇦", currency: "QAR", placeholder: "55123456" },
  { code: "BH", name: "البحرين", dialCode: "+973", flag: "🇧🇭", currency: "BHD", placeholder: "39123456" },
  { code: "OM", name: "عُمان", dialCode: "+968", flag: "🇴🇲", currency: "OMR", placeholder: "91234567" },
  { code: "LB", name: "لبنان", dialCode: "+961", flag: "🇱🇧", currency: "LBP", placeholder: "70123456" },
  { code: "PS", name: "فلسطين", dialCode: "+970", flag: "🇵🇸", currency: "JOD", placeholder: "599123456" },
  { code: "YE", name: "اليمن", dialCode: "+967", flag: "🇾🇪", currency: "YER", placeholder: "771234567" },
  { code: "LY", name: "ليبيا", dialCode: "+218", flag: "🇱🇾", currency: "LYD", placeholder: "911234567" },
  { code: "TN", name: "تونس", dialCode: "+216", flag: "🇹🇳", currency: "TND", placeholder: "20123456" },
  { code: "DZ", name: "الجزائر", dialCode: "+213", flag: "🇩🇿", currency: "DZD", placeholder: "551234567" },
  { code: "MA", name: "المغرب", dialCode: "+212", flag: "🇲🇦", currency: "MAD", placeholder: "612345678" },
  { code: "SD", name: "السودان", dialCode: "+249", flag: "🇸🇩", currency: "SDG", placeholder: "912345678" },
  { code: "MR", name: "موريتانيا", dialCode: "+222", flag: "🇲🇷", currency: "MRU", placeholder: "45123456" },
  { code: "SO", name: "الصومال", dialCode: "+252", flag: "🇸🇴", currency: "SOS", placeholder: "612345678" },
  { code: "DJ", name: "جيبوتي", dialCode: "+253", flag: "🇩🇯", currency: "DJF", placeholder: "77123456" },
  { code: "KM", name: "جزر القمر", dialCode: "+269", flag: "🇰🇲", currency: "KMF", placeholder: "3212345" },
];

/**
 * Combines selected dial code with a local phone input, ensuring no duplicated 0 or +
 */
export function combineCountryDialWithPhone(dialCode: string, localPhone: string): string {
  const cleanPhone = (localPhone || "").trim().replace(/[\s\-()+]/g, "");
  if (!cleanPhone) return "";

  // If the user pasted a full international number with the dial code, keep it
  const cleanDialDigits = dialCode.replace(/\D/g, "");
  if (cleanPhone.startsWith(cleanDialDigits)) {
    return `+${cleanPhone}`;
  }

  // Remove leading 0 if entered (e.g., 0501234567 -> 501234567)
  const digitsWithoutZero = cleanPhone.replace(/^0+/, "");
  const normalizedDial = dialCode.startsWith("+") ? dialCode : `+${dialCode}`;

  return `${normalizedDial}${digitsWithoutZero}`;
}

/**
 * Parses an existing phone string into dial code and local phone digits
 */
export function parseStoredPhone(
  phone?: string | null,
  defaultCurrency: string = "SAR",
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
