import { HelpCenterClient } from "./_help-center-client";
import { HELP_CATEGORY_LABELS, type HelpCategory } from "@/lib/help/catalog";
import { HelpCenterViewTracker } from "./_help-center-view-tracker";

export const dynamic = "force-dynamic";
export const metadata = { title: "مركز المساعدة | مسار" };

export default async function HelpCenterPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const query = await searchParams;
  const initialCategory = query.category && Object.prototype.hasOwnProperty.call(HELP_CATEGORY_LABELS, query.category)
    ? query.category as HelpCategory
    : null;

  return <div className="mx-auto max-w-6xl"><HelpCenterViewTracker initialCategory={initialCategory} /><HelpCenterClient initialCategory={initialCategory} /></div>;
}
