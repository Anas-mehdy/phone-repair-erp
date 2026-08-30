-- ============================================================================
-- Migration: add_partner_activation_requests
-- Branch: feat/partner-activation-requests
-- Applied to Production: NO
--
-- Durable reseller activation ledger. Every request stores an immutable pricing
-- snapshot so later price/discount changes never rewrite historical economics.
-- ============================================================================

CREATE TYPE "PartnerActivationRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELED'
);

CREATE TABLE "PartnerActivationRequest" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "billingInterval" "SubscriptionBillingInterval" NOT NULL,
    "status" "PartnerActivationRequestStatus" NOT NULL DEFAULT 'PENDING',

    "priceSourceCountryCode" VARCHAR(2) NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "payableAmount" DECIMAL(12,2) NOT NULL,
    "currencyCode" VARCHAR(3) NOT NULL,

    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "decidedById" UUID,
    "paymentReference" TEXT,
    "paymentMethod" VARCHAR(50),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerActivationRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PartnerActivationRequest_partnerId_fkey"
      FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartnerActivationRequest_shopId_fkey"
      FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartnerActivationRequest_baseAmount_check" CHECK ("baseAmount" >= 0),
    CONSTRAINT "PartnerActivationRequest_discountPercent_check" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
    CONSTRAINT "PartnerActivationRequest_discountAmount_check" CHECK ("discountAmount" >= 0),
    CONSTRAINT "PartnerActivationRequest_payableAmount_check" CHECK ("payableAmount" >= 0),
    CONSTRAINT "PartnerActivationRequest_currencyCode_check" CHECK (length("currencyCode") = 3),
    CONSTRAINT "PartnerActivationRequest_priceSourceCountryCode_check" CHECK (length("priceSourceCountryCode") = 2)
);

CREATE INDEX "PartnerActivationRequest_partnerId_status_idx"
  ON "PartnerActivationRequest" ("partnerId", "status", "requestedAt" DESC);

CREATE INDEX "PartnerActivationRequest_shopId_status_idx"
  ON "PartnerActivationRequest" ("shopId", "status", "requestedAt" DESC);

CREATE INDEX "PartnerActivationRequest_status_requestedAt_idx"
  ON "PartnerActivationRequest" ("status", "requestedAt" DESC);

-- Prevent duplicate simultaneous pending requests for the same shop and interval.
CREATE UNIQUE INDEX "PartnerActivationRequest_pending_unique"
  ON "PartnerActivationRequest" ("shopId", "billingInterval")
  WHERE "status" = 'PENDING';
