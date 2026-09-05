import "server-only";

import { MembershipRole, MembershipStatus, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ANALYTICS_SCHEMA_VERSION,
  type AnalyticsEventName,
  type AnalyticsProperties,
} from "@/lib/analytics/events";
import {
  ANALYTICS_ACQUISITION_COOKIE,
  analyticsAcquisitionProperties,
} from "@/lib/analytics/acquisition";

const DEFAULT_TIMEOUT_MS = 700;

type PostHogConfig = { token: string; host: string };

type ServerAnalyticsEvent = {
  event: AnalyticsEventName;
  distinctId: string;
  shopId?: string | null;
  countryCode?: string | null;
  properties?: AnalyticsProperties;
  includeAcquisition?: boolean;
};

function getPostHogConfig(): PostHogConfig | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/$/, "");
  if (!token || !host) return null;
  if (!/^https?:\/\//i.test(host)) return null;
  return { token, host };
}

async function readAcquisitionProperties() {
  try {
    const store = await cookies();
    const raw = store.get(ANALYTICS_ACQUISITION_COOKIE)?.value;
    if (!raw) return {};
    const decoded = decodeURIComponent(raw);
    return analyticsAcquisitionProperties(JSON.parse(decoded));
  } catch {
    return {};
  }
}

async function sendPostHogEvent(
  config: PostHogConfig,
  input: ServerAnalyticsEvent,
  acquisition: AnalyticsProperties,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    await fetch(`${config.host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        api_key: config.token,
        event: input.event,
        distinct_id: input.distinctId,
        properties: {
          ...acquisition,
          ...input.properties,
          shop_id: input.shopId ?? undefined,
          country_code: input.countryCode ?? undefined,
          analytics_schema_version: ANALYTICS_SCHEMA_VERSION,
          analytics_source: "server",
          app_environment:
            process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        },
      }),
    });
  } catch {
    // Analytics must never break a core ERP operation.
  } finally {
    clearTimeout(timer);
  }
}

export async function captureServerEvent(input: ServerAnalyticsEvent) {
  const config = getPostHogConfig();
  if (!config) return;

  const acquisition = input.includeAcquisition === false
    ? {}
    : await readAcquisitionProperties();

  try {
    after(() => sendPostHogEvent(config, input, acquisition));
  } catch {
    // Safe fallback for tests or non-request callers where Next's `after` context is unavailable.
    await sendPostHogEvent(config, input, acquisition);
  }
}

async function resolveShopOwnerId(shopId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      shopId,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
      deletedAt: null,
    },
    select: { userId: true },
  });
  if (membership?.userId) return membership.userId;

  const legacyOwner = await prisma.user.findFirst({
    where: { shopId, role: UserRole.OWNER, deletedAt: null },
    select: { id: true },
  });
  return legacyOwner?.id ?? null;
}

export async function captureShopOwnerEvent(input: {
  event: AnalyticsEventName;
  shopId: string;
  countryCode?: string | null;
  properties?: AnalyticsProperties;
}) {
  const config = getPostHogConfig();
  if (!config) return;

  try {
    const ownerId = await resolveShopOwnerId(input.shopId);
    if (!ownerId) return;
    await captureServerEvent({
      ...input,
      distinctId: ownerId,
      includeAcquisition: false,
    });
  } catch {
    // Conversion analytics must never affect subscription activation.
  }
}
