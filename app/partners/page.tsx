import { partnerPortalService } from "@/lib/services/partnerPortalService";
import { listPartnerClientInvitations } from "@/lib/services/partnerClientOnboardingService";
import { PartnerDashboard } from "./_partner-dashboard";
import { PartnerClientOnboarding } from "./_partner-client-onboarding";

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage() {
  const [{ session, shops, requests }, invitations] = await Promise.all([
    partnerPortalService.getPartnerPortalDashboard(),
    listPartnerClientInvitations(),
  ]);

  return (
    <>
      <div className="bg-slate-950 px-4 pt-8 text-slate-100 sm:px-8" dir="rtl">
        <div className="mx-auto max-w-7xl">
          <PartnerClientOnboarding
            partnerCode={session.partnerCode}
            invitations={invitations.map((invite) => ({
              id: invite.id,
              clientName: invite.clientName,
              email: invite.email,
              status: invite.status,
              expiresAt: invite.expiresAt.toISOString(),
              createdAt: invite.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
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
    </>
  );
}
