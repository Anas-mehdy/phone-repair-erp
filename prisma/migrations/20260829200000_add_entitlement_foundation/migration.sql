-- ============================================================================
-- Migration: add_entitlement_foundation
-- Scope: additive only – no destructive changes, no data loss.
--
-- 1. Adds gracePeriodEndsAt to Subscription table.
--    Used by EntitlementService for precise grace-period boundary checking.
--    NULL = no active grace period.
--
-- 2. Creates CompatibilitySearchUsage table.
--    One row per (shopId, usageDate UTC).
--    Increments are atomic (PostgreSQL UPDATE ... RETURNING).
--    RLS enabled; anon/authenticated roles have no access.
-- ============================================================================

-- 1. Add gracePeriodEndsAt column to Subscription
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "gracePeriodEndsAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Subscription_gracePeriodEndsAt_idx"
  ON "Subscription"("gracePeriodEndsAt");

-- 2. Create CompatibilitySearchUsage table
CREATE TABLE IF NOT EXISTS "CompatibilitySearchUsage" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "shopId"      UUID         NOT NULL,
  -- usageDate is always "YYYY-MM-DD" UTC – varchar avoids timestamp TZ ambiguity
  "usageDate"   VARCHAR(10)  NOT NULL,
  "searchCount" INTEGER      NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompatibilitySearchUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompatibilitySearchUsage_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompatibilitySearchUsage_shopId_usageDate_key"
  ON "CompatibilitySearchUsage"("shopId", "usageDate");

CREATE INDEX IF NOT EXISTS "CompatibilitySearchUsage_shopId_usageDate_idx"
  ON "CompatibilitySearchUsage"("shopId", "usageDate");

-- RLS: table is server-managed; no direct Supabase Data API access allowed.
ALTER TABLE "CompatibilitySearchUsage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CompatibilitySearchUsage" FROM anon, authenticated;
