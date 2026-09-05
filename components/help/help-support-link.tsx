"use client";

import Link from "next/link";
import { Headphones } from "lucide-react";
import { captureClientEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export function HelpSupportLink({ articleSlug }: { articleSlug: string }) {
  return <Link href="/support" onClick={() => captureClientEvent(ANALYTICS_EVENTS.HELP_SUPPORT_ESCALATED, { source: "help_article", article_slug: articleSlug })} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[11px] font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><Headphones className="h-4 w-4" />ما زلت أحتاج مساعدة</Link>;
}
