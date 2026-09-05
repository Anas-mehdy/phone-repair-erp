"use client";

import {
  ANALYTICS_SCHEMA_VERSION,
  type AnalyticsEventName,
  type AnalyticsProperties,
} from "@/lib/analytics/events";

type PostHogBrowser = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  register: (properties: Record<string, unknown>) => void;
  reset: () => void;
  startSessionRecording: () => void;
  stopSessionRecording: () => void;
};

export const ANALYTICS_IDENTITY_MARKER = "masar_analytics_identified";

declare global {
  interface Window {
    posthog?: PostHogBrowser;
  }
}

export function isClientAnalyticsEnabled() {
  return typeof window !== "undefined" && Boolean(window.posthog);
}

export function captureClientEvent(
  event: AnalyticsEventName,
  properties: AnalyticsProperties = {},
) {
  if (typeof window === "undefined" || !window.posthog) return;

  window.posthog.capture(event, {
    ...properties,
    analytics_schema_version: ANALYTICS_SCHEMA_VERSION,
    analytics_source: "client",
  });
}

export function identifyAnalyticsUser(
  userId: string,
  properties: AnalyticsProperties = {},
) {
  if (typeof window === "undefined" || !window.posthog) return;

  window.posthog.identify(userId, {
    ...properties,
    analytics_schema_version: ANALYTICS_SCHEMA_VERSION,
  });
}

export function registerAnalyticsContext(properties: AnalyticsProperties) {
  if (typeof window === "undefined" || !window.posthog) return;
  window.posthog.register(properties);
}

export function resetAnalyticsIdentity() {
  if (typeof window === "undefined" || !window.posthog) return;
  window.posthog.reset();
}

export function startAnalyticsSessionRecording() {
  if (typeof window === "undefined" || !window.posthog) return;
  window.posthog.startSessionRecording();
}

export function stopAnalyticsSessionRecording() {
  if (typeof window === "undefined" || !window.posthog) return;
  window.posthog.stopSessionRecording();
}

export function clearAnalyticsSession() {
  stopAnalyticsSessionRecording();
  resetAnalyticsIdentity();
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ANALYTICS_IDENTITY_MARKER);
  } catch {
    // Storage may be blocked; PostHog identity has still been reset.
  }
}
