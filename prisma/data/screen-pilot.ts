import {
  CompatibilityType,
  VerificationLevel,
  VerificationSourceType,
} from "@prisma/client";

export const SCREEN_PILOT_BATCH = "screen-pilot-redmi-note11-family-2026-08-27";
export const SCREEN_VARIANT_BATCH = "screen-variants-redmi-note11-family-v2-2026-08-27";

export const SCREEN_PILOT_DEVICES = [
  { brand: "Xiaomi", commercialName: "Redmi Note 11 4G", modelNumber: "2201117TG", normalizedModel: "2201117tg", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "Redmi Note 11S", modelNumber: "2201117SG", normalizedModel: "2201117sg", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "POCO M4 Pro 4G", modelNumber: "2201117PG", normalizedModel: "2201117pg", networkVariant: "4G", region: "Global", releaseYear: 2022 },
  { brand: "Xiaomi", commercialName: "Redmi Note 12S", modelNumber: "2303CRA44A", normalizedModel: "2303cra44a", networkVariant: "4G", region: "Global", releaseYear: 2023 },
] as const;

export const SCREEN_PILOT_FAMILY = {
  normalizedPartCode: "screenfam-rn11-rn11s-m4pro4g-rn12s",
  name: "Screen family: Redmi Note 11 4G / Note 11S / POCO M4 Pro 4G / Note 12S",
  aliases: ["XIARN12S-04", "FE39E555AD"],
  compatibilityType: CompatibilityType.FUNCTIONAL_EQUIVALENT,
  verificationLevel: VerificationLevel.SUPPLIER_CATALOG,
  technicalNotes:
    "Pilot screen-family candidate supported by three supplier catalogs. Keep hidden until quality-specific behavior is classified.",
  specifications: {
    recordKind: "COMPATIBILITY_FAMILY",
    assembly: "display_and_digitizer_without_frame",
    knownQualities: ["TFT_AFTERMARKET", "HIGH_COPY", "OEM_MARKETED"],
    publicationWarning:
      "Quality and feature parity differ by supplier; verify fingerprint, brightness, refresh rate and frame before publishing a specific SKU.",
  },
} as const;

const UNKNOWN_FEATURES = {
  fingerprint: "UNKNOWN",
  refreshRate: "UNKNOWN",
  brightness: "UNKNOWN",
  colorAccuracy: "UNKNOWN",
} as const;

export const SCREEN_PILOT_VARIANTS = [
  {
    normalizedPartCode: "fixshop-xiarn12s-04",
    manufacturerCode: "XIARN12S-04",
    name: "شاشة TFT بديلة بدون إطار — عائلة Redmi Note 11",
    aliases: ["XIARN12S-04"],
    sourceUrl: "https://www.fixshop.eu/spare-parts-xiaomi-redmi-note-xiaomi-redmi-note-12s-2303cra44a/xiaomi-redmi-note-11-11s-12s-poco-m4-pro-4g-lcd-display-plus-touch-screen-tft/",
    technicalNotes: "عرض مورّد محدد لشاشة TFT بدون إطار. خصائص البصمة والسطوع والتردد ودقة الألوان لم تُحسم بعد.",
    specifications: {
      schemaVersion: 1,
      recordKind: "INSTALLABLE_SCREEN",
      quality: "TFT_AFTERMARKET",
      technology: "TFT_LCD",
      assembly: "DISPLAY_AND_DIGITIZER",
      frame: "WITHOUT_FRAME",
      supplier: "FixShop",
      supplierProductCode: "XIARN12S-04",
      claims: UNKNOWN_FEATURES,
      publicationWarning: "لا تُنشر قبل حسم خصائص البصمة والسطوع والتردد ومطابقة الفلكس.",
    },
  },
  {
    normalizedPartCode: "allspares-rn11-family-high-copy",
    manufacturerCode: null,
    name: "شاشة High Copy بدون إطار — عائلة Redmi Note 11",
    aliases: [],
    sourceUrl: "https://all-spares.com/en/lcd-compatible-with-xiaomi-redmi-note-11-black-without-frame-high-copy/",
    technicalNotes: "عرض مورّد محدد لشاشة High Copy بدون إطار. تقنية اللوحة وخصائص الأداء لم تُحسم بعد.",
    specifications: {
      schemaVersion: 1,
      recordKind: "INSTALLABLE_SCREEN",
      quality: "HIGH_COPY",
      technology: "UNKNOWN",
      assembly: "DISPLAY_AND_DIGITIZER",
      frame: "WITHOUT_FRAME",
      supplier: "All Spares",
      supplierProductCode: null,
      claims: UNKNOWN_FEATURES,
      publicationWarning: "وصف High Copy لا يثبت تقنية اللوحة أو مساواتها للأصلية.",
    },
  },
  {
    normalizedPartCode: "4phones-fe39e555ad",
    manufacturerCode: "FE39E555AD",
    name: "شاشة مُسوّقة كجودة OEM — عائلة Redmi Note 11",
    aliases: ["FE39E555AD"],
    sourceUrl: "https://4phones.eu/products/xiaomi-redmi-note-11-redmi-note-11s-display-and-digitizer-black",
    technicalNotes: "وصف OEM هنا ادعاء تسويقي من المورّد وليس إثبات Service Pack مصنعي.",
    specifications: {
      schemaVersion: 1,
      recordKind: "INSTALLABLE_SCREEN",
      quality: "OEM_MARKETED",
      technology: "UNKNOWN",
      assembly: "DISPLAY_AND_DIGITIZER",
      frame: "WITHOUT_FRAME",
      supplier: "4Phones",
      supplierProductCode: "FE39E555AD",
      claims: UNKNOWN_FEATURES,
      publicationWarning: "لا تُعرض كقطعة أصلية أو Service Pack دون رقم قطعة مصنعي ودليل رسمي.",
    },
  },
] as const;

export const SCREEN_PILOT_SOURCES = [
  {
    name: "FixShop",
    publisher: "FixShop s.r.o.",
    url: "https://www.fixshop.eu/spare-parts-xiaomi-redmi-note-xiaomi-redmi-note-12s-2303cra44a/xiaomi-redmi-note-11-11s-12s-poco-m4-pro-4g-lcd-display-plus-touch-screen-tft/",
    sourceType: VerificationSourceType.TRUSTED_SUPPLIER,
    trustLevel: 3,
    details:
      "Compatibility list names Redmi Note 11 (2201117TG/TI), Redmi Note 11S (2201117SG/SI), POCO M4 Pro 4G (2201117PI) and Redmi Note 12S (2303CRA44A); match code XIARN12S-04; TFT aftermarket without frame.",
  },
  {
    name: "All Spares",
    publisher: "All Spares",
    url: "https://all-spares.com/en/lcd-compatible-with-xiaomi-redmi-note-11-black-without-frame-high-copy/",
    sourceType: VerificationSourceType.TRUSTED_SUPPLIER,
    trustLevel: 3,
    details:
      "Product catalog independently lists Redmi Note 11, Redmi Note 11S, POCO M4 Pro 4G and Redmi Note 12S for one high-copy display without frame.",
  },
  {
    name: "4Phones",
    publisher: "4Phones.nl B.V.",
    url: "https://4phones.eu/products/xiaomi-redmi-note-11-redmi-note-11s-display-and-digitizer-black",
    sourceType: VerificationSourceType.TRUSTED_SUPPLIER,
    trustLevel: 3,
    details:
      "Distributor catalog independently lists the four-model family and model-code variants under SKU FE39E555AD, marketed as OEM quality.",
  },
] as const;

export const SCREEN_PILOT_LICENSE_NOTE =
  "Public product-catalog reference used for manual verification. Bulk reuse requires supplier permission.";
