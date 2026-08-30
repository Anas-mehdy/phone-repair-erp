import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export interface PartnerAdminStats {
  totalPartners: number;
  activePartners: number;
  suspendedPartners: number;
  portalAccounts: number;
  managedShops: number;
  trialingShops: number;
  activeShops: number;
  expiredShops: number;
  pendingInvitations: number;
  usedInvitations: number;
  pendingActivationRequests: number;
  approvedActivationRequests: number;
  approvedAmountsByCurrency: Array<{ currencyCode: string; amount: number }>;
}

export async function getPartnerAdminStats(): Promise<PartnerAdminStats> {
  await requireSuperAdmin();

  const [summaryRows, amountRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      totalPartners: bigint;
      activePartners: bigint;
      suspendedPartners: bigint;
      portalAccounts: bigint;
      managedShops: bigint;
      trialingShops: bigint;
      activeShops: bigint;
      expiredShops: bigint;
      pendingInvitations: bigint;
      usedInvitations: bigint;
      pendingActivationRequests: bigint;
      approvedActivationRequests: bigint;
    }>>`
      SELECT
        (SELECT COUNT(*) FROM "Partner" WHERE "deletedAt" IS NULL)::bigint AS "totalPartners",
        (SELECT COUNT(*) FROM "Partner" WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE'::"PartnerStatus")::bigint AS "activePartners",
        (SELECT COUNT(*) FROM "Partner" WHERE "deletedAt" IS NULL AND "status" = 'SUSPENDED'::"PartnerStatus")::bigint AS "suspendedPartners",
        (SELECT COUNT(*) FROM "PartnerPortalAccount" WHERE "deletedAt" IS NULL)::bigint AS "portalAccounts",
        (SELECT COUNT(*) FROM "Shop" WHERE "deletedAt" IS NULL AND "partnerId" IS NOT NULL)::bigint AS "managedShops",
        (SELECT COUNT(*)
           FROM "Shop" s JOIN "Subscription" sub ON sub."shopId" = s."id"
          WHERE s."deletedAt" IS NULL AND s."partnerId" IS NOT NULL
            AND sub."status" = 'TRIALING'::"SubscriptionStatus"
            AND sub."trialEndsAt" > NOW())::bigint AS "trialingShops",
        (SELECT COUNT(*)
           FROM "Shop" s JOIN "Subscription" sub ON sub."shopId" = s."id"
          WHERE s."deletedAt" IS NULL AND s."partnerId" IS NOT NULL
            AND sub."status" = 'ACTIVE'::"SubscriptionStatus"
            AND sub."currentPeriodStartedAt" <= NOW()
            AND sub."currentPeriodEndsAt" > NOW())::bigint AS "activeShops",
        (SELECT COUNT(*)
           FROM "Shop" s JOIN "Subscription" sub ON sub."shopId" = s."id"
          WHERE s."deletedAt" IS NULL AND s."partnerId" IS NOT NULL
            AND (
              sub."status" IN ('EXPIRED'::"SubscriptionStatus", 'CANCELED'::"SubscriptionStatus")
              OR (sub."status" = 'TRIALING'::"SubscriptionStatus" AND sub."trialEndsAt" <= NOW())
              OR (sub."status" = 'ACTIVE'::"SubscriptionStatus" AND (sub."currentPeriodEndsAt" IS NULL OR sub."currentPeriodEndsAt" <= NOW()))
            ))::bigint AS "expiredShops",
        (SELECT COUNT(*) FROM "PartnerClientInvitation" WHERE "status" = 'PENDING' AND "expiresAt" > NOW())::bigint AS "pendingInvitations",
        (SELECT COUNT(*) FROM "PartnerClientInvitation" WHERE "status" = 'USED')::bigint AS "usedInvitations",
        (SELECT COUNT(*) FROM "PartnerActivationRequest" WHERE "status" = 'PENDING'::"PartnerActivationRequestStatus")::bigint AS "pendingActivationRequests",
        (SELECT COUNT(*) FROM "PartnerActivationRequest" WHERE "status" = 'APPROVED'::"PartnerActivationRequestStatus")::bigint AS "approvedActivationRequests"
    `,
    prisma.$queryRaw<Array<{ currencyCode: string; amount: unknown }>>`
      SELECT "currencyCode", COALESCE(SUM("payableAmount"), 0) AS "amount"
      FROM "PartnerActivationRequest"
      WHERE "status" = 'APPROVED'::"PartnerActivationRequestStatus"
      GROUP BY "currencyCode"
      ORDER BY "currencyCode"
    `,
  ]);

  const row = summaryRows[0];
  return {
    totalPartners: Number(row?.totalPartners ?? 0),
    activePartners: Number(row?.activePartners ?? 0),
    suspendedPartners: Number(row?.suspendedPartners ?? 0),
    portalAccounts: Number(row?.portalAccounts ?? 0),
    managedShops: Number(row?.managedShops ?? 0),
    trialingShops: Number(row?.trialingShops ?? 0),
    activeShops: Number(row?.activeShops ?? 0),
    expiredShops: Number(row?.expiredShops ?? 0),
    pendingInvitations: Number(row?.pendingInvitations ?? 0),
    usedInvitations: Number(row?.usedInvitations ?? 0),
    pendingActivationRequests: Number(row?.pendingActivationRequests ?? 0),
    approvedActivationRequests: Number(row?.approvedActivationRequests ?? 0),
    approvedAmountsByCurrency: amountRows.map((item) => ({
      currencyCode: item.currencyCode,
      amount: Number(item.amount),
    })),
  };
}

export const partnerAdminStatsService = { getPartnerAdminStats };
