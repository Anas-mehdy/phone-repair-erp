import { PartCategory } from "@prisma/client";

export const COMPATIBILITY_DATASETS = {
  SCREEN: {
    sourceCategory: "3. FOLDER/DISPLAY/COMBO",
    mappedCategory: PartCategory.SCREEN,
  },
  BATTERY: {
    sourceCategory: "7. BATTERY LIST",
    mappedCategory: PartCategory.BATTERY,
  },
  CHARGING_PORT: {
    sourceCategory: "9. CHARGING SUB BOARD",
    mappedCategory: PartCategory.CHARGING_PORT,
  },
  DISPLAY_CONNECTOR: {
    sourceCategory: "4. DISPLAY CONNECTOR",
    mappedCategory: PartCategory.CONNECTOR,
  },
  POWER_FLEX: {
    sourceCategory: "8. POWER VOLUME FLEX",
    mappedCategory: PartCategory.CONNECTOR,
  },
  FRAME: {
    sourceCategory: "5. FRAME / MIDDLE FRAME",
    mappedCategory: PartCategory.HOUSING_FRAME,
  },
  BACK_COVER: {
    sourceCategory: "6. BACK COVER",
    mappedCategory: PartCategory.HOUSING_FRAME,
  },
  TEMPERED_GLASS: {
    sourceCategory: "1. TEMPERED/GLASS GUARD",
    mappedCategory: PartCategory.OTHER,
  },
  TOUCH_GLASS: {
    sourceCategory: "2. TOUCH / OCA GLASS",
    mappedCategory: PartCategory.OTHER,
  },
} as const;

export type CompatibilityDatasetKey = keyof typeof COMPATIBILITY_DATASETS;

export function isCompatibilityDatasetKey(value: string): value is CompatibilityDatasetKey {
  return Object.prototype.hasOwnProperty.call(COMPATIBILITY_DATASETS, value);
}

export function datasetKeyForSourceCategory(sourceCategory?: string | null): CompatibilityDatasetKey {
  const match = Object.entries(COMPATIBILITY_DATASETS).find(
    ([, config]) => config.sourceCategory === sourceCategory,
  );
  return (match?.[0] as CompatibilityDatasetKey | undefined) || "SCREEN";
}
