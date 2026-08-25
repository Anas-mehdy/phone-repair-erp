import { getAuthContext, type AuthContext, type GetAuthContextOptions } from "@/lib/auth/context";
import { type MembershipRole, type MembershipStatus } from "@prisma/client";

/**
 * Standard CurrentShopContext interface.
 * Preserves 100% backward compatibility with all existing consumers while
 * providing modern Membership and permission properties.
 */
export interface CurrentShopContext {
  shopId: string;
  userId: string | null;
  shopName: string;
  currency: string;
  userName: string;
  email: string;
  /**
   * Legacy role string ("OWNER" | "STAFF") for backward compatibility with existing UI and logic.
   */
  role: string;
  /**
   * Modern Membership Role ("OWNER" | "ADMIN" | "TECHNICIAN" | "VIEWER").
   */
  membershipRole: MembershipRole;
  /**
   * Modern Membership Lifecycle Status ("ACTIVE" | "SUSPENDED" | "REMOVED").
   */
  membershipStatus: MembershipStatus;
  /**
   * Resolved permissions for the active membership.
   */
  permissions: string[];
}

/**
 * Adapter mapping modern MembershipRole to legacy string role.
 * - OWNER -> "OWNER"
 * - ADMIN / TECHNICIAN / VIEWER -> "STAFF"
 */
function toLegacyRole(membershipRole: MembershipRole): string {
  return membershipRole === "OWNER" ? "OWNER" : "STAFF";
}

/**
 * Retrieves the current shop context backed by live database Membership resolution.
 *
 * Security Guarantees:
 * 1. Validates session against PostgreSQL Membership(shopId, userId).
 * 2. Enforces membership.status === ACTIVE (rejects SUSPENDED and REMOVED immediately).
 * 3. Preserves all legacy properties (shopId, userId, role, shopName, currency) with zero breaking changes.
 */
export async function getCurrentShopContext(
  options: GetAuthContextOptions = { allowRedirect: true }
): Promise<CurrentShopContext> {
  try {
    const auth: AuthContext = await getAuthContext(options);

    return {
      shopId: auth.shop.id,
      userId: auth.user.id,
      shopName: auth.shop.name || "متجري",
      currency: auth.shop.currency || "SAR",
      userName: auth.user.name || "المستخدم",
      email: auth.user.email || "",
      role: toLegacyRole(auth.membership.role),
      membershipRole: auth.membership.role,
      membershipStatus: auth.membership.status,
      permissions: auth.permissions,
    };
  } catch (error) {
    // If allowRedirect is true (default), rethrow Next.js redirect or Auth errors
    if (options.allowRedirect !== false) {
      throw error;
    }

    // Fallback for non-redirect callers (e.g. background/optional context callers)
    return {
      shopId: "",
      userId: null,
      shopName: "متجر غير مسجل",
      currency: "SAR",
      userName: "زائر",
      email: "",
      role: "STAFF",
      membershipRole: "VIEWER" as MembershipRole,
      membershipStatus: "REMOVED" as MembershipStatus,
      permissions: [],
    };
  }
}
