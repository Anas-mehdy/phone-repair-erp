import type { AnalyticsProperties } from "@/lib/analytics/events";

export const ANALYTICS_ACQUISITION_COOKIE = "masar_growth_source";
export const ANALYTICS_ACQUISITION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const ANALYTICS_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type AnalyticsAttributionKey = (typeof ANALYTICS_ATTRIBUTION_KEYS)[number];
export type AnalyticsAcquisition = Partial<Record<AnalyticsAttributionKey, string>> & {
  referring_domain?: string;
};

function safeValue(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 160) : undefined;
}

export function sanitizeAnalyticsAcquisition(value: unknown): AnalyticsAcquisition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const result: AnalyticsAcquisition = {};

  for (const key of ANALYTICS_ATTRIBUTION_KEYS) {
    const safe = safeValue(record[key]);
    if (safe) result[key] = safe;
  }
  const referringDomain = safeValue(record.referring_domain);
  if (referringDomain) result.referring_domain = referringDomain;
  return result;
}

export function analyticsAcquisitionProperties(value: unknown): AnalyticsProperties {
  return sanitizeAnalyticsAcquisition(value);
}
