import { getSession } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/adminAuth";
import type { CompatibilityUserContext } from "./compatibility.auth";

/**
 * Compatibility knowledge is shared by every shop. Shop OWNER/ADMIN roles must
 * never grant access to its global governance endpoints.
 */
export async function getCompatibilityGovernanceUser(): Promise<CompatibilityUserContext | null> {
  const session = await getSession();
  if (!session || !isSuperAdminEmail(session.email)) return null;

  return {
    id: session.userId,
    email: session.email,
    role: session.role,
    isSuperAdmin: true,
  };
}
