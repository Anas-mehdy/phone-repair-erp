export interface CompatibilityUserContext {
  id: string;
  email?: string;
  role?: string;
  isSuperAdmin?: boolean;
}

/**
 * Eligible Verification Levels that support final VERIFIED status.
 */
export const VERIFIED_ELIGIBLE_LEVELS = new Set([
  "OEM_OFFICIAL",
  "ENGINEERING_VERIFIED",
  "PHYSICAL_TEST_VERIFIED",
]);

/**
 * Checks if a user has sufficient authorization to approve/verify compatibility records.
 * Compatibility knowledge is global, so shop roles never grant publishing authority.
 * Only the centrally managed Super Admin allowlist may review or publish records.
 */
export function canVerifyCompatibility(user?: CompatibilityUserContext | null): boolean {
  if (!user || !user.id) {
    return false;
  }

  return user.isSuperAdmin === true;
}

/**
 * Validates if the given verificationLevel is eligible for final VERIFIED status.
 */
export function isLevelEligibleForVerified(level: string): boolean {
  return VERIFIED_ELIGIBLE_LEVELS.has(level);
}
