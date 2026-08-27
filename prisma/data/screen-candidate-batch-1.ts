import {
  CompatibilityType,
  VerificationLevel,
  VerificationSourceType,
} from "@prisma/client";

export const SCREEN_CANDIDATE_BATCH_1 = "xiaomi-screen-candidates-batch-1-2026-08-27";

export const SCREEN_CANDIDATE_DEVICES = [
  { brand: "Xiaomi", commercialName: "Redmi Note 11 4G", modelNumber: "2201117TG", normalizedModel: "2201117tg", networkVariant: "4G", region: "Global", releaseYear: 2022, identitySource: "https://www.mi.com/global/support/user-guide-pdf/" },
  { brand: "Xiaomi", commercialName: "Redmi Note 11 4G", modelNumber: "2201117TI", normalizedModel: "2201117ti", networkVariant: "4G", region: "India", releaseYear: 2022, identitySource: "https://www.mi.com/global/support/user-guide-pdf/" },
  { brand: "Xiaomi", commercialName: "Redmi Note 11S", modelNumber: "2201117SG", normalizedModel: "2201117sg", networkVariant: "4G", region: "Global", releaseYear: 2022, identitySource: "https://www.mi.com/global/support/user-guide-pdf/" },
  { brand: "Xiaomi", commercialName: "Redmi Note 11S", modelNumber: "2201117SI", normalizedModel: "2201117si", networkVariant: "4G", region: "India", releaseYear: 2022, identitySource: "https://www.mi.com/global/support/user-guide-pdf/" },
  { brand: "POCO", commercialName: "POCO M4 Pro 4G", modelNumber: "2201117PI", normalizedModel: "2201117pi", networkVariant: "4G", region: "India", releaseYear: 2022, identitySource: "https://www.mi.com/global/support/user-guide-pdf/poco-m4-pro/" },
  { brand: "Xiaomi", commercialName: "Redmi 13C", modelNumber: "23100RN82L", normalizedModel: "23100rn82l", networkVariant: "4G", region: "Latin America", releaseYear: 2023, identitySource: "https://www.mi.com/co/support/user-guide-pdf/redmi-13c/" },
  { brand: "POCO", commercialName: "POCO C65", modelNumber: "2310FPCA4G", normalizedModel: "2310fpca4g", networkVariant: "4G", region: "Global", releaseYear: 2023, identitySource: "https://www.mi.com/global/support/user-guide-pdf/br/poco-c65/" },
  { brand: "Xiaomi", commercialName: "Redmi Note 10 5G", modelNumber: "M2103K19G", normalizedModel: "m2103k19g", networkVariant: "5G", region: "Global", releaseYear: 2021, identitySource: "https://www.mi.com/global/support/user-guide-pdf/mk-mk/redmi-note-10-5g/" },
  { brand: "POCO", commercialName: "POCO M3 Pro 5G", modelNumber: "M2103K19PG", normalizedModel: "m2103k19pg", networkVariant: "5G", region: "Global", releaseYear: 2021, identitySource: "https://www.mi.com/uk/support/user-guide-pdf/poco-m3-pro-5g-/" },
  { brand: "Xiaomi", commercialName: "Redmi 9T", modelNumber: "M2010J19SG", normalizedModel: "m2010j19sg", networkVariant: "4G", region: "Global", releaseYear: 2021, identitySource: "https://www.mi.com/tr/support/user-guide-pdf/redmi-9t/" },
  { brand: "POCO", commercialName: "POCO M3", modelNumber: "M2010J19CG", normalizedModel: "m2010j19cg", networkVariant: "4G", region: "Global", releaseYear: 2020, identitySource: "https://www.mi.com/global/support/user-guide-pdf/si/poco-m3-quick-start-guide/" },
  { brand: "Xiaomi", commercialName: "Redmi Note 13 Pro 5G", modelNumber: "2312DRA50C", normalizedModel: "2312dra50c", networkVariant: "5G", region: "China", releaseYear: 2023, identitySource: "https://www.mi.com/global/product/redmi-note-13-pro-5g/" },
  { brand: "POCO", commercialName: "POCO X6 5G", modelNumber: "23122PCD1G", normalizedModel: "23122pcd1g", networkVariant: "5G", region: "Global", releaseYear: 2024, identitySource: "https://www.mi.com/global/support/user-guide-pdf/dk/poco-x6-5g/" },
] as const;

export const SCREEN_CANDIDATE_SOURCES = [
  { name: "FixShop", publisher: "FixShop s.r.o.", url: "https://www.fixshop.eu/spare-parts-xiaomi-poco-xiaomi-poco-m4-pro-4g-2201117pi/xiaomi-redmi-note-11-11s-poco-m4-pro-4g-lcd-display-plus-touch-screen-plus-frame-black-5600010k7s00-5600010k7t00-5600010k7p00-genuine-service-pack/", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "FixShop", publisher: "FixShop s.r.o.", url: "https://www.fixshop.eu/spare-parts-xiaomi-poco-xiaomi-poco-c65/xiaomi-redmi-13c-poco-c65-lcd-display-plus-touch-screen-tft/", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "4Phones", publisher: "4Phones.nl B.V.", url: "https://4phones.eu/products/xiaomi-redmi-13c-23100rn82l-display-and-digitizer-without-frame-black-oem", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "All Spares", publisher: "All Spares", url: "https://all-spares.com/en/lcd-compatible-with-xiaomi-redmi-note-10-5g-black-without-frame-original-prc/", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "4Phones", publisher: "4Phones.nl B.V.", url: "https://4phones.eu/products/xiaomi-redmi-note-10-5g-m2103k19g-poco-m3-pro-5g-m2103k19pg-display-and-digitizer-without-frame-black-oem", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "All Spares", publisher: "All Spares", url: "https://all-spares.com/en/lcd-compatible-with-xiaomi-redmi-9t-black-without-frame-high-copy/", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "4Phones", publisher: "4Phones.nl B.V.", url: "https://4phones.eu/products/xiaomi-redmi-9t-poco-m3-display-and-digitizer-with-frame-carbon-gray-oem", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "All Spares", publisher: "All Spares", url: "https://all-spares.com/en/lcd-compatible-with-xiaomi-redmi-note-13-pro-black-with-frame-copy-tft/", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
  { name: "4Phones", publisher: "4Phones.nl B.V.", url: "https://4phones.eu/products/xiaomi-redmi-note-13-pro-5g-2312dra50c-2312crad3c-poco-x6-23122pcd1g-display-and-digitizer-without-frame-black-oem", sourceType: VerificationSourceType.TRUSTED_SUPPLIER, trustLevel: 3 },
] as const;

const UNKNOWN_CLAIMS = {
  fingerprint: "UNKNOWN",
  refreshRate: "UNKNOWN",
  brightness: "UNKNOWN",
  colorAccuracy: "UNKNOWN",
} as const;

export const SCREEN_CANDIDATES = [
  {
    normalizedPartCode: "fixshop-5600010k7s00-service-pack",
    manufacturerCode: "5600010K7S00",
    aliases: ["5600010K7S00", "5600010K7T00", "5600010K7P00"],
    name: "شاشة Service Pack أصلية مع إطار — عائلة Redmi Note 11",
    deviceModelNumbers: ["2201117TG", "2201117TI", "2201117SG", "2201117SI", "2201117PI"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[0].url,
    evidenceDetails: "FixShop lists a genuine Xiaomi Service Pack display with frame for the exact five regional model codes and manufacturer codes 5600010K7S00/7T00/7P00.",
    technicalNotes: "Service Pack أصلي مع إطار وفق كتالوج المورّد؛ يلزم إبقاء أكواد المناطق منفصلة.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "SERVICE_PACK", technology: "UNKNOWN", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITH_FRAME", supplier: "FixShop", supplierProductCode: "5600010K7S00", claims: UNKNOWN_CLAIMS, publicationWarning: "مؤهل لمراجعة أقوى، لكن لا ينشر قبل مطابقة رقم القطعة مع كل كود منطقة." },
  },
  {
    normalizedPartCode: "fixshop-xiar13c-02",
    manufacturerCode: "XIAR13C-02",
    aliases: ["XIAR13C-02", "1100305440"],
    name: "شاشة TFT بديلة بدون إطار — Redmi 13C / POCO C65",
    deviceModelNumbers: ["23100RN82L", "2310FPCA4G"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[1].url,
    evidenceDetails: "FixShop explicitly lists Redmi 13C and POCO C65 for aftermarket screen match code XIAR13C-02.",
    technicalNotes: "TFT بديلة بدون إطار؛ خصائص السطوع والتردد غير محسومة.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "TFT_AFTERMARKET", technology: "TFT_LCD", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITHOUT_FRAME", supplier: "FixShop", supplierProductCode: "XIAR13C-02", claims: UNKNOWN_CLAIMS, publicationWarning: "لا تنشر قبل التحقق من أداء 90Hz والسطوع على الجهازين." },
  },
  {
    normalizedPartCode: "4phones-a00000283",
    manufacturerCode: "A00000283",
    aliases: ["A00000283"],
    name: "شاشة مُسوّقة كجودة OEM بدون إطار — Redmi 13C / POCO C65",
    deviceModelNumbers: ["23100RN82L", "2310FPCA4G"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[2].url,
    evidenceDetails: "4Phones catalog lists Redmi 13C and POCO C65 under supplier SKU A00000283 and labels the quality OEM.",
    technicalNotes: "OEM هنا تصنيف مورّد وليس Service Pack مصنعي.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "OEM_MARKETED", technology: "UNKNOWN", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITHOUT_FRAME", supplier: "4Phones", supplierProductCode: "A00000283", claims: UNKNOWN_CLAIMS, publicationWarning: "لا تعرض كأصلية دون رقم قطعة Xiaomi رسمي." },
  },
  {
    normalizedPartCode: "allspares-905415",
    manufacturerCode: "905415",
    aliases: ["905415"],
    name: "شاشة Original PRC IPS بدون إطار — Note 10 5G / POCO M3 Pro 5G",
    deviceModelNumbers: ["M2103K19G", "M2103K19PG"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[3].url,
    evidenceDetails: "All Spares product 905415 explicitly lists both models, IPS matrix, touchscreen, without frame, and supplier quality Original PRC.",
    technicalNotes: "Original PRC تصنيف مورّد ولا يساوي Service Pack من Xiaomi.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "ORIGINAL_PRC", technology: "IPS_LCD", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITHOUT_FRAME", supplier: "All Spares", supplierProductCode: "905415", claims: UNKNOWN_CLAIMS, publicationWarning: "تحقق من التردد والسطوع قبل النشر." },
  },
  {
    normalizedPartCode: "4phones-a00005744",
    manufacturerCode: "A00005744",
    aliases: ["A00005744"],
    name: "شاشة مُسوّقة كجودة OEM بدون إطار — Note 10 5G / POCO M3 Pro 5G",
    deviceModelNumbers: ["M2103K19G", "M2103K19PG"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[4].url,
    evidenceDetails: "4Phones lists exact global model codes M2103K19G and M2103K19PG under SKU A00005744.",
    technicalNotes: "OEM هنا تصنيف مورّد وليس Service Pack مصنعي.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "OEM_MARKETED", technology: "UNKNOWN", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITHOUT_FRAME", supplier: "4Phones", supplierProductCode: "A00005744", claims: UNKNOWN_CLAIMS, publicationWarning: "لا تعرض كأصلية دون رقم قطعة Xiaomi رسمي." },
  },
  {
    normalizedPartCode: "allspares-905323",
    manufacturerCode: "905323",
    aliases: ["905323"],
    name: "شاشة High Copy بدون إطار — Redmi 9T / POCO M3",
    deviceModelNumbers: ["M2010J19SG", "M2010J19CG"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[5].url,
    evidenceDetails: "All Spares product 905323 explicitly lists Redmi 9T and POCO M3, High Copy, without frame.",
    technicalNotes: "High Copy بدون إطار؛ التقنية والأداء غير محسومين.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "HIGH_COPY", technology: "UNKNOWN", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITHOUT_FRAME", supplier: "All Spares", supplierProductCode: "905323", claims: UNKNOWN_CLAIMS, publicationWarning: "لا تنشر قبل حسم تقنية اللوحة وجودة العرض." },
  },
  {
    normalizedPartCode: "4phones-a00005757",
    manufacturerCode: "A00005757",
    aliases: ["A00005757"],
    name: "شاشة مُسوّقة كجودة OEM مع إطار — Redmi 9T / POCO M3",
    deviceModelNumbers: ["M2010J19SG", "M2010J19CG"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[6].url,
    evidenceDetails: "4Phones lists exact global codes M2010J19SG and M2010J19CG under framed supplier SKU A00005757.",
    technicalNotes: "نسخة Carbon Gray مع إطار؛ OEM تصنيف مورّد.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "OEM_MARKETED", technology: "UNKNOWN", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITH_FRAME", supplier: "4Phones", supplierProductCode: "A00005757", claims: UNKNOWN_CLAIMS, publicationWarning: "تحقق من لون الإطار ولا تعرض كأصلية دون إثبات مصنعي." },
  },
  {
    normalizedPartCode: "allspares-919885",
    manufacturerCode: "919885",
    aliases: ["919885"],
    name: "شاشة TFT Copy بدون إطار — Note 13 Pro 5G / POCO X6",
    deviceModelNumbers: ["2312DRA50C", "23122PCD1G"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[7].url,
    evidenceDetails: "All Spares product 919885 explicitly lists Redmi Note 13 Pro 5G and POCO X6 as a TFT copy without frame.",
    technicalNotes: "تحويل من AMOLED الأصلي إلى TFT قد يخفض الأداء؛ البصمة والتردد غير محسومين.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "TFT_AFTERMARKET", technology: "TFT_LCD", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITHOUT_FRAME", supplier: "All Spares", supplierProductCode: "919885", claims: { ...UNKNOWN_CLAIMS, refreshRate: "REDUCED" }, publicationWarning: "لا تنشر كبديل مباشر؛ اختلاف التقنية عن AMOLED الأصلي جوهري." },
  },
  {
    normalizedPartCode: "4phones-a00000367",
    manufacturerCode: "A00000367",
    aliases: ["A00000367"],
    name: "شاشة مُسوّقة كجودة OEM بدون إطار — Note 13 Pro 5G / POCO X6",
    deviceModelNumbers: ["2312DRA50C", "23122PCD1G"],
    sourceUrl: SCREEN_CANDIDATE_SOURCES[8].url,
    evidenceDetails: "4Phones lists model codes 2312DRA50C and 23122PCD1G under supplier SKU A00000367.",
    technicalNotes: "OEM هنا تصنيف مورّد؛ التقنية وخصائص البصمة لم تُذكر.",
    specifications: { schemaVersion: 1, recordKind: "INSTALLABLE_SCREEN", quality: "OEM_MARKETED", technology: "UNKNOWN", assembly: "DISPLAY_AND_DIGITIZER", frame: "WITHOUT_FRAME", supplier: "4Phones", supplierProductCode: "A00000367", claims: UNKNOWN_CLAIMS, publicationWarning: "لا تعرض كأصلية أو AMOLED قبل إثبات التقنية ورقم القطعة المصنعي." },
  },
] as const;

export const SCREEN_CANDIDATE_COMPATIBILITY_TYPE = CompatibilityType.FUNCTIONAL_EQUIVALENT;
export const SCREEN_CANDIDATE_VERIFICATION_LEVEL = VerificationLevel.SUPPLIER_CATALOG;
export const SCREEN_CANDIDATE_LICENSE_NOTE = "Public product catalog used for manual compatibility research. Bulk reuse requires supplier permission.";
