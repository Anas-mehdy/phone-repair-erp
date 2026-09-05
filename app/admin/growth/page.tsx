import { isOnboardingJob, type OnboardingJob } from "@/lib/onboarding/jobs";
import { growthDashboardService } from "@/lib/services/growthDashboardService";
import { GrowthDashboardView } from "./_growth-dashboard";

export const dynamic = "force-dynamic";

type SearchParams = { range?: string; job?: string };

function rangeValue(value?: string): 7 | 30 | 90 {
  return value === "7" ? 7 : value === "90" ? 90 : 30;
}

export default async function AdminGrowthPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const rangeDays = rangeValue(query.range);
  const primaryJob: OnboardingJob | undefined = query.job && isOnboardingJob(query.job) ? query.job : undefined;
  const data = await growthDashboardService.getDashboard({ rangeDays, primaryJob });
  return <GrowthDashboardView data={data} />;
}
