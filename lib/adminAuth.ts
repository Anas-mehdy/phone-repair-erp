import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Checks if the given email is authorized as a Super Admin.
 * Configured via SUPER_ADMIN_EMAILS environment variable (comma-separated).
 * If SUPER_ADMIN_EMAILS is not set, allows authenticated owners during initial setup.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;

  const adminEmailsEnv = process.env.SUPER_ADMIN_EMAILS || "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0) {
    return adminEmails.includes(email.toLowerCase().trim());
  }

  // In production, strictly fail closed if SUPER_ADMIN_EMAILS is not configured
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // Development convenience fallback only when running locally in development
  return true;
}

/**
 * Enforces Super Admin access in server components and server actions.
 */
export async function requireSuperAdmin() {
  const session = await getSession();

  if (!session) {
    redirect("/login?next=/admin");
  }

  if (!isSuperAdminEmail(session.email)) {
    redirect("/dashboard?error=unauthorized_admin");
  }

  return session;
}
