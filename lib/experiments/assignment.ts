import { createHash } from "node:crypto";
import type { WeightedExperimentVariant } from "@/lib/experiments/catalog";

export const EXPERIMENT_BUCKETS = 10_000 as const;

export function experimentBucket(input: { subjectId: string; experimentKey: string; salt: string }) {
  const digest = createHash("sha256")
    .update(`${input.salt}:${input.experimentKey}:${input.subjectId}`)
    .digest();
  const value = digest.readUInt32BE(0);
  return value % EXPERIMENT_BUCKETS;
}

export function chooseWeightedVariant<T extends string>(input: {
  subjectId: string;
  experimentKey: string;
  salt: string;
  variants: readonly WeightedExperimentVariant<T>[];
}): T {
  const total = input.variants.reduce((sum, variant) => sum + variant.weight, 0);
  if (total !== EXPERIMENT_BUCKETS) {
    throw new Error(`Experiment weights must total ${EXPERIMENT_BUCKETS}; received ${total}.`);
  }
  const bucket = experimentBucket(input);
  let cursor = 0;
  for (const variant of input.variants) {
    cursor += variant.weight;
    if (bucket < cursor) return variant.key;
  }
  return input.variants[input.variants.length - 1]!.key;
}

export type ExperimentRuntimeMode = "OFF" | "RUNNING" | "PAUSED";

export function experimentRuntimeMode(value: string | undefined | null): ExperimentRuntimeMode {
  const normalized = value?.trim().toLowerCase();
  if (["on", "true", "1", "run", "running"].includes(normalized ?? "")) return "RUNNING";
  if (["pause", "paused"].includes(normalized ?? "")) return "PAUSED";
  return "OFF";
}

export function experimentFlagEnabled(value: string | undefined | null) {
  return experimentRuntimeMode(value) === "RUNNING";
}
