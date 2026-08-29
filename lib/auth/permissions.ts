import { MembershipRole } from "@prisma/client";

/**
 * Typed application-wide permissions for Phase 2 RBAC.
 */
export type AppPermission =
  | "repairs:read"
  | "repairs:create"
  | "repairs:update"
  | "repairs:update_status"
  | "repairs:assign"
  | "repairs:delete"
  | "sales:read"
  | "sales:create"
  | "sales:cancel"
  | "inventory:read"
  | "inventory:use_parts"
  | "inventory:manage"
  | "inventory:adjust"
  | "invoices:read"
  | "invoices:pay"
  | "invoices:void"
  | "customers:manage"
  | "customers:delete"
  | "suppliers:manage"
  | "reports:read"
  | "expenses:manage"
  | "shop:settings"
  | "team:read"
  | "team:invite"
  | "team:manage";

export const ALL_APP_PERMISSIONS: readonly AppPermission[] = [
  "repairs:read",
  "repairs:create",
  "repairs:update",
  "repairs:update_status",
  "repairs:assign",
  "repairs:delete",
  "sales:read",
  "sales:create",
  "sales:cancel",
  "inventory:read",
  "inventory:use_parts",
  "inventory:manage",
  "inventory:adjust",
  "invoices:read",
  "invoices:pay",
  "invoices:void",
  "customers:manage",
  "customers:delete",
  "suppliers:manage",
  "reports:read",
  "expenses:manage",
  "shop:settings",
  "team:read",
  "team:invite",
  "team:manage",
] as const;

/**
 * Strict Role to Permissions mapping matrix.
 * Membership.role from PostgreSQL is the single source of truth.
 */
export const ROLE_PERMISSIONS_MATRIX: Record<MembershipRole, readonly AppPermission[]> = {
  OWNER: ALL_APP_PERMISSIONS,

  ADMIN: [
    "repairs:read",
    "repairs:create",
    "repairs:update",
    "repairs:update_status",
    "repairs:assign",
    "repairs:delete",
    "sales:read",
    "sales:create",
    "sales:cancel",
    "inventory:read",
    "inventory:use_parts",
    "inventory:manage",
    "inventory:adjust",
    "invoices:read",
    "invoices:pay",
    "invoices:void",
    "customers:manage",
    "customers:delete",
    "suppliers:manage",
    "reports:read",
    "expenses:manage",
    "team:read",
    "team:invite",
    "team:manage",
    // Note: shop:settings is excluded (OWNER only)
  ],

  TECHNICIAN: [
    "repairs:read",
    "repairs:create",
    "repairs:update",
    "repairs:update_status",
    "sales:read",
    "sales:create",
    "inventory:read",
    "inventory:use_parts",
    "invoices:read",
    "invoices:pay",
    "customers:manage",
    "team:read",
  ],

  VIEWER: [
    "repairs:read",
    "sales:read",
    "inventory:read",
    "invoices:read",
    "reports:read",
    "team:read",
  ],
};

/**
 * Resolves permissions for a given membership role.
 */
export function getPermissionsForRole(role: MembershipRole): AppPermission[] {
  const permissions = ROLE_PERMISSIONS_MATRIX[role];
  return permissions ? [...permissions] : [];
}

/**
 * Checks if a specific role possesses a required permission.
 */
export function hasRolePermission(role: MembershipRole, permission: AppPermission): boolean {
  const permissions = ROLE_PERMISSIONS_MATRIX[role];
  return permissions ? permissions.includes(permission) : false;
}
