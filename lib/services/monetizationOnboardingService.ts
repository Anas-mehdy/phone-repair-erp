import "server-only";

import type { EntitlementContext } from "@/lib/services/subscriptionEntitlementService";
import {
  monetizationOnboarding,
  type MonetizationState,
} from "@/lib/monetization/onboarding";
import {
  CURRENT_ONBOARDING_FLOW_VERSION,
  isOnboardingJob,
  normalizeOnboardingJobs,
  type OnboardingJob,
} from "@/lib/onboarding/jobs";
import { onboardingDestination } from "@/lib/onboarding/navigation";
import { activationChecklistService } from "@/lib/services/activationChecklistService";
import { onboardingService } from "@/lib/services/onboardingService";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";

const HOUR_MS = 60 * 60 * 1000;

type StateInput = {
  shopId: string;
  timeZone: string;
  entitlement?: EntitlementContext;
  now?: Date;
};

export async function getMonetizationOnboardingState(input: StateInput): Promise<MonetizationState | null> {
  const now = input.now ?? new Date();
  const profile = await onboardingService.getOnboardingProfile(input.shopId);
  if (!profile || profile.flowVersion !== CURRENT_ONBOARDING_FLOW_VERSION || profile.skippedAt) return null;

  const selectedJobs = normalizeOnboardingJobs(profile.selectedJobs);
  const primaryJob: OnboardingJob | null = profile.primaryJob && isOnboardingJob(profile.primaryJob) && selectedJobs.includes(profile.primaryJob)
    ? profile.primaryJob
    : null;

  const entitlement = input.entitlement ?? await entitlementService.getEntitlementContext(input.shopId, now);
  const subscription = entitlement.subscription;

  // Paid/lifetime states are not part of first-trial monetization. Avoid loading
  // activation data for those users.
  const stageWithoutActivity = monetizationOnboarding.resolveMonetizationStage({
    flowVersion: profile.flowVersion,
    effectiveStatus: subscription.effectiveStatus,
    isLifetime: subscription.isLifetime,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodStartedAt: subscription.currentPeriodStartedAt,
    operationCount: 0,
    activeDayCount: 0,
    now,
  });
  if (!stageWithoutActivity) return null;

  let operationCount = 0;
  let activeDayCount = 0;

  if (subscription.effectiveStatus === "TRIALING" && profile.completedAt && primaryJob) {
    try {
      const activation = await activationChecklistService.getActivationChecklistState(input.shopId, input.timeZone, now);
      if (!activation) return null;
      operationCount = activation.operationCount;
      activeDayCount = activation.activeDayCount;
    } catch {
      // Monetization guidance must fail closed rather than show the wrong sales moment.
      return null;
    }
  }

  const stage = monetizationOnboarding.resolveMonetizationStage({
    flowVersion: profile.flowVersion,
    effectiveStatus: subscription.effectiveStatus,
    isLifetime: subscription.isLifetime,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodStartedAt: subscription.currentPeriodStartedAt,
    operationCount,
    activeDayCount,
    now,
  });
  if (!stage) return null;

  const remainingTrialHours = Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / HOUR_MS));
  const activationHref = primaryJob ? onboardingDestination(primaryJob) : "/onboarding";

  return {
    flowVersion: profile.flowVersion,
    stage,
    primaryJob,
    operationCount,
    activeDayCount,
    remainingTrialHours,
    activationHref,
    subscriptionHref: "/subscription",
  };
}

export const monetizationOnboardingService = {
  getState: getMonetizationOnboardingState,
};
