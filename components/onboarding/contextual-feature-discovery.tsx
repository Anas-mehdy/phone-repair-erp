import { ContextualFeatureDiscoveryClient } from "@/components/onboarding/contextual-feature-discovery-client";
import { contextualFeatureDiscoveryService } from "@/lib/services/contextualFeatureDiscoveryService";

export async function ContextualFeatureDiscovery({
  shopId,
  membershipRole,
}: {
  shopId: string;
  membershipRole: string;
}) {
  if (membershipRole !== "OWNER") return null;

  try {
    const candidates = await contextualFeatureDiscoveryService.getContextualFeatureDiscoveries(shopId);
    if (candidates.length === 0) return null;
    return <ContextualFeatureDiscoveryClient candidates={candidates} />;
  } catch {
    // Product education is best-effort and must never break the dashboard.
    return null;
  }
}
