import type { OnboardingJob } from "@/lib/onboarding/jobs";

export const MONETIZATION_TRIAL_ENDING_HOURS = 48 as const;

export const MONETIZATION_STAGES = [
  "PRE_VALUE",
  "FIRST_VALUE",
  "HABIT",
  "TRIAL_ENDING",
  "TRIAL_EXPIRED",
] as const;

export type MonetizationStage = (typeof MONETIZATION_STAGES)[number];

export type MonetizationState = {
  flowVersion: number;
  stage: MonetizationStage;
  primaryJob: OnboardingJob | null;
  operationCount: number;
  activeDayCount: number;
  remainingTrialHours: number;
  activationHref: string;
  subscriptionHref: string;
};

export type MonetizationRuleInput = {
  flowVersion: number;
  effectiveStatus: string;
  isLifetime: boolean;
  trialEndsAt: Date;
  currentPeriodStartedAt: Date | null;
  operationCount: number;
  activeDayCount: number;
  now?: Date;
};

const HOUR_MS = 60 * 60 * 1000;

export function resolveMonetizationStage(input: MonetizationRuleInput): MonetizationStage | null {
  if (input.isLifetime) return null;

  const now = input.now ?? new Date();
  const operationCount = Math.max(0, Math.trunc(input.operationCount));
  const activeDayCount = Math.max(0, Math.trunc(input.activeDayCount));

  if (input.effectiveStatus === "EXPIRED") {
    // A paid subscription that later expired is retention/renewal, not first-trial monetization.
    return input.currentPeriodStartedAt ? null : "TRIAL_EXPIRED";
  }

  if (input.effectiveStatus !== "TRIALING") return null;

  const remainingTrialHours = Math.max(0, (input.trialEndsAt.getTime() - now.getTime()) / HOUR_MS);
  if (remainingTrialHours <= MONETIZATION_TRIAL_ENDING_HOURS) return "TRIAL_ENDING";
  if (operationCount >= 3 && activeDayCount >= 2) return "HABIT";
  if (operationCount > 0) return "FIRST_VALUE";
  return "PRE_VALUE";
}

export function shouldShowDashboardMonetization(stage: MonetizationStage) {
  return stage === "HABIT" || stage === "TRIAL_ENDING" || stage === "TRIAL_EXPIRED";
}

export function monetizationOperationBucket(operationCount: number) {
  if (operationCount <= 0) return "0";
  if (operationCount < 3) return "1_2";
  return "3_plus";
}

export function monetizationActiveDayBucket(activeDayCount: number) {
  if (activeDayCount <= 0) return "0";
  if (activeDayCount === 1) return "1";
  return "2_plus";
}

export function monetizationRemainingTrialBucket(remainingTrialHours: number) {
  if (remainingTrialHours <= 0) return "expired";
  if (remainingTrialHours <= 24) return "0_24h";
  if (remainingTrialHours <= 48) return "24_48h";
  if (remainingTrialHours <= 72) return "48_72h";
  return "72h_plus";
}

export function monetizationAnalyticsProperties(state: Pick<MonetizationState, "stage" | "primaryJob" | "operationCount" | "activeDayCount" | "remainingTrialHours" | "flowVersion">) {
  return {
    monetization_stage: state.stage.toLowerCase(),
    primary_job: state.primaryJob,
    operation_bucket: monetizationOperationBucket(state.operationCount),
    active_day_bucket: monetizationActiveDayBucket(state.activeDayCount),
    remaining_trial_bucket: monetizationRemainingTrialBucket(state.remainingTrialHours),
    flow_version: state.flowVersion,
  };
}

export const monetizationOnboarding = {
  resolveMonetizationStage,
  shouldShowDashboardMonetization,
  monetizationAnalyticsProperties,
};
