import {
  CURRENT_ONBOARDING_FLOW_VERSION,
  isOnboardingJob,
  normalizeOnboardingJobs,
  type OnboardingJob,
} from "@/lib/onboarding/jobs";

export const ACTIVATION_OPERATION_GOAL = 3 as const;
export const ACTIVATION_ACTIVE_DAY_GOAL = 2 as const;
export const ACTIVATION_FIRST_WEEK_DAYS = 7 as const;
export const ACTIVATION_CHECKLIST_MAX_AGE_DAYS = 14 as const;

export type ActivationJobActivity = {
  job: OnboardingJob;
  activityCount: number;
  activeDays: string[];
  firstActivityAt: Date | null;
  dataAvailable: boolean;
};

export type ActivationJobProgress = ActivationJobActivity & {
  activated: boolean;
  primary: boolean;
};

export type ActivationChecklistState = {
  flowVersion: number;
  startedAt: Date;
  firstWeekEndsAt: Date;
  expiresAt: Date;
  firstWeekWindowOpen: boolean;
  selectedJobs: OnboardingJob[];
  primaryJob: OnboardingJob;
  jobs: ActivationJobProgress[];
  operationCount: number;
  activeDayCount: number;
  operationProgress: number;
  activeDayProgress: number;
  overallProgress: number;
  activatedSelectedJobCount: number;
  habitAchieved: boolean;
  nextJob: OnboardingJob;
  nextJobAlreadyActivated: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function activationChecklistExpiresAt(startedAt: Date) {
  return new Date(startedAt.getTime() + ACTIVATION_CHECKLIST_MAX_AGE_DAYS * DAY_MS);
}

export function activationFirstWeekEndsAt(startedAt: Date) {
  return new Date(startedAt.getTime() + ACTIVATION_FIRST_WEEK_DAYS * DAY_MS);
}

export function buildActivationChecklistState(input: {
  flowVersion: number;
  startedAt: Date;
  selectedJobs: readonly unknown[];
  primaryJob: unknown;
  jobActivity: readonly ActivationJobActivity[];
  now?: Date;
}): ActivationChecklistState {
  if (input.flowVersion !== CURRENT_ONBOARDING_FLOW_VERSION) {
    throw new Error("إصدار إعداد البداية غير مدعوم.");
  }
  if (!isOnboardingJob(input.primaryJob)) {
    throw new Error("القسم الأساسي في إعداد البداية غير صالح.");
  }

  const selectedJobs = normalizeOnboardingJobs(input.selectedJobs);
  if (selectedJobs.length === 0 || !selectedJobs.includes(input.primaryJob)) {
    throw new Error("اختيارات إعداد البداية غير مكتملة.");
  }

  const activityByJob = new Map(input.jobActivity.map((activity) => [activity.job, activity]));
  const orderedJobs = [input.primaryJob, ...selectedJobs.filter((job) => job !== input.primaryJob)];
  const jobs: ActivationJobProgress[] = orderedJobs.map((job) => {
    const raw = activityByJob.get(job);
    const activityCount = Math.max(0, Math.trunc(raw?.activityCount ?? 0));
    return {
      job,
      activityCount,
      activeDays: [...new Set(raw?.activeDays ?? [])].sort(),
      firstActivityAt: raw?.firstActivityAt ?? null,
      dataAvailable: raw?.dataAvailable ?? false,
      activated: activityCount > 0,
      primary: job === input.primaryJob,
    };
  });

  const operationCount = jobs.reduce((sum, job) => sum + job.activityCount, 0);
  const activeDays = new Set<string>();
  for (const job of jobs) {
    for (const day of job.activeDays) activeDays.add(day);
  }
  const activeDayCount = activeDays.size;
  const operationProgress = Math.min(operationCount, ACTIVATION_OPERATION_GOAL);
  const activeDayProgress = Math.min(activeDayCount, ACTIVATION_ACTIVE_DAY_GOAL);
  const operationRatio = operationProgress / ACTIVATION_OPERATION_GOAL;
  const dayRatio = activeDayProgress / ACTIVATION_ACTIVE_DAY_GOAL;
  const overallProgress = Math.round(((operationRatio + dayRatio) / 2) * 100);
  const habitAchieved = operationCount >= ACTIVATION_OPERATION_GOAL && activeDayCount >= ACTIVATION_ACTIVE_DAY_GOAL;
  const firstIncomplete = jobs.find((job) => job.dataAvailable && !job.activated);
  const primary = jobs.find((job) => job.primary) ?? jobs[0];
  const next = firstIncomplete ?? primary;
  const now = input.now ?? new Date();
  const firstWeekEndsAt = activationFirstWeekEndsAt(input.startedAt);

  return {
    flowVersion: input.flowVersion,
    startedAt: input.startedAt,
    firstWeekEndsAt,
    expiresAt: activationChecklistExpiresAt(input.startedAt),
    firstWeekWindowOpen: now.getTime() <= firstWeekEndsAt.getTime(),
    selectedJobs,
    primaryJob: input.primaryJob,
    jobs,
    operationCount,
    activeDayCount,
    operationProgress,
    activeDayProgress,
    overallProgress,
    activatedSelectedJobCount: jobs.filter((job) => job.activated).length,
    habitAchieved,
    nextJob: next.job,
    nextJobAlreadyActivated: next.activated,
  };
}

export const activationChecklist = {
  buildActivationChecklistState,
  activationChecklistExpiresAt,
  activationFirstWeekEndsAt,
};
