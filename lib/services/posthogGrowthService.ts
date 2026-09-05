import "server-only";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export type PostHogGrowthTelemetry = {
  status: "ok" | "unconfigured" | "error";
  promptViewed: number;
  subscriptionViewed: number;
  upgradeClicked: number;
  subscriptionActivated: number;
  errorCode: string | null;
};

type QueryResponse = { results?: unknown };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function empty(status: PostHogGrowthTelemetry["status"], errorCode: string | null = null): PostHogGrowthTelemetry {
  return { status, promptViewed: 0, subscriptionViewed: 0, upgradeClicked: 0, subscriptionActivated: 0, errorCode };
}

function sqlString(value: string) {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

function config() {
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  const apiHost = process.env.POSTHOG_API_HOST?.trim().replace(/\/$/, "");
  if (!personalApiKey || !projectId || !apiHost || !/^https:\/\//i.test(apiHost)) return null;
  return { personalApiKey, projectId, apiHost };
}

function parseCount(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
}

export async function getPostHogGrowthTelemetry(input: {
  shopIds: string[];
  from: Date;
  to: Date;
}): Promise<PostHogGrowthTelemetry> {
  const cfg = config();
  if (!cfg) return empty("unconfigured");

  const shopIds = [...new Set(input.shopIds.filter((value) => UUID_RE.test(value)))];
  if (shopIds.length === 0) return empty("ok");

  const eventNames = [
    ANALYTICS_EVENTS.MONETIZATION_PROMPT_VIEWED,
    ANALYTICS_EVENTS.SUBSCRIPTION_VIEWED,
    ANALYTICS_EVENTS.UPGRADE_CLICKED,
    ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED,
  ];
  const environment = process.env.POSTHOG_GROWTH_ENVIRONMENT?.trim();
  const environmentClause = environment
    ? `AND toString(properties.app_environment) = ${sqlString(environment)}`
    : "";
  const query = `
    SELECT event, count(DISTINCT toString(properties.shop_id)) AS shops
    FROM events
    WHERE event IN (${eventNames.map(sqlString).join(", ")})
      AND timestamp >= parseDateTimeBestEffort(${sqlString(input.from.toISOString())})
      AND timestamp < parseDateTimeBestEffort(${sqlString(input.to.toISOString())})
      AND toString(properties.shop_id) IN (${shopIds.map(sqlString).join(", ")})
      ${environmentClause}
    GROUP BY event
  `;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${cfg.apiHost}/api/projects/${encodeURIComponent(cfg.projectId)}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.personalApiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    });
    if (!response.ok) return empty("error", `http_${response.status}`);
    const payload = await response.json() as QueryResponse;
    if (!Array.isArray(payload.results)) return empty("error", "invalid_response");

    const counts = new Map<string, number>();
    for (const row of payload.results) {
      if (!Array.isArray(row) || typeof row[0] !== "string") continue;
      counts.set(row[0], parseCount(row[1]));
    }
    return {
      status: "ok",
      promptViewed: counts.get(ANALYTICS_EVENTS.MONETIZATION_PROMPT_VIEWED) ?? 0,
      subscriptionViewed: counts.get(ANALYTICS_EVENTS.SUBSCRIPTION_VIEWED) ?? 0,
      upgradeClicked: counts.get(ANALYTICS_EVENTS.UPGRADE_CLICKED) ?? 0,
      subscriptionActivated: counts.get(ANALYTICS_EVENTS.SUBSCRIPTION_ACTIVATED) ?? 0,
      errorCode: null,
    };
  } catch (error) {
    return empty("error", error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error");
  } finally {
    clearTimeout(timer);
  }
}

export const posthogGrowthService = { getTelemetry: getPostHogGrowthTelemetry };
