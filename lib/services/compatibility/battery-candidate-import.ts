import { normalizeSearchString } from "./normalization";

export const BATTERY_SOURCE_CATEGORY = "7. BATTERY LIST";

export type BatteryCandidateStatus =
  | "READY_FOR_CORROBORATION"
  | "NEEDS_REVIEW"
  | "QUARANTINED";

export interface BatteryCandidateMember {
  rawModelName: string;
  normalizedModelName: string;
  position: number;
}

export interface BatteryCandidateGroup {
  sourceGroupId: string;
  brandSection: string;
  rawSourceText: string;
  contributor: string | null;
  batteryCode: string;
  capacityMah: number | null;
  confidenceScore: number;
  status: BatteryCandidateStatus;
  issues: string[];
  members: BatteryCandidateMember[];
}

interface SourceEntry {
  entry_index?: unknown;
  group_id?: unknown;
  raw_source_text?: unknown;
  contributor?: unknown;
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
  categories?: unknown;
}

export interface BatteryCandidateAudit {
  categoryName: string;
  groups: BatteryCandidateGroup[];
  stats: {
    sourceRows: number;
    groups: number;
    members: number;
    readyForCorroboration: number;
    needsReview: number;
    quarantined: number;
  };
}

const DEVICE_PREFIX = /^(iphone|apple|samsung(?:\s+galaxy)?|galaxy|xiaomi|redmi|poco|mi|oppo|realme|oneplus|vivo|iqoo|motorola|moto|nokia|lenovo|honor|huawei|infinix|tecno|itel|lava)\b/i;
const HEADING_WORDS = /universal battery list|please wait|coming soon/i;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanLine(value: string): string {
  return value
    .replace(/^\s*\d+\s*[.)-]\s*/, "")
    .replace(/[✅✔️]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferredPrefix(firstDevice: string): string {
  const match = firstDevice.match(DEVICE_PREFIX);
  if (!match) return "";
  const value = match[0];
  if (/^samsung\s+galaxy$/i.test(value)) return "Samsung Galaxy";
  return value;
}

function normalizeDeviceNames(parts: string[]): string[] {
  const cleaned = parts
    .map((part) => part.replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (cleaned.length === 0) return [];

  const prefix = inferredPrefix(cleaned[0]);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of cleaned) {
    const withPrefix = prefix && !DEVICE_PREFIX.test(value) ? `${prefix} ${value}` : value;
    const normalized = normalizeSearchString(withPrefix);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(withPrefix);
  }
  return result;
}

function findCapacity(value: string): { value: number; raw: string; index: number } | null {
  for (const match of value.matchAll(/\b(\d{3,5})(?:\s*mAh)?\b/gi)) {
    const capacity = Number(match[1]);
    if (capacity >= 600 && capacity <= 12_000 && match.index !== undefined) {
      return { value: capacity, raw: match[0], index: match.index };
    }
  }
  return null;
}

export function parseBatterySourceText(rawSourceText: string): {
  batteryCode: string;
  capacityMah: number | null;
  devices: string[];
} | null {
  const text = cleanLine(rawSourceText);
  if (!text || HEADING_WORDS.test(text)) return null;

  let batteryCode = "";
  let capacityMah: number | null = null;
  let deviceParts: string[] = [];

  if (text.includes("=")) {
    const parts = text.split("=").map((part) => part.trim()).filter(Boolean);
    batteryCode = parts.shift() || "";
    const capacityMatch = findCapacity(batteryCode);
    if (capacityMatch) {
      capacityMah = capacityMatch.value;
      batteryCode = batteryCode.replace(capacityMatch.raw, "").trim();
    } else if (parts.length > 0) {
      const standaloneCapacity = findCapacity(parts[0]);
      if (standaloneCapacity && parts[0].replace(standaloneCapacity.raw, "").trim() === "") {
        capacityMah = standaloneCapacity.value;
        parts.shift();
      }
    }
    deviceParts = parts;
  } else {
    const capacityMatch = findCapacity(text);
    if (!capacityMatch) return null;
    capacityMah = capacityMatch.value;
    batteryCode = text.slice(0, capacityMatch.index).trim();
    const devicesText = text.slice(capacityMatch.index + capacityMatch.raw.length).trim();
    deviceParts = devicesText.split(/[\/=]/).map((part) => part.trim()).filter(Boolean);
  }

  batteryCode = batteryCode.replace(/^[/=\s]+|[/=\s]+$/g, "").replace(/\s+/g, " ");
  const devices = normalizeDeviceNames(deviceParts);
  if (!batteryCode || devices.length === 0) return null;
  return { batteryCode, capacityMah, devices };
}

export function auditBatteryCandidates(input: unknown): BatteryCandidateAudit {
  if (!input || typeof input !== "object") throw new Error("Invalid source document");
  const document = input as SourceDocument;
  if (!Array.isArray(document.categories)) throw new Error("Source categories are missing");

  const category = (document.categories as SourceCategory[]).find(
    (item) => asString(item.category_name) === BATTERY_SOURCE_CATEGORY
  );
  if (!category || !Array.isArray(category.brands)) {
    throw new Error(`Battery category not found: ${BATTERY_SOURCE_CATEGORY}`);
  }

  const groups: BatteryCandidateGroup[] = [];
  let sourceRows = 0;

  for (const rawBrand of category.brands as SourceBrand[]) {
    const brandSection = asString(rawBrand.brand_name) || "UNKNOWN";
    if (!Array.isArray(rawBrand.entries)) continue;

    for (const rawEntry of rawBrand.entries as SourceEntry[]) {
      sourceRows += 1;
      const rawSourceText = asString(rawEntry.raw_source_text);
      const parsed = parseBatterySourceText(rawSourceText);
      if (!parsed) continue;

      const issues: string[] = [];
      if (parsed.batteryCode.length > 80) issues.push("BATTERY_CODE_TOO_LONG");
      if (parsed.capacityMah !== null && (parsed.capacityMah < 600 || parsed.capacityMah > 12_000)) {
        issues.push("INVALID_CAPACITY");
      }
      if (parsed.devices.length > 20) issues.push("GIANT_GROUP");
      if (parsed.devices.some((device) => /^\d+$/.test(device) || normalizeSearchString(device).length < 2)) {
        issues.push("INVALID_DEVICE_TOKEN");
      }

      const entryIndex = Number(rawEntry.entry_index) || groups.length + 1;
      groups.push({
        sourceGroupId: asString(rawEntry.group_id) || `BATTERY-${brandSection}-${entryIndex}`,
        brandSection,
        rawSourceText,
        contributor: asString(rawEntry.contributor) || null,
        batteryCode: parsed.batteryCode,
        capacityMah: parsed.capacityMah,
        confidenceScore: 0,
        status: "READY_FOR_CORROBORATION",
        issues,
        members: parsed.devices.map((rawModelName, position) => ({
          rawModelName,
          normalizedModelName: normalizeSearchString(rawModelName),
          position,
        })),
      });
    }
  }

  const memberships = new Map<string, BatteryCandidateGroup[]>();
  for (const group of groups) {
    for (const member of group.members) {
      const key = `${group.brandSection.toLowerCase()}::${member.normalizedModelName}`;
      const matches = memberships.get(key) || [];
      matches.push(group);
      memberships.set(key, matches);
    }
  }

  for (const matches of memberships.values()) {
    const distinctCodes = new Set(matches.map((group) => normalizeSearchString(group.batteryCode)));
    if (distinctCodes.size < 2) continue;
    for (const group of matches) {
      if (!group.issues.includes("CROSS_CODE_OVERLAP")) group.issues.push("CROSS_CODE_OVERLAP");
    }
  }

  for (const group of groups) {
    const severe = group.issues.some((issue) =>
      ["INVALID_CAPACITY", "GIANT_GROUP", "INVALID_DEVICE_TOKEN", "BATTERY_CODE_TOO_LONG"].includes(issue)
    );
    group.confidenceScore = Math.max(0, Math.min(80, 72 - group.issues.length * 18));
    group.status = severe
      ? "QUARANTINED"
      : group.issues.length > 0
        ? "NEEDS_REVIEW"
        : "READY_FOR_CORROBORATION";
  }

  return {
    categoryName: BATTERY_SOURCE_CATEGORY,
    groups,
    stats: {
      sourceRows,
      groups: groups.length,
      members: groups.reduce((sum, group) => sum + group.members.length, 0),
      readyForCorroboration: groups.filter((group) => group.status === "READY_FOR_CORROBORATION").length,
      needsReview: groups.filter((group) => group.status === "NEEDS_REVIEW").length,
      quarantined: groups.filter((group) => group.status === "QUARANTINED").length,
    },
  };
}
