import {
  SubscriptionBillingInterval,
  SubscriptionPlan,
} from "@prisma/client";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { calculatePartnerWholesalePrice } from "@/lib/partners/partner-pricing";

interface PartnerShopPricingRow {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  partnerStatus: "ACTIVE" | "SUSPENDED";
  discountPercent: unknown;
  shopId: string;
  shopName: string;
  countryCode: string;
}

export interface PartnerWholesaleQuote {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  shopId: string;
  shopName: string;
  countryCode: string;
  priceSourceCountryCode: string;
  billingInterval: SubscriptionBillingInterval;
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  payableAmount: number;
  currencyCode: string;
}

function assertUuid(value: string, label: string): string {
  const normalized = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new Error(`${label} غير صالح.`);
  }
  return normalized;
}

/**
 * Trusted internal quote builder. Callers MUST derive partnerId from an
 * authenticated server-side identity (Super Admin or Partner session).
 */
export async function buildPartnerWholesaleQuote(input: {
  partnerId: string;
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
}): Promise<PartnerWholesaleQuote> {
  const partnerId = assertUuid(input.partnerId, "معرف الوكيل");
  const shopId = assertUuid(input.shopId, "معرف المتجر");

  if (
    input.billingInterval !== SubscriptionBillingInterval.SIX_MONTHS &&
    input.billingInterval !== SubscriptionBillingInterval.ANNUAL
  ) {
    throw new Error("مدة الاشتراك غير صالحة.");
  }

  const rows = await prisma.$queryRaw<PartnerShopPricingRow[]>`
    SELECT
      p."id" AS "partnerId",
      p."code" AS "partnerCode",
      p."name" AS "partnerName",
      p."status"::text AS "partnerStatus",
      p."discountPercent" AS "discountPercent",
      s."id" AS "shopId",
      s."name" AS "shopName",
      s."countryCode" AS "countryCode"
    FROM "Shop" s
    INNER JOIN "Partner" p ON p."id" = s."partnerId"
    WHERE s."id" = ${shopId}::uuid
      AND s."partnerId" = ${partnerId}::uuid
      AND s."deletedAt" IS NULL
      AND p."deletedAt" IS NULL
    LIMIT 1
  `;

  const relation = rows[0];
  if (!relation) {
    throw new Error("المتجر غير مرتبط بهذا الوكيل.");
  }

  if (relation.partnerStatus !== "ACTIVE") {
    throw new Error("لا يمكن إصدار سعر لوكيل موقوف.");
  }

  const countryCode = relation.countryCode.trim().toUpperCase();
  const priceRows = await prisma.subscriptionPrice.findMany({
    where: {
      plan: SubscriptionPlan.PROFESSIONAL,
      billingInterval: input.billingInterval,
      countryCode: { in: [countryCode, "ZZ"] },
    },
  });

  const price =
    priceRows.find((row) => row.countryCode === countryCode) ??
    priceRows.find((row) => row.countryCode === "ZZ");

  if (!price) {
    throw new Error("لا يوجد سعر اشتراك معتمد لهذا البلد والمدة.");
  }

  const calculated = calculatePartnerWholesalePrice({
    baseAmount: Number(price.amount),
    discountPercent: Number(relation.discountPercent),
    currencyCode: price.currencyCode,
  });

  return {
    partnerId: relation.partnerId,
    partnerCode: relation.partnerCode,
    partnerName: relation.partnerName,
    shopId: relation.shopId,
    shopName: relation.shopName,
    countryCode,
    priceSourceCountryCode: price.countryCode,
    billingInterval: input.billingInterval,
    ...calculated,
  };
}

export async function getPartnerWholesaleQuote(input: {
  partnerId: string;
  shopId: string;
  billingInterval: SubscriptionBillingInterval;
}): Promise<PartnerWholesaleQuote> {
  await requireSuperAdmin();
  return buildPartnerWholesaleQuote(input);
}

export const partnerPricingService = {
  getPartnerWholesaleQuote,
  buildPartnerWholesaleQuote,
};
