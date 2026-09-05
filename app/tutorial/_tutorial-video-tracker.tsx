"use client";

import { useEffect } from "react";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { captureClientEvent } from "@/lib/analytics/client";
import type { TutorialVideoCategoryKey } from "@/lib/tutorial/categories";

export function TutorialVideoTracker({ categoryKey }: { categoryKey: TutorialVideoCategoryKey }) {
  useEffect(() => {
    captureClientEvent(ANALYTICS_EVENTS.TUTORIAL_VIDEO_OPENED, {
      tutorial_category: categoryKey,
      source: "tutorial_library",
    });
  }, [categoryKey]);

  return null;
}
