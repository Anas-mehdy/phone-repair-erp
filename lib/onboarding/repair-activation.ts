export const REPAIR_ONBOARDING_STORAGE_PREFIX = "masar_repair_activation_v1";

export type RepairActivationClientProgress = {
  trackingPreviewed: boolean;
  receiptPreviewed: boolean;
};

export const EMPTY_REPAIR_ACTIVATION_PROGRESS: RepairActivationClientProgress = {
  trackingPreviewed: false,
  receiptPreviewed: false,
};

export function repairActivationStorageKey(repairOrderId: string) {
  return `${REPAIR_ONBOARDING_STORAGE_PREFIX}:${repairOrderId}`;
}

export function parseRepairActivationProgress(value: unknown): RepairActivationClientProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_REPAIR_ACTIVATION_PROGRESS };
  }

  const record = value as Record<string, unknown>;
  return {
    trackingPreviewed: record.trackingPreviewed === true,
    receiptPreviewed: record.receiptPreviewed === true,
  };
}

export function repairStatusWasChanged(status: string) {
  return status !== "PENDING";
}

export function repairActivationCoreStepCount(input: {
  trackingPreviewed: boolean;
  statusChanged: boolean;
}) {
  return 1 + Number(input.trackingPreviewed) + Number(input.statusChanged);
}

export function repairActivationIsComplete(input: {
  trackingPreviewed: boolean;
  statusChanged: boolean;
}) {
  return repairActivationCoreStepCount(input) === 3;
}
