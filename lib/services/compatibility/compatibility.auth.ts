import { MembershipRole } from "@prisma/client";

export interface CompatibilityUserContext {
  id: string;
  email?: string;
  role?: MembershipRole | string;
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
 * By default, OWNER, ADMIN, or superadmins have verification authority.
 * Regular TECHNICIANS can propose UNVERIFIED or report data, but cannot grant final verification.
 */
export function canVerifyCompatibility(user?: CompatibilityUserContext | null): boolean {
  if (!user || !user.id) {
    return false;
  }

  if (user.isSuperAdmin) {
    return true;
  }

  const role = user.role;
  if (role === "OWNER" || role === "ADMIN" || role === MembershipRole.OWNER || role === MembershipRole.ADMIN) {
    return true;
  }

  return false;
}

/**
 * Validates if the given verificationLevel is eligible for final VERIFIED status.
 */
export function isLevelEligibleForVerified(level: string): boolean {
  return VERIFIED_ELIGIBLE_LEVELS.has(level);
}
