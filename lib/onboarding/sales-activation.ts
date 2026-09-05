export const SALES_ONBOARDING_STORAGE_PREFIX = "masar_sales_activation_v1";

export type SalesActivationClientProgress = {
  receiptPreviewed: boolean;
};

export const EMPTY_SALES_ACTIVATION_PROGRESS: SalesActivationClientProgress = {
  receiptPreviewed: false,
};

export function salesActivationStorageKey(saleId: string) {
  return `${SALES_ONBOARDING_STORAGE_PREFIX}:${saleId}`;
}

export function parseSalesActivationProgress(value: unknown): SalesActivationClientProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_SALES_ACTIVATION_PROGRESS };
  }

  const record = value as Record<string, unknown>;
  return {
    receiptPreviewed: record.receiptPreviewed === true,
  };
}

export function salesActivationCoreStepCount(input: { receiptPreviewed: boolean }) {
  return 1 + Number(input.receiptPreviewed);
}

export function salesActivationIsComplete(input: { receiptPreviewed: boolean }) {
  return salesActivationCoreStepCount(input) === 2;
}
