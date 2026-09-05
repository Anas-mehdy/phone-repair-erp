import { getCurrentShopContext } from "@/lib/current-shop";
import { shouldShowDashboardMonetization } from "@/lib/monetization/onboarding";
import { monetizationOnboardingService } from "@/lib/services/monetizationOnboardingService";
import { MonetizationPromptClient } from "./monetization-prompt-client";

export async function MonetizationPrompt() {
  try {
    const context = await getCurrentShopContext();
    if (context.membershipRole !== "OWNER") return null;

    const state = await monetizationOnboardingService.getState({
      shopId: context.shopId,
      timeZone: context.timeZone,
    });
    if (!state || !shouldShowDashboardMonetization(state.stage)) return null;

    return <MonetizationPromptClient storageScope={context.shopId} state={state} />;
  } catch {
    // A monetization prompt must never make the operational dashboard unavailable.
    return null;
  }
}
