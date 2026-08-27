import { auditCandidateSection, CandidateImportAudit } from "./candidate-import";
import type { PartCategory } from "@prisma/client";
import {
  COMPATIBILITY_DATASETS,
  CompatibilityDatasetKey,
} from "./compatibility-datasets";

export const REMAINING_DATASET_KEYS = [
  "CHARGING_PORT",
  "DISPLAY_CONNECTOR",
  "POWER_FLEX",
  "FRAME",
  "BACK_COVER",
  "TEMPERED_GLASS",
  "TOUCH_GLASS",
] as const satisfies readonly CompatibilityDatasetKey[];

const MAX_GROUP_SIZE: Record<(typeof REMAINING_DATASET_KEYS)[number], number> = {
  CHARGING_PORT: 20,
  DISPLAY_CONNECTOR: 25,
  POWER_FLEX: 20,
  FRAME: 20,
  BACK_COVER: 20,
  TEMPERED_GLASS: 35,
  TOUCH_GLASS: 35,
};

export interface AuditedCompatibilityDataset extends CandidateImportAudit {
  datasetKey: (typeof REMAINING_DATASET_KEYS)[number];
  mappedCategory: PartCategory;
}

export function auditRemainingCompatibilitySections(input: unknown): AuditedCompatibilityDataset[] {
  return REMAINING_DATASET_KEYS.map((datasetKey) => {
    const config = COMPATIBILITY_DATASETS[datasetKey];
    return {
      datasetKey,
      mappedCategory: config.mappedCategory,
      ...auditCandidateSection(input, {
        categoryName: config.sourceCategory,
        maxGroupSize: MAX_GROUP_SIZE[datasetKey],
      }),
    };
  });
}
