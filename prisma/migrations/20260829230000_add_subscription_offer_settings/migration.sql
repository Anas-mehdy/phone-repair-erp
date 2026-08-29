-- ============================================================================
-- Migration: add_subscription_offer_settings
-- Branch: feat/subscription-founders-offer
-- Applied to Production: NO
--
-- Scope:
--   - Creates singleton table SubscriptionOfferSettings for marketing offer controls.
--   - Adds SQL constraints for total, remaining, and discount percentages.
--   - Seeds default FOUNDERS_OFFER row.
-- ============================================================================

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
