import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export interface PartnerAdminRow {
  id: string;
  code: string;
  name: string;
  type: "AGENT" | "DISTRIBUTOR";
  status: "ACTIVE" | "SUSPENDED";
  discountPercent: number;
  email: string | null;
  portalEmail: string | null;
  portalLastLoginAt: Date | null;
  shopCount: number;
}

export interface PartnerAssignableShop {
  id: string;
  name: string;
  countryCode: string;
  partnerId: string | null;
  partnerName: string | null;
}

export async function getPartnerPortalAdminData() {
  await requireSuperAdmin();

  const [partnerRows, shopRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: string;
      code: string;
      name: string;
      type: "AGENT" | "DISTRIBUTOR";
      status: "ACTIVE" | "SUSPENDED";
      discountPercent: unknown;
      email: string | null;
      portalEmail: string | null;
      portalLastLoginAt: Date | null;
      shopCount: bigint;
    }>>`
      SELECT
        p."id", p."code", p."name", p."type"::text AS "type",
        p."status"::text AS "status", p."discountPercent", p."email",
        a."email" AS "portalEmail", a."lastLoginAt" AS "portalLastLoginAt",
        COUNT(s."id") FILTER (WHERE s."deletedAt" IS NULL)::bigint AS "shopCount"
      FROM "Partner" p
      LEFT JOIN "PartnerPortalAccount" a
        ON a."partnerId" = p."id" AND a."deletedAt" IS NULL
      LEFT JOIN "Shop" s ON s."partnerId" = p."id"
      WHERE p."deletedAt" IS NULL
      GROUP BY p."id", a."email", a."lastLoginAt"
      ORDER BY p."createdAt" DESC
    `,
    prisma.$queryRaw<PartnerAssignableShop[]>`
      SELECT
        s."id", s."name", s."countryCode", s."partnerId",
        p."name" AS "partnerName"
      FROM "Shop" s
      LEFT JOIN "Partner" p ON p."id" = s."partnerId"
      WHERE s."deletedAt" IS NULL
      ORDER BY s."createdAt" DESC
    `,
  ]);

  const partners: PartnerAdminRow[] = partnerRows.map((row) => ({
    ...row,
    discountPercent: Number(row.discountPercent),
    shopCount: Number(row.shopCount),
  }));

  return { partners, shops: shopRows };
}

export const partnerPortalAdminDataService = { getPartnerPortalAdminData };
