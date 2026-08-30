import { partnerPortalService } from "@/lib/services/partnerPortalService";
import { PartnerDashboard } from "./_partner-dashboard";

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage() {
  const { session, shops, requests } = await partnerPortalService.getPartnerPortalDashboard();

  return (
    <PartnerDashboard
      partnerName={session.partnerName}
      partnerCode={session.partnerCode}
      shops={shops.map((shop) => ({
        shopId: shop.shopId,
        shopName: shop.shopName,
        countryCode: shop.countryCode,
        effectiveStatus: shop.effectiveStatus,
        billingInterval: shop.billingInterval,
        trialEndsAt: shop.trialEndsAt.toISOString(),
        currentPeriodEndsAt: shop.currentPeriodEndsAt?.toISOString() ?? null,
      }))}
      requests={requests.map((request) => ({
        id: request.id,
        shopId: request.shopId,
        shopName: request.shopName,
        billingInterval: request.billingInterval,
        status: request.status,
        baseAmount: request.baseAmount,
        discountPercent: request.discountPercent,
        payableAmount: request.payableAmount,
        currencyCode: request.currencyCode,
        requestedAt: request.requestedAt.toISOString(),
      }))}
    />
  );
}
