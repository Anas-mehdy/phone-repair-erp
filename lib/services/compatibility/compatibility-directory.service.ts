import {
  CompatibilityCandidateStatus,
  CompatibilityImportStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseBatterySourceText } from "./battery-candidate-import";
import {
  COMPATIBILITY_DATASETS,
  CompatibilityDatasetKey,
} from "./compatibility-datasets";
import { normalizeSearchString } from "./normalization";

export interface CompatibilityDirectoryDevice {
  id: string;
  name: string;
}

export interface CompatibilityDirectoryResult {
  id: string;
  groupId: string;
  deviceName: string;
  brandSection: string;
  compatibilityCount: number;
  compatibleDevices: CompatibilityDirectoryDevice[];
  partCode: string | null;
  capacityMah: number | null;
}

const VISIBLE_CANDIDATE_STATUSES: CompatibilityCandidateStatus[] = [
  CompatibilityCandidateStatus.READY_FOR_CORROBORATION,
  CompatibilityCandidateStatus.APPROVED,
];

const SEARCHABLE_BATCH_STATUSES: CompatibilityImportStatus[] = [
  CompatibilityImportStatus.READY_FOR_REVIEW,
  CompatibilityImportStatus.IMPORTED,
];

function relevanceScore(deviceName: string, normalizedQuery: string): number {
  const normalizedName = normalizeSearchString(deviceName);
  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;
  return 2;
}

/**
 * Read-only technician directory. Review and quarantined rows never reach this API.
 */
export async function searchCompatibilityDirectory(
  query: string,
  options: { dataset?: CompatibilityDatasetKey; limit?: number } = {}
): Promise<CompatibilityDirectoryResult[]> {
  const normalizedQuery = normalizeSearchString(query);
  if (normalizedQuery.length < 2) return [];

  const dataset = options.dataset || "SCREEN";
  const datasetConfig = COMPATIBILITY_DATASETS[dataset];
  const category = datasetConfig.mappedCategory;
  const limit = Math.min(Math.max(options.limit || 30, 1), 50);

  const matches = await prisma.compatibilityCandidateMember.findMany({
    where: {
      normalizedModelName: { contains: normalizedQuery },
      candidateGroup: {
        status: { in: VISIBLE_CANDIDATE_STATUSES },
        mappedCategory: category,
        batch: {
          status: { in: SEARCHABLE_BATCH_STATUSES },
          categoryName: datasetConfig.sourceCategory,
        },
      },
    },
    select: {
      id: true,
      rawModelName: true,
      normalizedModelName: true,
      candidateGroup: {
        select: {
          id: true,
          brandSection: true,
          confidenceScore: true,
          rawSourceText: true,
          members: {
            orderBy: { position: "asc" },
            select: { id: true, rawModelName: true },
          },
        },
      },
    },
    take: 200,
  });

  matches.sort((a, b) => {
    const relevance = relevanceScore(a.rawModelName, normalizedQuery) - relevanceScore(b.rawModelName, normalizedQuery);
    if (relevance !== 0) return relevance;
    if (a.candidateGroup.confidenceScore !== b.candidateGroup.confidenceScore) {
      return b.candidateGroup.confidenceScore - a.candidateGroup.confidenceScore;
    }
    return a.rawModelName.localeCompare(b.rawModelName, "en", { numeric: true });
  });

  const seen = new Set<string>();
  const results: CompatibilityDirectoryResult[] = [];

  for (const match of matches) {
    const uniqueKey = `${match.candidateGroup.brandSection.toLowerCase()}::${match.normalizedModelName}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const batteryDetails = dataset === "BATTERY"
      ? parseBatterySourceText(match.candidateGroup.rawSourceText)
      : null;

    results.push({
      id: match.id,
      groupId: match.candidateGroup.id,
      deviceName: match.rawModelName,
      brandSection: match.candidateGroup.brandSection,
      compatibilityCount: match.candidateGroup.members.length,
      compatibleDevices: match.candidateGroup.members.map((member) => ({
        id: member.id,
        name: member.rawModelName,
      })),
      partCode: batteryDetails?.batteryCode || null,
      capacityMah: batteryDetails?.capacityMah || null,
    });

    if (results.length >= limit) break;
  }

  return results;
}
