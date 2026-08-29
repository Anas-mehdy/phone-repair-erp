-- ============================================================================
-- Migration: add_subscription_offer_settings
-- Branch: feat/subscription-founders-offer
-- Applied to Production: NO
--
-- Scope:
--   - Creates singleton table SubscriptionOfferSettings for marketing offer controls.
--   - Adds SQL constraints for total, remaining, and discount percentages.
--   - Seeds default FOUNDERS_OFFER row.
--   - Adds founders offer fields to Subscription (default false, NULL discounts).
--   - Adds SQL CHECK constraints for Subscription founders discount percentages.
-- ============================================================================

-- 1. Create SubscriptionOfferSettings singleton table
CREATE TABLE "SubscriptionOfferSettings" (
    "id" TEXT NOT NULL DEFAULT 'FOUNDERS_OFFER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalEligible" INTEGER NOT NULL DEFAULT 50,
    "remainingEligible" INTEGER NOT NULL DEFAULT 50,
    "sixMonthsDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "annualDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionOfferSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SubscriptionOfferSettings_totalEligible_check" CHECK ("totalEligible" >= 0),
    CONSTRAINT "SubscriptionOfferSettings_remainingEligible_check" CHECK ("remainingEligible" >= 0 AND "remainingEligible" <= "totalEligible"),
    CONSTRAINT "SubscriptionOfferSettings_sixMonthsDiscountPercent_check" CHECK ("sixMonthsDiscountPercent" >= 0 AND "sixMonthsDiscountPercent" <= 100),
    CONSTRAINT "SubscriptionOfferSettings_annualDiscountPercent_check" CHECK ("annualDiscountPercent" >= 0 AND "annualDiscountPercent" <= 100)
);

-- 2. Seed default singleton row
INSERT INTO "SubscriptionOfferSettings" (
    "id",
    "isActive",
    "totalEligible",
    "remainingEligible",
    "sixMonthsDiscountPercent",
    "annualDiscountPercent",
    "createdAt",
    "updatedAt"
) VALUES (
    'FOUNDERS_OFFER',
    true,
    50,
    50,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- 3. Add founders offer columns to Subscription
ALTER TABLE "Subscription"
    ADD COLUMN "foundersOfferEligible" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "foundersOfferGrantedAt" TIMESTAMP(3),
    ADD COLUMN "foundersOfferSixMonthsDiscountPercent" INTEGER,
    ADD COLUMN "foundersOfferAnnualDiscountPercent" INTEGER;

-- 4. Add check constraints for Subscription discount percentage ranges
ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_foundersOfferSixMonthsDiscountPercent_check"
    CHECK ("foundersOfferSixMonthsDiscountPercent" IS NULL OR ("foundersOfferSixMonthsDiscountPercent" >= 0 AND "foundersOfferSixMonthsDiscountPercent" <= 100));

ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_foundersOfferAnnualDiscountPercent_check"
    CHECK ("foundersOfferAnnualDiscountPercent" IS NULL OR ("foundersOfferAnnualDiscountPercent" >= 0 AND "foundersOfferAnnualDiscountPercent" <= 100));
