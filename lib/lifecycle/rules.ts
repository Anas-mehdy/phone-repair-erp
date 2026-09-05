import {
  CURRENT_ONBOARDING_FLOW_VERSION,
  normalizeOnboardingJobs,
  type OnboardingJob,
} from "@/lib/onboarding/jobs";

export const LIFECYCLE_MIN_EMAIL_GAP_HOURS = 24 as const;
export const LIFECYCLE_RECENT_ACTIVE_SUPPRESSION_HOURS = 6 as const;
export const LIFECYCLE_NO_FIRST_VALUE_AFTER_HOURS = 20 as const;
export const LIFECYCLE_STALLED_AFTER_HOURS = 48 as const;
export const LIFECYCLE_TRIAL_ENDING_WITHIN_HOURS = 48 as const;

export const LIFECYCLE_MESSAGE_KINDS = [
  "TRIAL_ENDING",
  "ONBOARDING_INCOMPLETE",
  "NO_FIRST_VALUE",
  "HABIT_ONE_DAY",
  "FIRST_VALUE_STALLED",
] as const;

export type LifecycleMessageKind = (typeof LIFECYCLE_MESSAGE_KINDS)[number];

export type LifecycleJobActivity = {
  job: OnboardingJob;
  count: number;
  activeDays: string[];
  firstAt: Date | null;
  lastAt: Date | null;
};

export type LifecycleRuleInput = {
  flowVersion: number;
  now: Date;
  timeZone: string;
  trialStartedAt: Date;
  trialEndsAt: Date;
  subscriptionStatus: string;
  onboardingStartedAt: Date | null;
  onboardingCompletedAt: Date | null;
  onboardingSkippedAt: Date | null;
  primaryJob: OnboardingJob | null;
  selectedJobs: readonly unknown[];
  jobActivity: LifecycleJobActivity[];
  ownerLastActiveAt: Date | null;
  lastLifecycleEmailSentAt: Date | null;
};

export type LifecycleDecision = {
  kind: LifecycleMessageKind;
  priority: number;
  triggerKey: string;
  primaryJob: OnboardingJob | null;
  nextJob: OnboardingJob | null;
  operationCount: number;
  activeDayCount: number;
  remainingTrialHours: number;
};

const HOUR_MS = 60 * 60 * 1000;

function elapsedHours(from: Date | null, to: Date) {
  if (!from) return 0;
  return Math.max(0, (to.getTime() - from.getTime()) / HOUR_MS);
}

export function lifecycleLocalDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function lifecycleTrialKey(input: LifecycleRuleInput) {
  return `${input.trialStartedAt.toISOString()}::${input.trialEndsAt.toISOString()}`;
}

function triggerKey(kind: LifecycleMessageKind, input: LifecycleRuleInput) {
  return `flow:${input.flowVersion}|trial:${lifecycleTrialKey(input)}|kind:${kind}`;
}

function selectedActivity(input: LifecycleRuleInput) {
  const selectedJobs = normalizeOnboardingJobs(input.selectedJobs);
  const selected = input.jobActivity.filter((activity) => selectedJobs.includes(activity.job));
  const operationCount = selected.reduce((sum, item) => sum + Math.max(0, item.count), 0);
  const activeDays = [...new Set(selected.flatMap((item) => item.activeDays))].sort();
  const dated = selected.flatMap((item) => [item.firstAt, item.lastAt]).filter((value): value is Date => Boolean(value));
  const firstCoreActivityAt = dated.length > 0
    ? new Date(Math.min(...dated.map((value) => value.getTime())))
    : null;
  const lastCoreActivityAt = dated.length > 0
    ? new Date(Math.max(...dated.map((value) => value.getTime())))
    : null;
  return { selectedJobs, selected, operationCount, activeDays, firstCoreActivityAt, lastCoreActivityAt };
}

function nextJob(input: LifecycleRuleInput, selected: LifecycleJobActivity[]) {
  const selectedJobs = normalizeOnboardingJobs(input.selectedJobs);
  if (selectedJobs.length === 0) return null;
  const byJob = new Map(selected.map((item) => [item.job, item.count]));
  const inactive = selectedJobs.find((job) => (byJob.get(job) ?? 0) === 0);
  if (inactive) return inactive;
  if (input.primaryJob && selectedJobs.includes(input.primaryJob)) return input.primaryJob;
  return selectedJobs[0] ?? null;
}

function recentOwnerActivitySuppresses(input: LifecycleRuleInput) {
  return Boolean(
    input.ownerLastActiveAt &&
      elapsedHours(input.ownerLastActiveAt, input.now) < LIFECYCLE_RECENT_ACTIVE_SUPPRESSION_HOURS,
  );
}

function cooldownActive(input: LifecycleRuleInput) {
  return Boolean(
    input.lastLifecycleEmailSentAt &&
      elapsedHours(input.lastLifecycleEmailSentAt, input.now) < LIFECYCLE_MIN_EMAIL_GAP_HOURS,
  );
}

export function decideLifecycleMessage(input: LifecycleRuleInput): LifecycleDecision | null {
  if (input.flowVersion !== CURRENT_ONBOARDING_FLOW_VERSION) return null;
  if (input.subscriptionStatus !== "TRIALING") return null;
  if (input.onboardingSkippedAt) return null;
  if (!input.onboardingStartedAt) return null;
  if (input.trialEndsAt.getTime() <= input.now.getTime()) return null;
  if (cooldownActive(input)) return null;

  const activity = selectedActivity(input);
  const primaryJob = input.primaryJob && activity.selectedJobs.includes(input.primaryJob)
    ? input.primaryJob
    : null;
  const remainingTrialHours = Math.max(0, (input.trialEndsAt.getTime() - input.now.getTime()) / HOUR_MS);
  const base = {
    primaryJob,
    nextJob: nextJob(input, activity.selected),
    operationCount: activity.operationCount,
    activeDayCount: activity.activeDays.length,
    remainingTrialHours,
  };

  // Trial expiry is the one lifecycle dependency important enough to override the
  // short "recently active" suppression window. It still respects the global
  // email cooldown and is sent only once per trial trigger key.
  if (remainingTrialHours <= LIFECYCLE_TRIAL_ENDING_WITHIN_HOURS) {
    return {
      ...base,
      kind: "TRIAL_ENDING",
      priority: 100,
      triggerKey: triggerKey("TRIAL_ENDING", input),
    };
  }

  if (recentOwnerActivitySuppresses(input)) return null;

  if (!input.onboardingCompletedAt) {
    if (elapsedHours(input.onboardingStartedAt, input.now) < LIFECYCLE_NO_FIRST_VALUE_AFTER_HOURS) return null;
    return {
      ...base,
      kind: "ONBOARDING_INCOMPLETE",
      priority: 80,
      triggerKey: triggerKey("ONBOARDING_INCOMPLETE", input),
    };
  }

  if (activity.operationCount === 0) {
    if (elapsedHours(input.onboardingCompletedAt, input.now) < LIFECYCLE_NO_FIRST_VALUE_AFTER_HOURS) return null;
    return {
      ...base,
      kind: "NO_FIRST_VALUE",
      priority: 70,
      triggerKey: triggerKey("NO_FIRST_VALUE", input),
    };
  }

  if (activity.operationCount >= 3 && activity.activeDays.length >= 2) return null;

  if (activity.operationCount >= 3 && activity.activeDays.length === 1) {
    const today = lifecycleLocalDateKey(input.now, input.timeZone);
    const lastActivityDay = activity.activeDays[activity.activeDays.length - 1] ?? null;
    if (lastActivityDay && lastActivityDay < today) {
      return {
        ...base,
        kind: "HABIT_ONE_DAY",
        priority: 60,
        triggerKey: triggerKey("HABIT_ONE_DAY", input),
      };
    }
  }

  if (
    activity.operationCount > 0 &&
    activity.operationCount < 3 &&
    activity.lastCoreActivityAt &&
    elapsedHours(activity.lastCoreActivityAt, input.now) >= LIFECYCLE_STALLED_AFTER_HOURS
  ) {
    return {
      ...base,
      kind: "FIRST_VALUE_STALLED",
      priority: 50,
      triggerKey: triggerKey("FIRST_VALUE_STALLED", input),
    };
  }

  return null;
}

export const lifecycleRules = {
  decideLifecycleMessage,
  lifecycleLocalDateKey,
};
