"use client";

import { useEffect } from "react";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { HelpCategory } from "@/lib/help/catalog";

export function HelpCenterViewTracker({ initialCategory }: { initialCategory: HelpCategory | null }) {
  useEffect(() => {
    captureClientEvent(ANALYTICS_EVENTS.HELP_CENTER_VIEWED, {
      initial_category: initialCategory ?? "ALL",
    });
  }, [initialCategory]);
  return null;
}
