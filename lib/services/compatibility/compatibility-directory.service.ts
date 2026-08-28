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
  inventoryItems: CompatibilityDirectoryInventoryItem[];
  matchType: "EXACT" | "PREFIX" | "PARTIAL";
  alternativeGroupCount: number;
}

export interface CompatibilityDirectoryInventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
}

const VISIBLE_CANDIDATE_STATUSES: CompatibilityCandidateStatus[] = [
  CompatibilityCandidateStatus.READY_FOR_CORROBORATION,
  CompatibilityCandidateStatus.APPROVED,
];

const SEARCHABLE_BATCH_STATUSES: CompatibilityImportStatus[] = [
  CompatibilityImportStatus.READY_FOR_REVIEW,
  CompatibilityImportStatus.IMPORTED,
];

export function classifyCompatibilityDirectoryMatch(
  deviceName: string,
  query: string,
): "EXACT" | "PREFIX" | "PARTIAL" {
  const normalizedName = normalizeSearchString(deviceName);
  const normalizedQuery = normalizeSearchString(query);
  if (normalizedName === normalizedQuery || normalizedName.endsWith(normalizedQuery)) return "EXACT";
  if (normalizedName.startsWith(normalizedQuery) || normalizedName.includes(normalizedQuery)) return "PREFIX";
  return "PARTIAL";
}

function relevanceScore(deviceName: string, normalizedQuery: string): number {
  const matchType = classifyCompatibilityDirectoryMatch(deviceName, normalizedQuery);
  return matchType === "EXACT" ? 0 : matchType === "PREFIX" ? 1 : 2;
}

/**
 * Read-only technician directory. Review and quarantined rows never reach this API.
 */
export async function searchCompatibilityDirectory(
  query: string,
  options: { shopId: string; dataset?: CompatibilityDatasetKey; limit?: number }
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
          inventoryLinks: {
            where: {
              inventoryItem: {
                shopId: options.shopId,
                deletedAt: null,
              },
            },
            select: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  quantity: true,
                  unitPrice: true,
                  shop: { select: { currency: true } },
                },
              },
            },
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

  const results: CompatibilityDirectoryResult[] = [];
  const resultMeta = new Map<string, { index: number; signatures: Set<string> }>();

  for (const match of matches) {
    const uniqueKey = `${match.candidateGroup.brandSection.toLowerCase()}::${match.normalizedModelName}`;
    const signature = match.candidateGroup.members
      .map((member) => normalizeSearchString(member.rawModelName))
      .sort()
      .join("::");
    const existing = resultMeta.get(uniqueKey);
    if (existing) {
      existing.signatures.add(signature);
      results[existing.index].alternativeGroupCount = Math.max(0, existing.signatures.size - 1);
      continue;
    }
    if (results.length >= limit) continue;

    const batteryDetails = dataset === "BATTERY"
      ? parseBatterySourceText(match.candidateGroup.rawSourceText)
      : null;

    const normalizedName = match.normalizedModelName;
    const result: CompatibilityDirectoryResult = {
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
      inventoryItems: match.candidateGroup.inventoryLinks.map(({ inventoryItem }) => ({
        id: inventoryItem.id,
        name: inventoryItem.name,
        sku: inventoryItem.sku,
        quantity: inventoryItem.quantity,
        unitPrice: Number(inventoryItem.unitPrice),
        currency: inventoryItem.shop.currency,
      })),
      matchType: classifyCompatibilityDirectoryMatch(normalizedName, normalizedQuery),
      alternativeGroupCount: 0,
    };
    results.push(result);
    resultMeta.set(uniqueKey, { index: results.length - 1, signatures: new Set([signature]) });
  }

  return results;
}

export async function getCompatibilityGroupSelection(groupId: string) {
  return prisma.compatibilityCandidateGroup.findFirst({
    where: {
      id: groupId,
      status: { in: VISIBLE_CANDIDATE_STATUSES },
      batch: { status: { in: SEARCHABLE_BATCH_STATUSES } },
    },
    select: {
      id: true,
      brandSection: true,
      mappedCategory: true,
      batch: { select: { categoryName: true } },
      members: {
        orderBy: { position: "asc" },
        select: { id: true, rawModelName: true },
      },
    },
  });
}
