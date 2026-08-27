export const SCREEN_QUALITY_LABELS = {
  SERVICE_PACK: "Service Pack أصلية",
  OEM_PULLED: "أصلية مسحوبة من جهاز",
  OEM_MARKETED: "مُسوّقة كجودة OEM",
  ORIGINAL_PRC: "Original PRC (تصنيف مورّد)",
  OLED_AFTERMARKET: "OLED بديلة",
  INCELL: "Incell بديلة",
  TFT_AFTERMARKET: "TFT بديلة",
  HIGH_COPY: "High Copy",
  UNKNOWN: "الجودة غير محسومة",
} as const;

export const SCREEN_TECHNOLOGY_LABELS = {
  AMOLED: "AMOLED",
  OLED: "OLED",
  INCELL_LCD: "Incell LCD",
  IPS_LCD: "IPS LCD",
  TFT_LCD: "TFT LCD",
  UNKNOWN: "التقنية غير محسومة",
} as const;

export const SCREEN_FRAME_LABELS = {
  WITH_FRAME: "مع إطار",
  WITHOUT_FRAME: "بدون إطار",
  UNKNOWN: "الإطار غير محسوم",
} as const;

export const SCREEN_FEATURE_LABELS = {
  CONFIRMED: "مؤكدة",
  NOT_SUPPORTED: "غير مدعومة",
  REDUCED: "أداء أقل من الأصلي",
  UNKNOWN: "غير محسومة",
} as const;

export type ScreenQuality = keyof typeof SCREEN_QUALITY_LABELS;
export type ScreenTechnology = keyof typeof SCREEN_TECHNOLOGY_LABELS;
export type ScreenFrame = keyof typeof SCREEN_FRAME_LABELS;
export type ScreenFeatureState = keyof typeof SCREEN_FEATURE_LABELS;

export interface ScreenSpecifications {
  schemaVersion: 1;
  recordKind: "INSTALLABLE_SCREEN";
  quality: ScreenQuality;
  technology: ScreenTechnology;
  assembly: "DISPLAY_AND_DIGITIZER";
  frame: ScreenFrame;
  supplier: string;
  supplierProductCode: string | null;
  claims: {
    fingerprint: ScreenFeatureState;
    refreshRate: ScreenFeatureState;
    brightness: ScreenFeatureState;
    colorAccuracy: ScreenFeatureState;
  };
  publicationWarning: string;
}

export interface ScreenSpecificationSummary {
  quality: ScreenQuality;
  qualityLabel: string;
  technology: ScreenTechnology;
  technologyLabel: string;
  frame: ScreenFrame;
  frameLabel: string;
  supplier: string;
  supplierProductCode: string | null;
  unresolvedClaims: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKeyOf<T extends object>(value: unknown, object: T): value is keyof T {
  return typeof value === "string" && value in object;
}

export function summarizeScreenSpecifications(value: unknown): ScreenSpecificationSummary | null {
  if (!isRecord(value) || value.recordKind !== "INSTALLABLE_SCREEN") return null;
  if (!isKeyOf(value.quality, SCREEN_QUALITY_LABELS)) return null;
  if (!isKeyOf(value.technology, SCREEN_TECHNOLOGY_LABELS)) return null;
  if (!isKeyOf(value.frame, SCREEN_FRAME_LABELS)) return null;

  const claims = isRecord(value.claims) ? value.claims : {};
  const unresolvedClaims = Object.entries(claims)
    .filter(([, state]) => state === "UNKNOWN")
    .map(([claim]) => claim);

  return {
    quality: value.quality,
    qualityLabel: SCREEN_QUALITY_LABELS[value.quality],
    technology: value.technology,
    technologyLabel: SCREEN_TECHNOLOGY_LABELS[value.technology],
    frame: value.frame,
    frameLabel: SCREEN_FRAME_LABELS[value.frame],
    supplier: typeof value.supplier === "string" ? value.supplier : "غير محدد",
    supplierProductCode: typeof value.supplierProductCode === "string" ? value.supplierProductCode : null,
    unresolvedClaims,
  };
}
