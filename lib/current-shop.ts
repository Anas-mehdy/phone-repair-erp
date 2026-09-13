import { getAuthContext, type AuthContext, type GetAuthContextOptions } from "@/lib/auth/context";
import { type MembershipRole, type MembershipStatus } from "@prisma/client";
import { timeZoneForCountry } from "@/lib/timezone";
import type { AccessProfile } from "@/lib/services/accessProfileService";

export interface CurrentShopContext {
  shopId: string;
  userId: string | null;
  shopName: string;
  currency: string;
  countryCode: string | null;
  timeZone: string;
  userName: string;
  email: string;
  role: string;
  membershipRole: MembershipRole;
  membershipStatus: MembershipStatus;
  accessProfile: AccessProfile | null;
  permissions: string[];
}

function toLegacyRole(membershipRole: MembershipRole): string {
  return membershipRole === "OWNER" ? "OWNER" : "STAFF";
}

export async function getCurrentShopContext(
  options: GetAuthContextOptions = { allowRedirect: true }
): Promise<CurrentShopContext> {
  try {
    const auth: AuthContext = await getAuthContext(options);
    const countryCode = auth.shop.countryCode?.trim().toUpperCase() || null;
    return {
      shopId: auth.shop.id,
      userId: auth.user.id,
      shopName: auth.shop.name || "متجري",
      currency: auth.shop.currency || "SAR",
      countryCode,
      timeZone: timeZoneForCountry(countryCode),
      userName: auth.user.name || "المستخدم",
      email: auth.user.email || "",
      role: toLegacyRole(auth.membership.role),
      membershipRole: auth.membership.role,
      membershipStatus: auth.membership.status,
      accessProfile: auth.membership.accessProfile ?? null,
      permissions: auth.permissions,
    };
  } catch (error) {
    if (options.allowRedirect !== false) throw error;
    return {
      shopId: "",
      userId: null,
      shopName: "متجر غير مسجل",
      currency: "SAR",
      countryCode: null,
      timeZone: "UTC",
      userName: "زائر",
      email: "",
      role: "STAFF",
      membershipRole: "VIEWER" as MembershipRole,
      membershipStatus: "REMOVED" as MembershipStatus,
      accessProfile: null,
      permissions: [],
    };
  }
}
