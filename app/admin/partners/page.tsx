import { Handshake } from "lucide-react";
import { partnerActivationRequestService } from "@/lib/services/partnerActivationRequestService";
import { partnerActivationAdminDataService } from "@/lib/services/partnerActivationAdminDataService";
import { partnerPortalAdminDataService } from "@/lib/services/partnerPortalAdminDataService";
import { partnerAdminStatsService } from "@/lib/services/partnerAdminStatsService";
import { AdminPartnerActivationRequests } from "../_admin-partner-activation-requests";
import { AdminPartnerPortalManagement } from "../_admin-partner-portal-management";
import { PartnerStats } from "./_partner-stats";

export const dynamic = "force-dynamic";

export default async function SuperAdminPartnersPage() {
  const [activationRequests, activationCandidates, partnerPortalAdminData, stats] = await Promise.all([
    partnerActivationRequestService.listPartnerActivationRequests(),
    partnerActivationAdminDataService.listPartnerActivationCandidates(),
    partnerPortalAdminDataService.getPartnerPortalAdminData(),
    partnerAdminStatsService.getPartnerAdminStats(),
  ]);

  const serializedActivationRequests = activationRequests.map((request) => ({
    ...request,
    requestedAt: request.requestedAt.toISOString(),
    approvedAt: request.approvedAt?.toISOString() ?? null,
    rejectedAt: request.rejectedAt?.toISOString() ?? null,
    canceledAt: request.canceledAt?.toISOString() ?? null,
  }));

  const serializedPartners = partnerPortalAdminData.partners.map((partner) => ({
    ...partner,
    portalLastLoginAt: partner.portalLastLoginAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Handshake className="h-6 w-6 text-teal-400" />
            <h1 className="text-2xl font-black text-white">الوكلاء والموزعون</h1>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            إدارة شبكة الوكلاء، العملاء المرتبطين، بيانات البوابة، الدعوات، وطلبات التفعيل والتسويات.
          </p>
        </div>
      </div>

      <PartnerStats stats={stats} />

      <AdminPartnerPortalManagement
        partners={serializedPartners}
        shops={partnerPortalAdminData.shops}
      />

      <AdminPartnerActivationRequests
        initialCandidates={activationCandidates}
        initialRequests={serializedActivationRequests}
      />
    </div>
  );
}
