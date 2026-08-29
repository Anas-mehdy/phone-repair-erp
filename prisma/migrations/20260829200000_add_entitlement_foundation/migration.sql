-- ============================================================================
-- Migration: add_entitlement_foundation
-- Branch: feat/subscription-enforcement
-- Applied to Production: NO
--
-- Final single-plan scope:
--   - Adds explicit grace-period expiry timestamp only.
--   - No usage counters are required: repair orders and compatibility searches
--     are unlimited in the single comprehensive plan.
--   - NO trial date modifications.
--   - NO subscription recreation.
--   - NO price reseed.
-- ============================================================================

ALTER TABLE "Subscription"
  ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);

CREATE INDEX "Subscription_gracePeriodEndsAt_idx"
  ON "Subscription"("gracePeriodEndsAt");
