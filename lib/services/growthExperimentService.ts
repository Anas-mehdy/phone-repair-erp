import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ONBOARDING_VALUE_COPY_EXPERIMENT,
  isOnboardingValueCopyVariant,
  type OnboardingValueCopyVariant,
} from "@/lib/experiments/catalog";
import { chooseWeightedVariant, experimentRuntimeMode } from "@/lib/experiments/assignment";

export type ExperimentExposure<T extends string> = {
  active: boolean;
  experimentKey: string;
  variant: T;
  firstExposure: boolean;
};

function onboardingExperimentMode() {
  return experimentRuntimeMode(process.env[ONBOARDING_VALUE_COPY_EXPERIMENT.envKey]);
}

async function existingOnboardingVariant(shopId: string): Promise<OnboardingValueCopyVariant | null> {
  const existing = await prisma.growthExperimentAssignment.findUnique({
    where: {
      shopId_experimentKey: {
        shopId,
        experimentKey: ONBOARDING_VALUE_COPY_EXPERIMENT.key,
      },
    },
    select: { variant: true, firstExposedAt: true },
  });
  if (!existing?.firstExposedAt || !isOnboardingValueCopyVariant(existing.variant)) return null;
  return existing.variant;
}

async function assignAndExposeOnboardingValueCopy(shopId: string, now: Date): Promise<ExperimentExposure<OnboardingValueCopyVariant>> {
  const config = ONBOARDING_VALUE_COPY_EXPERIMENT;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`growth-experiment:${config.key}:${shopId}`}))`;

    let assignment = await tx.growthExperimentAssignment.findUnique({
      where: { shopId_experimentKey: { shopId, experimentKey: config.key } },
    });

    if (!assignment) {
      const variant = chooseWeightedVariant({
        subjectId: shopId,
        experimentKey: config.key,
        salt: config.salt,
        variants: config.variants,
      });
      assignment = await tx.growthExperimentAssignment.create({
        data: { shopId, experimentKey: config.key, variant, assignedAt: now },
      });
    }

    const safeVariant: OnboardingValueCopyVariant = isOnboardingValueCopyVariant(assignment.variant)
      ? assignment.variant
      : config.controlVariant;
    const firstExposure = assignment.firstExposedAt == null;

    await tx.growthExperimentAssignment.update({
      where: { id: assignment.id },
      data: {
        variant: safeVariant,
        firstExposedAt: assignment.firstExposedAt ?? now,
        lastExposedAt: now,
        exposureCount: { increment: 1 },
      },
    });

    return { active: true, experimentKey: config.key, variant: safeVariant, firstExposure };
  });
}

export async function exposeOnboardingValueCopyExperiment(shopId: string, now = new Date()): Promise<ExperimentExposure<OnboardingValueCopyVariant>> {
  const mode = onboardingExperimentMode();
  if (mode === "RUNNING") return assignAndExposeOnboardingValueCopy(shopId, now);

  if (mode === "PAUSED") {
    const existingVariant = await existingOnboardingVariant(shopId);
    return {
      active: false,
      experimentKey: ONBOARDING_VALUE_COPY_EXPERIMENT.key,
      variant: existingVariant ?? ONBOARDING_VALUE_COPY_EXPERIMENT.controlVariant,
      firstExposure: false,
    };
  }

  return {
    active: false,
    experimentKey: ONBOARDING_VALUE_COPY_EXPERIMENT.key,
    variant: ONBOARDING_VALUE_COPY_EXPERIMENT.controlVariant,
    firstExposure: false,
  };
}

export function getExperimentRuntimeState() {
  const mode = onboardingExperimentMode();
  return {
    onboardingValueCopy: {
      ...ONBOARDING_VALUE_COPY_EXPERIMENT,
      mode,
      enabled: mode === "RUNNING",
    },
  };
}

export const growthExperimentService = {
  exposeOnboardingValueCopy: exposeOnboardingValueCopyExperiment,
  getRuntimeState: getExperimentRuntimeState,
};
