-- ============================================================================
-- Migration: add_partner_portal_accounts
-- Branch: feat/partner-portal-auth
-- Applied to Production: NO
--
-- Separate reseller portal identity. This table is intentionally independent
-- from Shop/User auth so partner sessions can never become tenant sessions.
-- ============================================================================

CREATE TABLE "PartnerPortalAccount" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerPortalAccount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerPortalAccount_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartnerPortalAccount_email_not_blank_check"
      CHECK (length(btrim("email")) > 3),
    CONSTRAINT "PartnerPortalAccount_version_check"
      CHECK ("version" >= 1)
);

CREATE UNIQUE INDEX "PartnerPortalAccount_partnerId_key"
  ON "PartnerPortalAccount" ("partnerId")
  WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "PartnerPortalAccount_email_lower_key"
  ON "PartnerPortalAccount" (lower("email"))
  WHERE "deletedAt" IS NULL;

CREATE INDEX "PartnerPortalAccount_deletedAt_idx"
  ON "PartnerPortalAccount" ("deletedAt");
