export const EXPERIMENT_STATUS = ["READY", "RUNNING", "PAUSED", "ARCHIVED"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUS)[number];

export type WeightedExperimentVariant<T extends string> = {
  key: T;
  weight: number;
  label: string;
};

export const ONBOARDING_VALUE_COPY_EXPERIMENT = {
  key: "onboarding_value_copy_v1",
  label: "Onboarding value-focused copy",
  hypothesis: "صياغة البداية حول الوصول لأول قيمة ستزيد نسبة First Value بدون خفض إكمال الـOnboarding.",
  primaryMetric: "first_value_rate",
  guardrailMetric: "onboarding_completion_rate",
  envKey: "GROWTH_EXPERIMENT_ONBOARDING_VALUE_COPY_V1",
  salt: "massar:onboarding-value-copy:v1",
  controlVariant: "CONTROL",
  variants: [
    { key: "CONTROL", weight: 5000, label: "النص الحالي" },
    { key: "VALUE_FOCUSED", weight: 5000, label: "نص يركز على أول قيمة" },
  ] as const,
} as const;

export type OnboardingValueCopyVariant = (typeof ONBOARDING_VALUE_COPY_EXPERIMENT.variants)[number]["key"];
export type GrowthExperimentKey = typeof ONBOARDING_VALUE_COPY_EXPERIMENT.key;

export const GROWTH_EXPERIMENTS = [ONBOARDING_VALUE_COPY_EXPERIMENT] as const;

export function isOnboardingValueCopyVariant(value: unknown): value is OnboardingValueCopyVariant {
  return ONBOARDING_VALUE_COPY_EXPERIMENT.variants.some((variant) => variant.key === value);
}
