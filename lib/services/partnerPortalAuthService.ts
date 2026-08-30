import { randomUUID } from "node:crypto";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  clearPartnerSessionCookie,
  setPartnerSessionCookie,
} from "@/lib/partner-auth";
import { prisma } from "@/lib/prisma";

interface PortalLoginRow {
  accountId: string;
  partnerId: string;
  email: string;
  passwordHash: string;
  version: number;
  partnerName: string;
  partnerCode: string;
  partnerStatus: "ACTIVE" | "SUSPENDED";
  partnerDeletedAt: Date | null;
}

export interface PartnerPortalAccountAdminView {
  accountId: string;
  partnerId: string;
  email: string;
  version: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  partnerName: string;
  partnerCode: string;
  partnerStatus: "ACTIVE" | "SUSPENDED";
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new Error("البريد الإلكتروني للوكيل غير صالح.");
  }
  return email;
}

function validatePassword(password: string): string {
  if (password.length < 8 || password.length > 128) {
    throw new Error("كلمة مرور الوكيل يجب أن تكون بين 8 و128 حرفاً.");
  }
  return password;
}

function assertUuid(value: string, label: string): string {
  const normalized = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new Error(`${label} غير صالح.`);
  }
  return normalized;
}

export async function loginPartnerPortal(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const rows = await prisma.$queryRaw<PortalLoginRow[]>`
    SELECT
      a."id" AS "accountId",
      a."partnerId" AS "partnerId",
      a."email" AS "email",
      a."passwordHash" AS "passwordHash",
      a."version" AS "version",
      p."name" AS "partnerName",
      p."code" AS "partnerCode",
      p."status"::text AS "partnerStatus",
      p."deletedAt" AS "partnerDeletedAt"
    FROM "PartnerPortalAccount" a
    JOIN "Partner" p ON p."id" = a."partnerId"
    WHERE lower(a."email") = ${email}
      AND a."deletedAt" IS NULL
    LIMIT 1
  `;

  const row = rows[0];
  if (
    !row ||
    row.partnerDeletedAt !== null ||
    row.partnerStatus !== "ACTIVE" ||
    !(await verifyPassword(input.password, row.passwordHash))
  ) {
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
  }

  await prisma.$executeRaw`
    UPDATE "PartnerPortalAccount"
    SET "lastLoginAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${row.accountId}::uuid
  `;

  await setPartnerSessionCookie({
    kind: "partner",
    accountId: row.accountId,
    partnerId: row.partnerId,
    email: row.email,
    partnerName: row.partnerName,
    partnerCode: row.partnerCode,
    sessionVersion: row.version,
  });

  return {
    partnerId: row.partnerId,
    partnerName: row.partnerName,
    partnerCode: row.partnerCode,
  };
}

export async function logoutPartnerPortal() {
  await clearPartnerSessionCookie();
}

export async function listPartnerPortalAccounts(): Promise<PartnerPortalAccountAdminView[]> {
  await requireSuperAdmin();
  return prisma.$queryRaw<PartnerPortalAccountAdminView[]>`
    SELECT
      a."id" AS "accountId",
      a."partnerId" AS "partnerId",
      a."email" AS "email",
      a."version" AS "version",
      a."lastLoginAt" AS "lastLoginAt",
      a."createdAt" AS "createdAt",
      p."name" AS "partnerName",
      p."code" AS "partnerCode",
      p."status"::text AS "partnerStatus"
    FROM "PartnerPortalAccount" a
    JOIN "Partner" p ON p."id" = a."partnerId"
    WHERE a."deletedAt" IS NULL
      AND p."deletedAt" IS NULL
    ORDER BY p."name" ASC
  `;
}

export async function upsertPartnerPortalCredentials(input: {
  partnerId: string;
  email: string;
  password: string;
}): Promise<void> {
  await requireSuperAdmin();
  const partnerId = assertUuid(input.partnerId, "معرف الوكيل");
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  const passwordHash = await hashPassword(password);

  const partnerRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Partner"
    WHERE "id" = ${partnerId}::uuid
      AND "deletedAt" IS NULL
    LIMIT 1
  `;
  if (!partnerRows[0]) throw new Error("الوكيل غير موجود.");

  const emailOwnerRows = await prisma.$queryRaw<Array<{ partnerId: string }>>`
    SELECT "partnerId"
    FROM "PartnerPortalAccount"
    WHERE lower("email") = ${email}
      AND "deletedAt" IS NULL
    LIMIT 1
  `;
  if (emailOwnerRows[0] && emailOwnerRows[0].partnerId !== partnerId) {
    throw new Error("هذا البريد مستخدم بالفعل لحساب وكيل آخر.");
  }

  const existingRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "PartnerPortalAccount"
    WHERE "partnerId" = ${partnerId}::uuid
      AND "deletedAt" IS NULL
    LIMIT 1
  `;

  if (existingRows[0]) {
    await prisma.$executeRaw`
      UPDATE "PartnerPortalAccount"
      SET
        "email" = ${email},
        "passwordHash" = ${passwordHash},
        "version" = "version" + 1,
        "updatedAt" = NOW()
      WHERE "id" = ${existingRows[0].id}::uuid
    `;
    return;
  }

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "PartnerPortalAccount" (
      "id", "partnerId", "email", "passwordHash", "version", "createdAt", "updatedAt"
    ) VALUES (
      ${id}::uuid,
      ${partnerId}::uuid,
      ${email},
      ${passwordHash},
      1,
      NOW(),
      NOW()
    )
  `;
}

export const partnerPortalAuthService = {
  loginPartnerPortal,
  logoutPartnerPortal,
  listPartnerPortalAccounts,
  upsertPartnerPortalCredentials,
};
