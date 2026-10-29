import {
  requirePermission,
  AuthorizationError,
  AuthenticationError,
} from "./context";
export async function requireAccountant() {
  const auth = await requirePermission("inventory:stocktake", {
    allowRedirect: false,
  });
  if (auth.membership.role !== "ACCOUNTANT")
    throw new AuthorizationError("الجرد متاح للمحاسبين فقط.");
  return auth;
}

// Direct URL access must not render the private workspace for another role.
export async function requireAccountantPage() {
  const { notFound, redirect } = await import("next/navigation");
  try {
    return await requireAccountant();
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/login");
    if (error instanceof AuthorizationError) notFound();
    throw error;
  }
}
