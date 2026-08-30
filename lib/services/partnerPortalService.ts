import { SubscriptionBillingInterval } from "@prisma/client";
import { requirePartnerSession } from "@/lib/partner-auth";
import { prisma } from "@/lib/prisma";
import { computeEffectiveStatus } from "@/lib/services/subscriptionEntitlementService";
import { createPartnerActivationRequestForPartner } from "@/lib/services/partnerActivationRequestService";

interface PartnerShopRow {
  shopId: string;
  shopName: string;
  countryCode: string;
  partnerAssignedAt: Date | null;
  subscriptionStatus: "TRIALING" | "ACTIVE" | "GRACE_PERIOD" | "EXPIRED" | "CANCELED";
  billingInterval: SubscriptionBillingInterval | null;
  trialEndsAt: Date;
  currentPeriodStartedAt: Date | null;
  currentPeriodEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
}

export interface PartnerPortalShop {
  shopId: string;
  shopName: string;
  countryCode: string;
  partnerAssignedAt: Date | null;
  effectiveStatus: string;
  billingInterval: SubscriptionBillingInterval | null;
  trialEndsAt: Date;
  currentPeriodEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
}

export interface PartnerPortalRequest {
  id: string;
  shopId: string;
  shopName: string;
  billingInterval: SubscriptionBillingInterval;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  baseAmount: number;
  discountPercent: number;
  payableAmount: number;
  currencyCode: string;
  requestedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
}

export async function getPartnerPortalDashboard(now = new Date()) {
  const session = await requirePartnerSession();

  const [shopRows, requestRows] = await Promise.all([
    prisma.$queryRaw<PartnerShopRow[]>`
      SELECT
        s."id" AS "shopId",
        s."name" AS "shopName",
        s."countryCode" AS "countryCode",
        s."partnerAssignedAt" AS "partnerAssignedAt",
        sub."status"::text AS "subscriptionStatus",
        sub."billingInterval" AS "billingInterval",
        sub."trialEndsAt" AS "trialEndsAt",
        sub."currentPeriodStartedAt" AS "currentPeriodStartedAt",
        sub."currentPeriodEndsAt" AS "currentPeriodEndsAt",
        sub."gracePeriodEndsAt" AS "gracePeriodEndsAt"
      FROM "Shop" s
      JOIN "Subscription" sub ON sub."shopId" = s."id"
      WHERE s."partnerId" = ${session.partnerId}::uuid
        AND s."deletedAt" IS NULL
      ORDER BY s."partnerAssignedAt" DESC NULLS LAST, s."createdAt" DESC
    `,
    prisma.$queryRaw<Array<{
      id: string;
      shopId: string;
      shopName: string;
      billingInterval: SubscriptionBillingInterval;
      status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
      baseAmount: unknown;
      discountPercent: unknown;
      payableAmount: unknown;
      currencyCode: string;
      requestedAt: Date;
      approvedAt: Date | null;
      rejectedAt: Date | null;
    }>>`
      SELECT
        r."id", r."shopId", s."name" AS "shopName",
        r."billingInterval", r."status"::text AS "status",
        r."baseAmount", r."discountPercent", r."payableAmount",
        r."currencyCode", r."requestedAt", r."approvedAt", r."rejectedAt"
      FROM "PartnerActivationRequest" r
      JOIN "Shop" s ON s."id" = r."shopId"
      WHERE r."partnerId" = ${session.partnerId}::uuid
      ORDER BY r."requestedAt" DESC
      LIMIT 100
    `,
  ]);

  const shops: PartnerPortalShop[] = shopRows.map((row) => ({
    shopId: row.shopId,
    shopName: row.shopName,
    countryCode: row.countryCode,
    partnerAssignedAt: row.partnerAssignedAt,
    effectiveStatus: computeEffectiveStatus(
      row.subscriptionStatus,
      row.trialEndsAt,
      row.currentPeriodStartedAt,
      row.currentPeriodEndsAt,
      row.gracePeriodEndsAt,
      now,
    ),
    billingInterval: row.billingInterval,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEndsAt: row.currentPeriodEndsAt,
    gracePeriodEndsAt: row.gracePeriodEndsAt,
  }));

  const requests: PartnerPortalRequest[] = requestRows.map((row) => ({
    ...row,
    baseAmount: Number(row.baseAmount),
    discountPercent: Number(row.discountPercent),
    payableAmount: Number(row.payableAmount),
  }));

  return { session, shops, requests };
}

export async function requestActivationFromPartnerPortal(input: {
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
}) {
  const session = await requirePartnerSession();
  return createPartnerActivationRequestForPartner({
    partnerId: session.partnerId,
    shopId: input.shopId,
    billingInterval: input.billingInterval,
  });
}

export const partnerPortalService = {
  getPartnerPortalDashboard,
  requestActivationFromPartnerPortal,
};
