import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SmartEmptyStateCard } from "@/components/onboarding/smart-empty-state-card";
import { getCurrentShopContext } from "@/lib/current-shop";
import { smartEmptyStateCopy } from "@/lib/onboarding/smart-empty-state";
import {
  CURRENT_ONBOARDING_FLOW_VERSION,
  normalizeOnboardingJobs,
  type OnboardingJob,
} from "@/lib/onboarding/jobs";
import { onboardingService } from "@/lib/services/onboardingService";

export async function SmartEmptyState({
  job,
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  job: OnboardingJob;
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  try {
    const context = await getCurrentShopContext();
    if (context.membershipRole === "OWNER") {
      const state = await onboardingService.getShopOnboardingState(context.shopId);
      const profile = state.profile;
      const selectedJobs = normalizeOnboardingJobs(profile?.selectedJobs ?? []);
      const guided = Boolean(
        profile &&
          profile.flowVersion === CURRENT_ONBOARDING_FLOW_VERSION &&
          profile.completedAt &&
          !profile.skippedAt &&
          selectedJobs.includes(job) &&
          !state.signals[job].activated,
      );

      if (guided) {
        const copy = smartEmptyStateCopy(job);
        return <SmartEmptyStateCard job={job} {...copy} />;
      }
    }
  } catch {
    // Empty-state guidance must never make the business page unavailable.
  }

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      actionHref={actionHref}
      actionLabel={actionLabel}
    />
  );
}
