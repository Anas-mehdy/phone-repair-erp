"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_ACQUISITION_COOKIE,
  ANALYTICS_ACQUISITION_MAX_AGE_SECONDS,
  ANALYTICS_ATTRIBUTION_KEYS,
  analyticsAcquisitionProperties,
} from "@/lib/analytics/acquisition";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  captureClientEvent,
  isClientAnalyticsEnabled,
  registerAnalyticsContext,
  startAnalyticsSessionRecording,
  stopAnalyticsSessionRecording,
} from "@/lib/analytics/client";
import { sanitizeAnalyticsPath } from "@/lib/analytics/path";

const EXCLUDED_PUBLIC_PRODUCT_PATHS = [
  "/track/",
  "/installment-track/",
  "/partner-invite/",
  "/register/partner/",
  "/partners/",
];

function readCookie(name: string) {
  const prefix = `${name}=`;
  const row = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return row ? row.slice(prefix.length) : undefined;
}

function readStoredAcquisition() {
  const raw = readCookie(ANALYTICS_ACQUISITION_COOKIE);
  if (!raw) return {};
  try {
    return analyticsAcquisitionProperties(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return {};
  }
}

function referringDomain() {
  if (!document.referrer) return undefined;
  try {
    const host = new URL(document.referrer).hostname.toLowerCase();
    if (!host || host === window.location.hostname.toLowerCase()) return undefined;
    return host.slice(0, 160);
  } catch {
    return undefined;
  }
}

function resolveAcquisition() {
  const stored = readStoredAcquisition();
  if (Object.keys(stored).length > 0) return stored;

  const params = new URLSearchParams(window.location.search);
  const candidate: Record<string, string> = {};
  for (const key of ANALYTICS_ATTRIBUTION_KEYS) {
    const value = params.get(key)?.trim();
    if (value) candidate[key] = value.slice(0, 160);
  }
  const referrer = referringDomain();
  if (referrer) candidate.referring_domain = referrer;

  const firstTouch = analyticsAcquisitionProperties(candidate);
  if (Object.keys(firstTouch).length > 0) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ANALYTICS_ACQUISITION_COOKIE}=${encodeURIComponent(JSON.stringify(firstTouch))}; Max-Age=${ANALYTICS_ACQUISITION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  }
  return firstTouch;
}

function shouldExcludeProductPage(pathname: string) {
  return EXCLUDED_PUBLIC_PRODUCT_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export function AnalyticsPageTracker({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const formStartCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!pathname || !isClientAnalyticsEnabled()) return;

    // Anonymous replay is allowed only on signup, with maximum privacy masking from the SDK config.
    // Authenticated replay is controlled by AnalyticsIdentity.
    if (!authenticated) {
      if (pathname === "/register") startAnalyticsSessionRecording();
      else stopAnalyticsSessionRecording();
    }

    const safePath = sanitizeAnalyticsPath(pathname);
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    const acquisition = resolveAcquisition();
    if (Object.keys(acquisition).length > 0) registerAnalyticsContext(acquisition);

    if (!shouldExcludeProductPage(pathname)) {
      captureClientEvent(ANALYTICS_EVENTS.APP_PAGE_VIEWED, { path: safePath });
    }

    if (pathname === "/register") captureClientEvent(ANALYTICS_EVENTS.SIGNUP_PAGE_VIEWED, { path: safePath });
    if (pathname === "/subscription") captureClientEvent(ANALYTICS_EVENTS.SUBSCRIPTION_VIEWED, { path: safePath });
    if (pathname === "/repair-orders/new") captureClientEvent(ANALYTICS_EVENTS.REPAIR_FORM_VIEWED, { path: safePath });
    if (pathname === "/sales/new") captureClientEvent(ANALYTICS_EVENTS.SALE_FORM_VIEWED, { path: safePath });
    if (pathname === "/inventory/new") captureClientEvent(ANALYTICS_EVENTS.INVENTORY_FORM_VIEWED, { path: safePath });

    formStartCleanup.current?.();
    formStartCleanup.current = null;
    const startEvent = pathname === "/register"
      ? ANALYTICS_EVENTS.SIGNUP_STARTED
      : pathname === "/repair-orders/new"
        ? ANALYTICS_EVENTS.REPAIR_FORM_STARTED
        : pathname === "/sales/new"
          ? ANALYTICS_EVENTS.SALE_FORM_STARTED
          : pathname === "/inventory/new"
            ? ANALYTICS_EVENTS.INVENTORY_FORM_STARTED
            : null;

    if (!startEvent) return;
    let fired = false;
    const cleanup = () => {
      document.removeEventListener("input", markStarted, true);
      document.removeEventListener("change", markStarted, true);
    };
    const markStarted = (event: Event) => {
      if (fired) return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.closest("form")) return;
      fired = true;
      captureClientEvent(startEvent, { path: safePath });
      cleanup();
    };
    document.addEventListener("input", markStarted, true);
    document.addEventListener("change", markStarted, true);
    formStartCleanup.current = cleanup;
    return cleanup;
  }, [pathname, authenticated]);

  useEffect(() => () => {
    formStartCleanup.current?.();
  }, []);

  return null;
}
