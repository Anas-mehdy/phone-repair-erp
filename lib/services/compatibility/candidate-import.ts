import { normalizeSearchString } from "./normalization";

export const SCREEN_SOURCE_CATEGORY = "3. FOLDER/DISPLAY/COMBO";

export type CandidateStatus =
  | "READY_FOR_CORROBORATION"
  | "NEEDS_REVIEW"
  | "QUARANTINED";

export interface CandidateMember {
  rawModelName: string;
  normalizedModelName: string;
  position: number;
}
export interface CandidateGroup {
  sourceGroupId: string;
  brandSection: string;
  rawSourceText: string;
  contributor: string | null;
  confidenceScore: number;
  status: CandidateStatus;
  issues: string[];
  members: CandidateMember[];
}

interface SourceEntry {
  group_id?: unknown;
  raw_source_text?: unknown;
  contributor?: unknown;
  parsed_models?: unknown;
  is_parsed_compatibility_group?: unknown;
}

interface SourceBrand {
  brand_name?: unknown;
  entries?: unknown;
}

interface SourceCategory {
  category_name?: unknown;
  brands?: unknown;
}

interface SourceDocument {
  summary?: unknown;
  categories?: unknown;
}

export interface CandidateImportAudit {
  categoryName: string;
  groups: CandidateGroup[];
  stats: {
    groups: number;
    members: number;
    readyForCorroboration: number;
    needsReview: number;
    quarantined: number;
    duplicateMemberships: number;
  };
}

const BRAND_WORDS = new Set([
  "apple", "iphone", "samsung", "xiaomi", "redmi", "poco", "realme",
  "oppo", "oneplus", "vivo", "iqoo", "infinix", "tecno", "itel",
  "lava", "moto", "motorola", "nokia", "honor", "huawei",
]);

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function brandWordCount(value: string): number {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => BRAND_WORDS.has(word)).length;
}

function uniqueModels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const raw = asString(item).replace(/\s+/g, " ");
    const normalized = normalizeSearchString(raw);
    if (!raw || !normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(raw);
  }
  return result;
}

function scoreAndClassify(group: Pick<CandidateGroup, "members" | "issues">): {
  confidenceScore: number;
  status: CandidateStatus;
} {
  const severe = group.issues.some((issue) =>
    ["GIANT_GROUP", "MERGED_MODEL_NAMES", "INVALID_MODEL_TOKEN", "TOO_FEW_MODELS"].includes(issue)
  );

  let score = 45;
  if (group.members.length <= 5) score += 10;
  else if (group.members.length <= 10) score += 5;
  if (group.members.length > 20) score -= 25;
  if (group.issues.includes("CROSS_GROUP_OVERLAP")) score -= 10;
  if (group.issues.includes("AMBIGUOUS_REVISION")) score -= 10;
  if (group.issues.includes("MERGED_MODEL_NAMES")) score -= 25;
  if (group.issues.includes("INVALID_MODEL_TOKEN")) score -= 25;
  score = Math.max(0, Math.min(60, score));

  if (severe) return { confidenceScore: score, status: "QUARANTINED" };
  if (group.issues.length > 0) return { confidenceScore: score, status: "NEEDS_REVIEW" };
  return { confidenceScore: score, status: "READY_FOR_CORROBORATION" };
}

/**
 * Converts the external screen list into isolated research candidates.
 * It deliberately does not create Device, Part, or DeviceCompatibility records.
 */
export function auditCandidateSection(
  input: unknown,
  options: { categoryName: string; maxGroupSize?: number }
): CandidateImportAudit {
  if (!input || typeof input !== "object") throw new Error("Invalid source document");
  const document = input as SourceDocument;
  if (!Array.isArray(document.categories)) throw new Error("Source categories are missing");

  const category = (document.categories as SourceCategory[]).find(
    (item) => asString(item.category_name) === options.categoryName
  );
  if (!category || !Array.isArray(category.brands)) {
    throw new Error(`Compatibility category not found: ${options.categoryName}`);
  }

  const maxGroupSize = options.maxGroupSize ?? 20;

  const groups: CandidateGroup[] = [];
  for (const rawBrand of category.brands as SourceBrand[]) {
    const brandSection = asString(rawBrand.brand_name) || "UNKNOWN";
    if (!Array.isArray(rawBrand.entries)) continue;

    for (const rawEntry of rawBrand.entries as SourceEntry[]) {
      if (rawEntry.is_parsed_compatibility_group !== true) continue;
      const sourceGroupId = asString(rawEntry.group_id);
      const rawSourceText = asString(rawEntry.raw_source_text);
      const models = uniqueModels(rawEntry.parsed_models);
      const issues: string[] = [];

      if (!sourceGroupId) issues.push("MISSING_GROUP_ID");
      if (models.length < 2) issues.push("TOO_FEW_MODELS");
      if (models.length > maxGroupSize) issues.push("GIANT_GROUP");
      if (models.some((model) => brandWordCount(model) > 1)) issues.push("MERGED_MODEL_NAMES");
      if (models.some((model) => /^\d+$/.test(model) || normalizeSearchString(model).length < 3)) {
        issues.push("INVALID_MODEL_TOKEN");
      }
      if (models.some((model) => /(?:Â|âœ|�|✅)/u.test(model))) {
        issues.push("INVALID_MODEL_TOKEN");
      }
      if (models.some((model) => /\b(new|old|center camera|china|global)\b/i.test(model))) {
        issues.push("AMBIGUOUS_REVISION");
      }

      const members = models.map((rawModelName, position) => ({
        rawModelName,
        normalizedModelName: normalizeSearchString(rawModelName),
        position,
      }));
      groups.push({
        sourceGroupId: sourceGroupId || `MISSING-${brandSection}-${groups.length + 1}`,
        brandSection,
        rawSourceText,
        contributor: asString(rawEntry.contributor) || null,
        confidenceScore: 0,
        status: "NEEDS_REVIEW",
        issues: [...new Set(issues)],
        members,
      });
    }
  }

  const memberships = new Map<string, CandidateGroup[]>();
  for (const group of groups) {
    for (const member of group.members) {
      const key = `${group.brandSection.toLowerCase()}::${member.normalizedModelName}`;
      const matches = memberships.get(key) || [];
      matches.push(group);
      memberships.set(key, matches);
    }
  }

  let duplicateMemberships = 0;
  for (const matches of memberships.values()) {
    if (matches.length < 2) continue;
    duplicateMemberships += matches.length;
    for (const group of matches) {
      if (!group.issues.includes("CROSS_GROUP_OVERLAP")) group.issues.push("CROSS_GROUP_OVERLAP");
    }
  }

  for (const group of groups) Object.assign(group, scoreAndClassify(group));

  return {
    categoryName: options.categoryName,
    groups,
    stats: {
      groups: groups.length,
      members: groups.reduce((sum, group) => sum + group.members.length, 0),
      readyForCorroboration: groups.filter((group) => group.status === "READY_FOR_CORROBORATION").length,
      needsReview: groups.filter((group) => group.status === "NEEDS_REVIEW").length,
      quarantined: groups.filter((group) => group.status === "QUARANTINED").length,
      duplicateMemberships,
    },
  };
}

export function auditScreenCandidates(input: unknown): CandidateImportAudit {
  return auditCandidateSection(input, {
    categoryName: SCREEN_SOURCE_CATEGORY,
    maxGroupSize: 20,
  });
}
