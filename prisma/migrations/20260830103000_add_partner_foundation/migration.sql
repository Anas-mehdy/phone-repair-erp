-- ============================================================================
-- Migration: add_partner_foundation
-- Branch: feat/partner-foundation
-- Applied to Production: NO
--
-- Scope:
--   - Adds reseller/partner identity and commercial base discount.
--   - Adds optional, durable partner attribution to Shop.
--   - Existing shops remain direct (partnerId = NULL).
--   - No subscription, trial, price, or entitlement data is modified.
-- ============================================================================

CREATE TYPE "PartnerType" AS ENUM ('AGENT', 'DISTRIBUTOR');
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

CREATE TABLE "Partner" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'AGENT',
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "countryCode" VARCHAR(2),
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Partner_code_not_blank_check" CHECK (length(btrim("code")) > 0),
    CONSTRAINT "Partner_discountPercent_check" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
    CONSTRAINT "Partner_countryCode_check" CHECK ("countryCode" IS NULL OR length("countryCode") = 2)
);

-- Partner codes are case-insensitively unique (e.g. MASSAR10 == massar10).
CREATE UNIQUE INDEX "Partner_code_lower_key" ON "Partner" (lower("code"));
CREATE INDEX "Partner_status_idx" ON "Partner" ("status");
CREATE INDEX "Partner_type_status_idx" ON "Partner" ("type", "status");
CREATE INDEX "Partner_countryCode_idx" ON "Partner" ("countryCode");
CREATE INDEX "Partner_deletedAt_idx" ON "Partner" ("deletedAt");

ALTER TABLE "Shop"
    ADD COLUMN "partnerId" UUID,
    ADD COLUMN "partnerAssignedAt" TIMESTAMP(3);

CREATE INDEX "Shop_partnerId_idx" ON "Shop" ("partnerId");

ALTER TABLE "Shop"
    ADD CONSTRAINT "Shop_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Partner"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
