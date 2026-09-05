import { getCurrentShopContext } from "@/lib/current-shop";
import { activationChecklistService } from "@/lib/services/activationChecklistService";
import { ActivationChecklistClient } from "./activation-checklist-client";

export async function ActivationChecklist() {
  try {
    const context = await getCurrentShopContext();
    if (context.membershipRole !== "OWNER") return null;

    const state = await activationChecklistService.getActivationChecklistState(
      context.shopId,
      context.timeZone,
    );
    if (!state) return null;

    return (
      <ActivationChecklistClient
        storageScope={context.shopId}
        state={{
          flowVersion: state.flowVersion,
          firstWeekWindowOpen: state.firstWeekWindowOpen,
          selectedJobs: state.selectedJobs,
          primaryJob: state.primaryJob,
          jobs: state.jobs.map((job) => ({
            job: job.job,
            activityCount: job.activityCount,
            activated: job.activated,
            primary: job.primary,
            dataAvailable: job.dataAvailable,
          })),
          operationCount: state.operationCount,
          activeDayCount: state.activeDayCount,
          operationProgress: state.operationProgress,
          activeDayProgress: state.activeDayProgress,
          overallProgress: state.overallProgress,
          activatedSelectedJobCount: state.activatedSelectedJobCount,
          habitAchieved: state.habitAchieved,
          nextJob: state.nextJob,
          nextJobAlreadyActivated: state.nextJobAlreadyActivated,
        }}
      />
    );
  } catch {
    // Activation guidance must never make the dashboard unavailable.
    return null;
  }
}
