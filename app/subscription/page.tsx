import { SubscriptionBillingInterval, SubscriptionPlan } from "@prisma/client";
import { requirePermission } from "@/lib/auth/context";
import { entitlementService } from "@/lib/services/subscriptionEntitlementService";
import { subscriptionOfferService } from "@/lib/services/subscriptionOfferService";
import { prisma } from "@/lib/prisma";
import { SubscriptionView } from "./_subscription-view";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const auth = await requirePermission("subscription:manage");

  const [entitlement, offer, shopDetails] = await Promise.all([
    entitlementService.getEntitlementContext(auth.shop.id),
    subscriptionOfferService.getOfferSettings(),
    prisma.shop.findUnique({
      where: { id: auth.shop.id },
      select: { countryCode: true },
    }),
  ]);

  const countryCode = shopDetails?.countryCode || "SA";

  const rawPrices = await prisma.subscriptionPrice.findMany({
    where: {
      plan: SubscriptionPlan.PROFESSIONAL,
      countryCode: {
        in: [countryCode, "ZZ"],
      },
    },
  });

  // Match country-specific prices or fallback to ZZ
  const countryPrices = rawPrices.filter(
    (p) => p.countryCode === countryCode,
  );
  const fallbackPrices = rawPrices.filter((p) => p.countryCode === "ZZ");

  const effectivePrices =
    countryPrices.length > 0 ? countryPrices : fallbackPrices;

  const sixMonthsRaw = effectivePrices.find(
    (p) => p.billingInterval === SubscriptionBillingInterval.SIX_MONTHS,
  );
  const annualRaw = effectivePrices.find(
    (p) => p.billingInterval === SubscriptionBillingInterval.ANNUAL,
  );

  const sixMonthsPrice = sixMonthsRaw
    ? {
        amount: Number(sixMonthsRaw.amount),
        currencyCode: sixMonthsRaw.currencyCode,
      }
    : null;

  const annualPrice = annualRaw
    ? {
        amount: Number(annualRaw.amount),
        currencyCode: annualRaw.currencyCode,
      }
    : null;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <SubscriptionView
        shop={{
          name: auth.shop.name,
          countryCode,
          currency: auth.shop.currency,
        }}
        entitlement={entitlement}
        offer={offer}
        sixMonthsPrice={sixMonthsPrice}
        annualPrice={annualPrice}
      />
    </div>
  );
}
