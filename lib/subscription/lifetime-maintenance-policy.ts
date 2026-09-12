export const LIFETIME_MAINTENANCE_GRACE_DAYS = 30;

export type RawLifetimeMaintenanceStatus =
  | "LEGACY"
  | "FREE_FIRST_YEAR"
  | "PAID"
  | "DUE_SOON"
  | "OVERDUE";

export type LifetimeMaintenancePolicyStatus =
  | "LEGACY"
  | "FREE_FIRST_YEAR"
  | "PAID"
  | "DUE_SOON"
  | "GRACE_PERIOD"
  | "EXPIRED";

export type LifetimeMaintenancePolicyInput = {
  status: RawLifetimeMaintenanceStatus;
  nextDueAt: Date | null;
  daysUntilDue: number | null;
};

export type LifetimeMaintenancePolicy = {
  status: LifetimeMaintenancePolicyStatus;
  hasMaintenanceAccess: boolean;
  graceDays: number;
  overdueDays: number;
  graceDaysRemaining: number | null;
  graceEndsAt: Date | null;
};

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Commercial policy for lifetime-plan maintenance/update access.
 *
 * This policy never expires or blocks the core lifetime licence. It only
 * controls entitlement to priority support and future maintenance-gated
 * features. Security fixes and core corrective updates must stay available
 * regardless of this status.
 */
export function resolveLifetimeMaintenancePolicy(
  input: LifetimeMaintenancePolicyInput,
): LifetimeMaintenancePolicy {
  if (input.status !== "OVERDUE") {
    return {
      status: input.status,
      hasMaintenanceAccess: true,
      graceDays: LIFETIME_MAINTENANCE_GRACE_DAYS,
      overdueDays: 0,
      graceDaysRemaining: null,
      graceEndsAt: null,
    };
  }

  const overdueDays = Math.max(0, Math.abs(input.daysUntilDue ?? 0));
  const graceEndsAt = input.nextDueAt
    ? addDays(input.nextDueAt, LIFETIME_MAINTENANCE_GRACE_DAYS)
    : null;
  const inGracePeriod = overdueDays < LIFETIME_MAINTENANCE_GRACE_DAYS;

  if (inGracePeriod) {
    return {
      status: "GRACE_PERIOD",
      hasMaintenanceAccess: true,
      graceDays: LIFETIME_MAINTENANCE_GRACE_DAYS,
      overdueDays,
      graceDaysRemaining: Math.max(0, LIFETIME_MAINTENANCE_GRACE_DAYS - overdueDays),
      graceEndsAt,
    };
  }

  return {
    status: "EXPIRED",
    hasMaintenanceAccess: false,
    graceDays: LIFETIME_MAINTENANCE_GRACE_DAYS,
    overdueDays,
    graceDaysRemaining: 0,
    graceEndsAt,
  };
}
