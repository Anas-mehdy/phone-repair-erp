import { MembershipRole } from "@prisma/client";
import { SALES_EMPLOYEE_PROFILE, type AccessProfile } from "@/lib/services/accessProfileService";

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
  | "sales:create_own"
  | "sales:read_own"
  | "sales:update_own"
  | "sales:cancel_own"
  | "purchases:create"
  | "purchases:read_own"
  | "expenses:create"
  | "expenses:read_own"
  | "electronic_services:read"
  | "electronic_services:execute"
  | "electronic_services:manage"
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
  | "debts:manage"
  | "shop:settings"
  | "team:read"
  | "team:invite"
  | "team:manage"
  | "subscription:manage";

export const ALL_APP_PERMISSIONS: readonly AppPermission[] = [
  "repairs:read", "repairs:create", "repairs:update", "repairs:update_status", "repairs:assign", "repairs:delete",
  "sales:read", "sales:create", "sales:cancel", "sales:create_own", "sales:read_own", "sales:update_own", "sales:cancel_own",
  "purchases:create", "purchases:read_own", "expenses:create", "expenses:read_own",
  "electronic_services:read", "electronic_services:execute", "electronic_services:manage",
  "inventory:read", "inventory:use_parts", "inventory:manage", "inventory:adjust",
  "invoices:read", "invoices:pay", "invoices:void",
  "customers:manage", "customers:delete", "suppliers:manage",
  "reports:read", "expenses:manage", "debts:manage",
  "shop:settings", "team:read", "team:invite", "team:manage", "subscription:manage",
] as const;

export const SALES_EMPLOYEE_PERMISSIONS: readonly AppPermission[] = [
  "sales:create",
  "sales:create_own",
  "sales:read_own",
  "sales:update_own",
  "sales:cancel_own",
  "electronic_services:execute",
  "purchases:create",
  "purchases:read_own",
  "expenses:create",
  "expenses:read_own",
] as const;

export const ROLE_PERMISSIONS_MATRIX: Record<MembershipRole, readonly AppPermission[]> = {
  OWNER: ALL_APP_PERMISSIONS,
  ADMIN: [
    "repairs:read", "repairs:create", "repairs:update", "repairs:update_status", "repairs:assign", "repairs:delete",
    "sales:read", "sales:create", "sales:cancel", "sales:create_own", "sales:read_own", "sales:update_own", "sales:cancel_own",
    "purchases:create", "purchases:read_own", "expenses:create", "expenses:read_own",
    "electronic_services:read", "electronic_services:execute", "electronic_services:manage",
    "inventory:read", "inventory:use_parts", "inventory:manage", "inventory:adjust",
    "invoices:read", "invoices:pay", "invoices:void",
    "customers:manage", "customers:delete", "suppliers:manage",
    "reports:read", "expenses:manage", "debts:manage", "team:read", "team:invite", "team:manage",
  ],
  TECHNICIAN: [
    "repairs:read", "repairs:create", "repairs:update", "repairs:update_status",
    "sales:read", "sales:create", "electronic_services:read", "electronic_services:execute",
    "inventory:read", "inventory:use_parts", "invoices:read", "invoices:pay", "customers:manage", "team:read",
  ],
  VIEWER: ["repairs:read", "sales:read", "electronic_services:read", "inventory:read", "invoices:read", "reports:read", "team:read"],
};

export function getPermissionsForRole(role: MembershipRole): AppPermission[] {
  const permissions = ROLE_PERMISSIONS_MATRIX[role];
  return permissions ? [...permissions] : [];
}

export function getPermissionsForAccessProfile(profile: AccessProfile | null): AppPermission[] | null {
  if (profile === SALES_EMPLOYEE_PROFILE) return [...SALES_EMPLOYEE_PERMISSIONS];
  return null;
}

export function hasRolePermission(role: MembershipRole, permission: AppPermission): boolean {
  const permissions = ROLE_PERMISSIONS_MATRIX[role];
  return permissions ? permissions.includes(permission) : false;
}
