import { cache } from "react";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";
import { accessProfileService, type AccessProfile } from "@/lib/services/accessProfileService";
import {
  type AppPermission,
  getPermissionsForAccessProfile,
  getPermissionsForRole,
} from "./permissions";

export class AuthenticationError extends Error {
  constructor(message: string = "يرجى تسجيل الدخول أولاً للوصول إلى النظام.") { super(message); this.name = "AuthenticationError"; }
}
export class AuthorizationError extends Error {
  constructor(message: string = "عفواً، لا تملك الصلاحية الكافية للقيام بهذا الإجراء.") { super(message); this.name = "AuthorizationError"; }
}
export class MembershipInactiveError extends AuthorizationError {
  constructor(message: string = "عضويتك في هذا المتجر غير نشطة أو تم تجميدها.") { super(message); this.name = "MembershipInactiveError"; }
}
export class SubscriptionReadOnlyError extends AuthorizationError {
  readonly code = "SUBSCRIPTION_EXPIRED";
  readonly upgradeUrl = "/subscription";
  constructor(message: string = "انتهت فترة استخدام المتجر. النظام متاح للعرض فقط حتى يتم تجديد الاشتراك.") { super(message); this.name = "SubscriptionReadOnlyError"; }
}

export interface AuthContext {
  user: { id: string; email: string; name: string };
  shop: { id: string; name: string; currency: string; countryCode?: string | null };
  membership: { id: string; role: MembershipRole; status: MembershipStatus; accessProfile?: AccessProfile | null };
  permissions: AppPermission[];
}
export interface GetAuthContextOptions { allowRedirect?: boolean }

const resolveAuthContextInternal = cache(async (): Promise<AuthContext | null> => {
  const session = await getSession();
  if (!session || !session.userId || !session.shopId) return null;

  const membership = await prisma.membership.findUnique({
    where: { shopId_userId: { shopId: session.shopId, userId: session.userId } },
    include: {
      user: { select: { id: true, email: true, name: true, deletedAt: true, role: true } },
      shop: { select: { id: true, name: true, currency: true, countryCode: true, deletedAt: true } },
    },
  });

  if (membership) {
    if (membership.shop.deletedAt !== null) throw new MembershipInactiveError("تم إيقاف هذا المتجر حالياً.");
    if (membership.user.deletedAt !== null) throw new MembershipInactiveError("تم تعطيل هذا الحساب.");
    if (membership.status === MembershipStatus.SUSPENDED) throw new MembershipInactiveError("تم تجميد حسابك في هذا المتجر بواسطة الإدارة.");
    if (membership.status === MembershipStatus.REMOVED || membership.deletedAt !== null) throw new MembershipInactiveError("تم إلغاء عضويتك من هذا المتجر.");
    if (membership.status !== MembershipStatus.ACTIVE) throw new MembershipInactiveError("عضويتك غير نشطة في هذا المتجر.");

    const accessProfile = await accessProfileService.getMembershipProfile(membership.id);
    const permissions = getPermissionsForAccessProfile(accessProfile) ?? getPermissionsForRole(membership.role);

    return {
      user: { id: membership.user.id, email: membership.user.email, name: membership.user.name },
      shop: {
        id: membership.shop.id,
        name: membership.shop.name,
        currency: membership.shop.currency || "SAR",
        countryCode: membership.shop.countryCode,
      },
      membership: { id: membership.id, role: membership.role, status: membership.status, accessProfile },
      permissions,
    };
  }

  console.warn(`[Security Notice] User (${session.userId}) accessing shop (${session.shopId}) without database Membership record. Evaluating legacy fallback.`);
  const legacyUser = await prisma.user.findUnique({
    where: { id: session.userId, deletedAt: null },
    include: { shop: true },
  });
  if (!legacyUser || !legacyUser.shop || legacyUser.shop.deletedAt !== null || legacyUser.shopId !== session.shopId) {
    throw new AuthenticationError("تعذر التحقق من العضوية أو المتجر المطلوب.");
  }

  const fallbackRole: MembershipRole = legacyUser.role === "OWNER" ? MembershipRole.OWNER : MembershipRole.TECHNICIAN;
  return {
    user: { id: legacyUser.id, email: legacyUser.email, name: legacyUser.name },
    shop: {
      id: legacyUser.shop.id,
      name: legacyUser.shop.name,
      currency: legacyUser.shop.currency || "SAR",
      countryCode: legacyUser.shop.countryCode,
    },
    membership: { id: "legacy-virtual-membership", role: fallbackRole, status: MembershipStatus.ACTIVE, accessProfile: null },
    permissions: getPermissionsForRole(fallbackRole),
  };
});

const resolveOperationalSubscriptionInternal = cache(async (shopId: string) => entitlementService.checkCanCreateNewOperation(shopId));
export async function requireOperationalSubscription(shopId: string): Promise<void> {
  const entitlement = await resolveOperationalSubscriptionInternal(shopId);
  if (!entitlement.allowed) throw new SubscriptionReadOnlyError(entitlement.message);
}
async function isServerActionRequest(): Promise<boolean> {
  try { const requestHeaders = await headers(); return Boolean(requestHeaders.get("next-action")); }
  catch { return false; }
}

export async function getAuthContext(options: GetAuthContextOptions = { allowRedirect: true }): Promise<AuthContext> {
  try {
    const context = await resolveAuthContextInternal();
    if (!context) {
      if (options.allowRedirect !== false) redirect("/login");
      throw new AuthenticationError("جلسة العمل غير صالحة أو منتهية. يرجى تسجيل الدخول مجدداً.");
    }
    return context;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof MembershipInactiveError) {
      if (options.allowRedirect !== false) {
        if (error.message.includes("تجميد")) redirect("/login?error=suspended");
        if (error.message.includes("إلغاء")) redirect("/login?error=removed");
        redirect("/login");
      }
      throw error;
    }
    if (options.allowRedirect !== false) redirect("/login");
    throw error;
  }
}

export function can(context: AuthContext, permission: AppPermission): boolean { return context.permissions.includes(permission); }
export function isSalesEmployee(context: AuthContext): boolean { return context.membership.accessProfile === "SALES_EMPLOYEE"; }

export async function requirePermission(permission: AppPermission, options?: GetAuthContextOptions): Promise<AuthContext> {
  const context = await getAuthContext(options);
  if (!can(context, permission)) throw new AuthorizationError(`عفواً، لا تملك الصلاحية الكافية للقيام بهذا الإجراء (${permission}).`);
  if (permission !== "subscription:manage" && (await isServerActionRequest())) await requireOperationalSubscription(context.shop.id);
  return context;
}

export async function requireAnyPermission(permissions: readonly AppPermission[], options?: GetAuthContextOptions): Promise<AuthContext> {
  const context = await getAuthContext(options);
  if (!permissions.some((permission) => can(context, permission))) {
    throw new AuthorizationError("عفواً، لا تملك الصلاحية الكافية للوصول إلى هذا القسم.");
  }
  if (await isServerActionRequest()) await requireOperationalSubscription(context.shop.id);
  return context;
}
