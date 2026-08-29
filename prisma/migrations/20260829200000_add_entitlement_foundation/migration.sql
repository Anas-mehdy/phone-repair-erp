-- ============================================================================
-- Migration: add_entitlement_foundation
-- Branch: feat/subscription-enforcement
-- Applied: NOT YET — do not apply to production without Super Admin review.
--
-- Scope: additive only.
--   - NO DROP statements.
--   - NO destructive changes.
--   - NO trial date modifications.
--   - NO subscription record recreation.
--   - NO price reseed.
--
-- Why no IF NOT EXISTS?
--   IF NOT EXISTS silently swallows unexpected schema state. If a column or
--   table already exists with a different definition (schema drift), this
--   migration must FAIL LOUDLY rather than silently proceed. Deterministic
--   DDL ensures we notice drift before it reaches production.
--
-- 1. Adds gracePeriodEndsAt to Subscription.
--    NULL = no active grace period. Only Super Admin can set this field.
--    Used by EntitlementService to compute GRACE_PERIOD effective status
--    from wall-clock time instead of trusting the stored status column.
--
-- 2. Creates CompatibilitySearchUsage table.
--    One row per (shopId, usageDate UTC calendar day).
--    usageDate is PostgreSQL DATE (no time, no timezone) — avoids timestamp
--    TZ ambiguity across Vercel edge regions.
--    Increments are atomic via single-statement INSERT ... ON CONFLICT DO UPDATE.
--    RLS enabled; anon/authenticated roles revoked.
--    The @@unique([shopId, usageDate]) index covers all lookups — no extra
--    non-unique index added.
-- ============================================================================

-- 1. Add gracePeriodEndsAt to Subscription (deterministic — fails if already exists)
ALTER TABLE "Subscription"
  ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);

CREATE INDEX "Subscription_gracePeriodEndsAt_idx"
  ON "Subscription"("gracePeriodEndsAt");

-- 2. Create CompatibilitySearchUsage (deterministic — fails if already exists)
CREATE TABLE "CompatibilitySearchUsage" (
  "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
  "shopId"      UUID         NOT NULL,
  -- DATE: no time component, no timezone. Always set to the UTC calendar date
  -- via toUtcDateOnly() helper. Stable across all Vercel edge server timezones.
  "usageDate"   DATE         NOT NULL,
  "searchCount" INTEGER      NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompatibilitySearchUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompatibilitySearchUsage_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique index covers all (shopId, usageDate) lookups — no additional
-- non-unique index is needed for the query planner on this access pattern.
CREATE UNIQUE INDEX "CompatibilitySearchUsage_shopId_usageDate_key"
  ON "CompatibilitySearchUsage"("shopId", "usageDate");

-- RLS: this table is managed exclusively via Prisma server-side.
-- Direct access from the Supabase Data API (anon/authenticated roles) is
-- blocked to prevent client-side tampering with usage counters.
ALTER TABLE "CompatibilitySearchUsage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CompatibilitySearchUsage" FROM anon, authenticated;
