import { randomUUID } from "node:crypto";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import {
  PartnerCreateInput,
  PartnerLifecycleStatus,
  PartnerUpdateInput,
  sanitizeOptionalText,
  validatePartnerCode,
  validatePartnerCountryCode,
  validatePartnerDiscount,
} from "@/lib/partners/partner-domain";

export interface PartnerRecord {
  id: string;
  code: string;
  type: "AGENT" | "DISTRIBUTOR";
  status: "ACTIVE" | "SUSPENDED";
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  countryCode: string | null;
  discountPercent: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PartnerWithShopCount extends PartnerRecord {
  shopCount: number;
}

function validatePartnerName(value: string): string {
  const name = value.trim();
  if (name.length < 2 || name.length > 160) {
    throw new Error("اسم الوكيل يجب أن يكون بين حرفين و160 حرفاً.");
  }
  return name;
}

function validatePartnerType(value: string): "AGENT" | "DISTRIBUTOR" {
  if (value !== "AGENT" && value !== "DISTRIBUTOR") {
    throw new Error("نوع الوكيل غير صالح.");
  }
  return value;
}

function validatePartnerStatus(value: string): PartnerLifecycleStatus {
  if (value !== "ACTIVE" && value !== "SUSPENDED") {
    throw new Error("حالة الوكيل غير صالحة.");
  }
  return value;
}

function mapPartner(row: PartnerRecord): PartnerRecord {
  return {
    ...row,
    discountPercent: Number(row.discountPercent),
  };
}

export async function listPartners(): Promise<PartnerWithShopCount[]> {
  await requireSuperAdmin();

  const rows = await prisma.$queryRaw<Array<PartnerRecord & { shopCount: bigint }>>`
    SELECT
      p.*,
      COUNT(s."id") FILTER (WHERE s."deletedAt" IS NULL)::bigint AS "shopCount"
    FROM "Partner" p
    LEFT JOIN "Shop" s ON s."partnerId" = p."id"
    WHERE p."deletedAt" IS NULL
    GROUP BY p."id"
    ORDER BY p."createdAt" DESC
  `;

  return rows.map((row) => ({
    ...mapPartner(row),
    shopCount: Number(row.shopCount),
  }));
}

export async function getPartner(partnerId: string): Promise<PartnerRecord | null> {
  await requireSuperAdmin();

  const rows = await prisma.$queryRaw<PartnerRecord[]>`
    SELECT *
    FROM "Partner"
    WHERE "id" = ${partnerId}::uuid
      AND "deletedAt" IS NULL
    LIMIT 1
  `;

  return rows[0] ? mapPartner(rows[0]) : null;
}

export async function createPartner(input: PartnerCreateInput): Promise<PartnerRecord> {
  await requireSuperAdmin();

  const id = randomUUID();
  const code = validatePartnerCode(input.code);
  const type = validatePartnerType(input.type);
  const name = validatePartnerName(input.name);
  const contactName = sanitizeOptionalText(input.contactName);
  const phone = sanitizeOptionalText(input.phone);
  const email = sanitizeOptionalText(input.email)?.toLowerCase() ?? null;
  const countryCode = validatePartnerCountryCode(input.countryCode);
  const discountPercent = validatePartnerDiscount(input.discountPercent);
  const notes = sanitizeOptionalText(input.notes);

  const rows = await prisma.$queryRaw<PartnerRecord[]>`
    INSERT INTO "Partner" (
      "id", "code", "type", "status", "name", "contactName", "phone", "email",
      "countryCode", "discountPercent", "notes", "createdAt", "updatedAt"
    ) VALUES (
      ${id}::uuid,
      ${code},
      ${type}::"PartnerType",
      'ACTIVE'::"PartnerStatus",
      ${name},
      ${contactName},
      ${phone},
      ${email},
      ${countryCode},
      ${discountPercent},
      ${notes},
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  return mapPartner(rows[0]);
}

export async function updatePartner(
  partnerId: string,
  input: PartnerUpdateInput,
): Promise<PartnerRecord> {
  await requireSuperAdmin();

  const existing = await getPartner(partnerId);
  if (!existing) {
    throw new Error("الوكيل غير موجود.");
  }

  const code = input.code === undefined ? existing.code : validatePartnerCode(input.code);
  const type = input.type === undefined ? existing.type : validatePartnerType(input.type);
  const status = input.status === undefined ? existing.status : validatePartnerStatus(input.status);
  const name = input.name === undefined ? existing.name : validatePartnerName(input.name);
  const contactName = input.contactName === undefined ? existing.contactName : sanitizeOptionalText(input.contactName);
  const phone = input.phone === undefined ? existing.phone : sanitizeOptionalText(input.phone);
  const email = input.email === undefined ? existing.email : (sanitizeOptionalText(input.email)?.toLowerCase() ?? null);
  const countryCode = input.countryCode === undefined ? existing.countryCode : validatePartnerCountryCode(input.countryCode);
  const discountPercent = input.discountPercent === undefined ? existing.discountPercent : validatePartnerDiscount(input.discountPercent);
  const notes = input.notes === undefined ? existing.notes : sanitizeOptionalText(input.notes);

  const rows = await prisma.$queryRaw<PartnerRecord[]>`
    UPDATE "Partner"
    SET
      "code" = ${code},
      "type" = ${type}::"PartnerType",
      "status" = ${status}::"PartnerStatus",
      "name" = ${name},
      "contactName" = ${contactName},
      "phone" = ${phone},
      "email" = ${email},
      "countryCode" = ${countryCode},
      "discountPercent" = ${discountPercent},
      "notes" = ${notes},
      "updatedAt" = NOW()
    WHERE "id" = ${partnerId}::uuid
      AND "deletedAt" IS NULL
    RETURNING *
  `;

  if (!rows[0]) {
    throw new Error("تعذر تحديث الوكيل.");
  }

  return mapPartner(rows[0]);
}

export async function setPartnerStatus(
  partnerId: string,
  status: PartnerLifecycleStatus,
): Promise<PartnerRecord> {
  return updatePartner(partnerId, { status });
}

export async function assignShopToPartner(shopId: string, partnerId: string): Promise<void> {
  await requireSuperAdmin();

  const partner = await getPartner(partnerId);
  if (!partner) {
    throw new Error("الوكيل غير موجود.");
  }
  if (partner.status !== "ACTIVE") {
    throw new Error("لا يمكن ربط متجر بوكيل موقوف.");
  }

  const updated = await prisma.$executeRaw`
    UPDATE "Shop"
    SET "partnerId" = ${partnerId}::uuid,
        "partnerAssignedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = ${shopId}::uuid
      AND "deletedAt" IS NULL
  `;

  if (updated !== 1) {
    throw new Error("المتجر غير موجود أو غير نشط.");
  }
}

export async function removeShopPartner(shopId: string): Promise<void> {
  await requireSuperAdmin();

  const updated = await prisma.$executeRaw`
    UPDATE "Shop"
    SET "partnerId" = NULL,
        "partnerAssignedAt" = NULL,
        "updatedAt" = NOW()
    WHERE "id" = ${shopId}::uuid
      AND "deletedAt" IS NULL
  `;

  if (updated !== 1) {
    throw new Error("المتجر غير موجود أو غير نشط.");
  }
}

export const partnerAdminService = {
  listPartners,
  getPartner,
  createPartner,
  updatePartner,
  setPartnerStatus,
  assignShopToPartner,
  removeShopPartner,
};
