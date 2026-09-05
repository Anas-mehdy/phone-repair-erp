"use client";

import { useEffect } from "react";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { HelpCategory } from "@/lib/help/catalog";

export function HelpArticleTracker({ slug, category }: { slug: string; category: HelpCategory }) {
  useEffect(() => {
    captureClientEvent(ANALYTICS_EVENTS.HELP_ARTICLE_VIEWED, {
      article_slug: slug,
      category,
    });
  }, [slug, category]);
  return null;
}
