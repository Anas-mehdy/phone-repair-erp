import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/context";

export const dynamic = "force-dynamic";

/**
 * TEMPORARILY DISABLED
 *
 * The subscription page is intentionally hidden from shop users while pricing
 * is being revised. Keep the server-side permission check so unauthenticated or
 * unauthorized access follows the normal auth flow, then redirect authorized
 * owners away from the pricing page.
 *
 * Re-enable by restoring the subscription presentation once the new prices are
 * approved. No subscription records, entitlements, or billing data are changed
 * by this temporary route guard.
 */
export default async function SubscriptionPage() {
  await requirePermission("subscription:manage");
  redirect("/dashboard");
}
