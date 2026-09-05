import { growthExperimentDashboardService } from "@/lib/services/growthExperimentDashboardService";
import { GrowthExperimentsDashboard } from "./_experiments-dashboard";

export const dynamic = "force-dynamic";

export default async function GrowthExperimentsPage() {
  const data = await growthExperimentDashboardService.getDashboard();
  return <GrowthExperimentsDashboard data={data} />;
}
