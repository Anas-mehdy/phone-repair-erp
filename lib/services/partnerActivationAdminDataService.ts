import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export interface PartnerActivationCandidate {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  discountPercent: number;
  shopId: string;
  shopName: string;
  countryCode: string;
}

export async function listPartnerActivationCandidates(): Promise<PartnerActivationCandidate[]> {
  await requireSuperAdmin();

  const rows = await prisma.$queryRaw<
    Array<Omit<PartnerActivationCandidate, "discountPercent"> & { discountPercent: unknown }>
  >`
    SELECT
      p."id" AS "partnerId",
      p."code" AS "partnerCode",
      p."name" AS "partnerName",
      p."discountPercent" AS "discountPercent",
      s."id" AS "shopId",
      s."name" AS "shopName",
      s."countryCode" AS "countryCode"
    FROM "Partner" p
    JOIN "Shop" s ON s."partnerId" = p."id"
    WHERE p."deletedAt" IS NULL
      AND p."status" = 'ACTIVE'::"PartnerStatus"
      AND s."deletedAt" IS NULL
    ORDER BY p."name" ASC, s."name" ASC
  `;

  return rows.map((row) => ({
    ...row,
    discountPercent: Number(row.discountPercent),
  }));
}

export const partnerActivationAdminDataService = {
  listPartnerActivationCandidates,
};
