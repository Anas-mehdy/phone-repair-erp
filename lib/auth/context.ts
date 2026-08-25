import { MembershipRole, MembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  type AppPermission,
  getPermissionsForRole,
} from "./permissions";

/**
 * Custom Backend-safe Error Classes for Authentication and Authorization
 */
export class AuthenticationError extends Error {
  constructor(message: string = "يرجى تسجيل الدخول أولاً للوصول إلى النظام.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "عفواً، لا تملك الصلاحية الكافية للقيام بهذا الإجراء.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class MembershipInactiveError extends AuthorizationError {
  constructor(message: string = "عضويتك في هذا المتجر غير نشطة أو تم تجميدها.") {
    super(message);
    this.name = "MembershipInactiveError";
  }
}

/**
 * Standard Central Authorization Context
 */
export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
  };
  shop: {
    id: string;
    name: string;
    currency: string;
  };
  membership: {
    id: string;
    role: MembershipRole;
    status: MembershipStatus;
  };
  permissions: AppPermission[];
}

export interface GetAuthContextOptions {
  allowRedirect?: boolean;
}

/**
 * Resolves the authenticated user, active shop, verified database membership, and permissions.
 *
 * Flow:
 * 1. Read JWT session cookie
 * 2. Validate session payload
 * 3. Query PostgreSQL Membership with composite key (shopId, userId)
 * 4. Verify membership status === ACTIVE (rejects SUSPENDED / REMOVED immediately)
 * 5. Resolve typed permissions from Database Membership.role
 * 6. Return typed AuthContext
 */
export async function getAuthContext(
  options: GetAuthContextOptions = { allowRedirect: true }
): Promise<AuthContext> {
  const session = await getSession();

  if (!session || !session.userId || !session.shopId) {
    if (options.allowRedirect !== false) {
      redirect("/login");
    }
    throw new AuthenticationError("جلسة العمل غير صالحة أو منتهية. يرجى تسجيل الدخول مجدداً.");
  }

  // Strict Dual-Tenant Query: Requires BOTH userId AND shopId to match database record
  const membership = await prisma.membership.findUnique({
    where: {
      shopId_userId: {
        shopId: session.shopId,
        userId: session.userId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          deletedAt: true,
          role: true,
        },
      },
      shop: {
        select: {
          id: true,
          name: true,
          currency: true,
          deletedAt: true,
        },
      },
    },
  });

  // 1. Membership Exists in Database (Standard Production Path)
  if (membership) {
    // Check for soft-deleted shop or user
    if (membership.shop.deletedAt !== null) {
      if (options.allowRedirect !== false) redirect("/login");
      throw new MembershipInactiveError("تم إيقاف هذا المتجر حالياً.");
    }

    if (membership.user.deletedAt !== null) {
      if (options.allowRedirect !== false) redirect("/login");
      throw new MembershipInactiveError("تم تعطيل هذا الحساب.");
    }

    // Check membership lifecycle status
    if (membership.status === MembershipStatus.SUSPENDED) {
      if (options.allowRedirect !== false) redirect("/login?error=suspended");
      throw new MembershipInactiveError("تم تجميد حسابك في هذا المتجر بواسطة الإدارة.");
    }

    if (membership.status === MembershipStatus.REMOVED || membership.deletedAt !== null) {
      if (options.allowRedirect !== false) redirect("/login?error=removed");
      throw new MembershipInactiveError("تم إلغاء عضويتك من هذا المتجر.");
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      if (options.allowRedirect !== false) redirect("/login");
      throw new MembershipInactiveError("عضويتك غير نشطة في هذا المتجر.");
    }

    // Role and permissions resolved strictly from PostgreSQL Database
    const permissions = getPermissionsForRole(membership.role);

    return {
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
      },
      shop: {
        id: membership.shop.id,
        name: membership.shop.name,
        currency: membership.shop.currency || "SAR",
      },
      membership: {
        id: membership.id,
        role: membership.role,
        status: membership.status,
      },
      permissions,
    };
  }

  // 2. Legacy Fallback Path (Edge-case safety adapter during transition)
  console.warn(
    `[Security Notice] User (${session.userId}) accessing shop (${session.shopId}) without database Membership record. Evaluating legacy fallback.`
  );

  const legacyUser = await prisma.user.findUnique({
    where: {
      id: session.userId,
      deletedAt: null,
    },
    include: {
      shop: true,
    },
  });

  if (
    !legacyUser ||
    !legacyUser.shop ||
    legacyUser.shop.deletedAt !== null ||
    legacyUser.shopId !== session.shopId
  ) {
    if (options.allowRedirect !== false) {
      redirect("/login");
    }
    throw new AuthenticationError("تعذر التحقق من العضوية أو المتجر المطلوب.");
  }

  // Map legacy UserRole to MembershipRole safely without granting escalated privileges
  const fallbackRole: MembershipRole =
    legacyUser.role === "OWNER" ? MembershipRole.OWNER : MembershipRole.TECHNICIAN;

  const permissions = getPermissionsForRole(fallbackRole);

  return {
    user: {
      id: legacyUser.id,
      email: legacyUser.email,
      name: legacyUser.name,
    },
    shop: {
      id: legacyUser.shop.id,
      name: legacyUser.shop.name,
      currency: legacyUser.shop.currency || "SAR",
    },
    membership: {
      id: "legacy-virtual-membership",
      role: fallbackRole,
      status: MembershipStatus.ACTIVE,
    },
    permissions,
  };
}

/**
 * Checks if the current AuthContext has the requested permission.
 */
export function can(context: AuthContext, permission: AppPermission): boolean {
  return context.permissions.includes(permission);
}

/**
 * Server-side guard function to enforce permission requirements.
 * Throws AuthorizationError if the current user lacks the required permission.
 *
 * Usage in Server Actions / Services:
 * ```typescript
 * const auth = await requirePermission("repairs:update");
 * // proceed with mutation using auth.shop.id and auth.user.id
 * ```
 */
export async function requirePermission(
  permission: AppPermission,
  options?: GetAuthContextOptions
): Promise<AuthContext> {
  const context = await getAuthContext(options);

  if (!can(context, permission)) {
    throw new AuthorizationError(
      `عفواً، لا تملك الصلاحية الكافية للقيام بهذا الإجراء (${permission}).`
    );
  }

  return context;
}
