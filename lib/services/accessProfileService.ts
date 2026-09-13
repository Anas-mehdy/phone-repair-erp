import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SALES_EMPLOYEE_PROFILE = "SALES_EMPLOYEE" as const;
export type AccessProfile = typeof SALES_EMPLOYEE_PROFILE;

let tablesReady: Promise<void> | null = null;

async function createTables() {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(91309261)");
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MembershipAccessProfile" (
        "membershipId" UUID PRIMARY KEY REFERENCES "Membership"("id") ON DELETE CASCADE,
        "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "profile" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MembershipAccessProfile_profile_check" CHECK ("profile" IN ('SALES_EMPLOYEE'))
      )
    `);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MembershipAccessProfile_shopId_profile_idx" ON "MembershipAccessProfile"("shopId", "profile")`);
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ShopInvitationAccessProfile" (
        "invitationId" UUID PRIMARY KEY REFERENCES "ShopInvitation"("id") ON DELETE CASCADE,
        "shopId" UUID NOT NULL REFERENCES "Shop"("id") ON DELETE CASCADE,
        "profile" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ShopInvitationAccessProfile_profile_check" CHECK ("profile" IN ('SALES_EMPLOYEE'))
      )
    `);
    await tx.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ShopInvitationAccessProfile_shopId_profile_idx" ON "ShopInvitationAccessProfile"("shopId", "profile")`);
    await tx.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION massar_copy_invitation_access_profile()
      RETURNS trigger AS $$
      DECLARE v_profile TEXT;
      BEGIN
        SELECT iap."profile" INTO v_profile
        FROM "ShopInvitationAccessProfile" iap
        JOIN "ShopInvitation" inv ON inv."id" = iap."invitationId"
        JOIN "User" usr ON usr."id" = NEW."userId"
        WHERE inv."shopId" = NEW."shopId"
          AND LOWER(inv."email") = LOWER(usr."email")
          AND inv."status" IN ('PENDING', 'ACCEPTED')
        ORDER BY inv."createdAt" DESC
        LIMIT 1;
        IF v_profile IS NOT NULL THEN
          INSERT INTO "MembershipAccessProfile" ("membershipId", "shopId", "profile", "createdAt", "updatedAt")
          VALUES (NEW."id", NEW."shopId", v_profile, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT ("membershipId") DO UPDATE SET "profile" = EXCLUDED."profile", "shopId" = EXCLUDED."shopId", "updatedAt" = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await tx.$executeRawUnsafe(`DROP TRIGGER IF EXISTS membership_copy_access_profile ON "Membership"`);
    await tx.$executeRawUnsafe(`
      CREATE TRIGGER membership_copy_access_profile
      AFTER INSERT OR UPDATE OF "role", "status", "deletedAt" ON "Membership"
      FOR EACH ROW EXECUTE FUNCTION massar_copy_invitation_access_profile()
    `);
  }, { timeout: 10_000 });
}

export async function ensureAccessProfileTables() {
  if (!tablesReady) tablesReady = createTables().catch((error) => { tablesReady = null; throw error; });
  await tablesReady;
}

function isUndefinedTable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; meta?: { code?: string; message?: string }; message?: string };
  return candidate.code === "42P01" || candidate.meta?.code === "42P01" || (candidate.code === "P2010" && candidate.meta?.message?.includes("does not exist") === true);
}

export async function getMembershipProfile(membershipId: string): Promise<AccessProfile | null> {
  if (membershipId === "legacy-virtual-membership") return null;
  try {
    const rows = await prisma.$queryRaw<Array<{ profile: string }>>`SELECT "profile" FROM "MembershipAccessProfile" WHERE "membershipId" = ${membershipId}::uuid LIMIT 1`;
    return rows[0]?.profile === SALES_EMPLOYEE_PROFILE ? SALES_EMPLOYEE_PROFILE : null;
  } catch (error) {
    if (isUndefinedTable(error)) return null;
    throw error;
  }
}

export async function setMembershipProfile(shopId: string, membershipId: string, profile: AccessProfile | null) {
  await ensureAccessProfileTables();
  if (!profile) {
    await prisma.$executeRaw`DELETE FROM "MembershipAccessProfile" WHERE "membershipId"=${membershipId}::uuid AND "shopId"=${shopId}::uuid`;
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO "MembershipAccessProfile" ("membershipId", "shopId", "profile", "createdAt", "updatedAt")
    VALUES (${membershipId}::uuid, ${shopId}::uuid, ${profile}, NOW(), NOW())
    ON CONFLICT ("membershipId") DO UPDATE SET "shopId"=EXCLUDED."shopId", "profile"=EXCLUDED."profile", "updatedAt"=NOW()
  `;
}

export async function setInvitationProfile(shopId: string, invitationId: string, profile: AccessProfile | null) {
  await ensureAccessProfileTables();
  if (!profile) {
    await prisma.$executeRaw`DELETE FROM "ShopInvitationAccessProfile" WHERE "invitationId"=${invitationId}::uuid AND "shopId"=${shopId}::uuid`;
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO "ShopInvitationAccessProfile" ("invitationId", "shopId", "profile", "createdAt", "updatedAt")
    VALUES (${invitationId}::uuid, ${shopId}::uuid, ${profile}, NOW(), NOW())
    ON CONFLICT ("invitationId") DO UPDATE SET "shopId"=EXCLUDED."shopId", "profile"=EXCLUDED."profile", "updatedAt"=NOW()
  `;
}

export async function getShopProfiles(shopId: string) {
  try {
    const [membershipRows, invitationRows] = await Promise.all([
      prisma.$queryRaw<Array<{ membershipId: string; profile: string }>>`SELECT "membershipId", "profile" FROM "MembershipAccessProfile" WHERE "shopId"=${shopId}::uuid`,
      prisma.$queryRaw<Array<{ invitationId: string; profile: string }>>`SELECT "invitationId", "profile" FROM "ShopInvitationAccessProfile" WHERE "shopId"=${shopId}::uuid`,
    ]);
    return {
      memberships: new Map(membershipRows.map((row) => [row.membershipId, row.profile === SALES_EMPLOYEE_PROFILE ? SALES_EMPLOYEE_PROFILE : null])),
      invitations: new Map(invitationRows.map((row) => [row.invitationId, row.profile === SALES_EMPLOYEE_PROFILE ? SALES_EMPLOYEE_PROFILE : null])),
    };
  } catch (error) {
    if (isUndefinedTable(error)) return { memberships: new Map<string, AccessProfile | null>(), invitations: new Map<string, AccessProfile | null>() };
    throw error;
  }
}

export async function attachAcceptedInvitationProfile(shopId: string, membershipId: string, userEmail: string) {
  await ensureAccessProfileTables();
  const rows = await prisma.$queryRaw<Array<{ profile: string }>>(Prisma.sql`
    SELECT iap."profile" FROM "ShopInvitationAccessProfile" iap
    JOIN "ShopInvitation" inv ON inv."id" = iap."invitationId"
    WHERE inv."shopId"=${shopId}::uuid AND LOWER(inv."email")=LOWER(${userEmail})
    ORDER BY inv."createdAt" DESC LIMIT 1
  `);
  if (rows[0]?.profile === SALES_EMPLOYEE_PROFILE) {
    await setMembershipProfile(shopId, membershipId, SALES_EMPLOYEE_PROFILE);
    return SALES_EMPLOYEE_PROFILE;
  }
  return null;
}

export const accessProfileService = { ensureAccessProfileTables, getMembershipProfile, setMembershipProfile, setInvitationProfile, getShopProfiles, attachAcceptedInvitationProfile };
