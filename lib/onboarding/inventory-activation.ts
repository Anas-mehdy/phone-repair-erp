export type InventoryActivationClientProgress = {
  movementPreviewed: boolean;
};

export const EMPTY_INVENTORY_ACTIVATION_PROGRESS: InventoryActivationClientProgress = {
  movementPreviewed: false,
};

export function parseInventoryActivationProgress(value: unknown): InventoryActivationClientProgress {
  if (!value || typeof value !== "object") return EMPTY_INVENTORY_ACTIVATION_PROGRESS;
  const raw = value as Record<string, unknown>;
  return { movementPreviewed: raw.movementPreviewed === true };
}

export function inventoryActivationStorageKey(inventoryItemId: string) {
  return `masar_inventory_activation_v1:${inventoryItemId}`;
}

export function inventoryActivationCoreStepCount(
  progress: InventoryActivationClientProgress,
  hasOpeningMovement: boolean,
) {
  return 1 + (hasOpeningMovement ? 1 : 0) + (progress.movementPreviewed ? 1 : 0);
}

export function inventoryActivationIsComplete(
  progress: InventoryActivationClientProgress,
  hasOpeningMovement: boolean,
) {
  return hasOpeningMovement && progress.movementPreviewed;
}
