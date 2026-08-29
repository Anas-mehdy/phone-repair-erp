-- Subscription plans and lifecycle states.
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'PROFESSIONAL');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELED');
CREATE TYPE "SubscriptionBillingInterval" AS ENUM ('SIX_MONTHS', 'ANNUAL');

-- Persist the shop country separately from its operational accounting currency.
ALTER TABLE "Shop" ADD COLUMN "countryCode" VARCHAR(2);

-- Existing registrations did not store country explicitly. Prefer the international
-- phone prefix, then fall back to the operational currency for legacy/local numbers.
WITH normalized_shop_phone AS (
  SELECT
    "id",
    regexp_replace(
      regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g'),
      '^00',
      ''
    ) AS digits
  FROM "Shop"
)
UPDATE "Shop" AS shop
SET "countryCode" = CASE
  WHEN phone.digits ~ '^966' THEN 'SA'
  WHEN phone.digits ~ '^971' THEN 'AE'
  WHEN phone.digits ~ '^962' THEN 'JO'
  WHEN phone.digits ~ '^965' THEN 'KW'
  WHEN phone.digits ~ '^973' THEN 'BH'
  WHEN phone.digits ~ '^968' THEN 'OM'
  WHEN phone.digits ~ '^974' THEN 'QA'
  WHEN phone.digits ~ '^964' THEN 'IQ'
  WHEN phone.digits ~ '^963' THEN 'SY'
  WHEN phone.digits ~ '^970' THEN 'PS'
  WHEN phone.digits ~ '^961' THEN 'LB'
  WHEN phone.digits ~ '^967' THEN 'YE'
  WHEN phone.digits ~ '^218' THEN 'LY'
  WHEN phone.digits ~ '^216' THEN 'TN'
  WHEN phone.digits ~ '^213' THEN 'DZ'
  WHEN phone.digits ~ '^212' THEN 'MA'
  WHEN phone.digits ~ '^249' THEN 'SD'
  WHEN phone.digits ~ '^222' THEN 'MR'
  WHEN phone.digits ~ '^252' THEN 'SO'
  WHEN phone.digits ~ '^253' THEN 'DJ'
  WHEN phone.digits ~ '^269' THEN 'KM'
  WHEN phone.digits ~ '^20' THEN 'EG'
  WHEN phone.digits ~ '^90' THEN 'TR'
  WHEN phone.digits ~ '^1[0-9]{10}$' THEN 'US'
  WHEN shop."currency" = 'EGP' THEN 'EG'
  WHEN shop."currency" = 'IQD' THEN 'IQ'
  WHEN shop."currency" = 'SYP' THEN 'SY'
  WHEN shop."currency" = 'DZD' THEN 'DZ'
  WHEN shop."currency" = 'JOD' AND phone.digits ~ '^0?5' THEN 'PS'
  WHEN shop."currency" = 'JOD' THEN 'JO'
  WHEN shop."currency" = 'SAR' THEN 'SA'
  WHEN shop."currency" = 'AED' THEN 'AE'
  WHEN shop."currency" = 'TRY' THEN 'TR'
  WHEN shop."currency" = 'KWD' THEN 'KW'
  WHEN shop."currency" = 'BHD' THEN 'BH'
  WHEN shop."currency" = 'OMR' THEN 'OM'
  WHEN shop."currency" = 'QAR' THEN 'QA'
  WHEN shop."currency" = 'LBP' THEN 'LB'
  WHEN shop."currency" = 'YER' THEN 'YE'
  WHEN shop."currency" = 'LYD' THEN 'LY'
  WHEN shop."currency" = 'TND' THEN 'TN'
  WHEN shop."currency" = 'MAD' THEN 'MA'
  WHEN shop."currency" = 'SDG' THEN 'SD'
  WHEN shop."currency" = 'MRU' THEN 'MR'
  WHEN shop."currency" = 'SOS' THEN 'SO'
  WHEN shop."currency" = 'DJF' THEN 'DJ'
  WHEN shop."currency" = 'KMF' THEN 'KM'
  ELSE 'US'
END
FROM normalized_shop_phone AS phone
WHERE shop."id" = phone."id";

ALTER TABLE "Shop"
  ALTER COLUMN "countryCode" SET DEFAULT 'US',
  ALTER COLUMN "countryCode" SET NOT NULL;

ALTER TABLE "Shop"
  ADD CONSTRAINT "Shop_countryCode_check"
  CHECK ("countryCode" ~ '^[A-Z]{2}$');

CREATE INDEX "Shop_countryCode_idx" ON "Shop"("countryCode");

-- One current subscription record per shop. Historical billing transactions and
-- payment confirmations will be added in a later phase without changing this link.
CREATE TABLE "Subscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'PROFESSIONAL',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "billingInterval" "SubscriptionBillingInterval",
  "trialStartedAt" TIMESTAMP(3) NOT NULL,
  "trialEndsAt" TIMESTAMP(3) NOT NULL,
  "currentPeriodStartedAt" TIMESTAMP(3),
  "currentPeriodEndsAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subscription_trial_period_check"
    CHECK ("trialEndsAt" > "trialStartedAt"),
  CONSTRAINT "Subscription_current_period_check"
    CHECK (
      "currentPeriodStartedAt" IS NULL OR
      "currentPeriodEndsAt" IS NULL OR
      "currentPeriodEndsAt" > "currentPeriodStartedAt"
    )
);

CREATE UNIQUE INDEX "Subscription_shopId_key" ON "Subscription"("shopId");
CREATE INDEX "Subscription_status_trialEndsAt_idx" ON "Subscription"("status", "trialEndsAt");
CREATE INDEX "Subscription_plan_status_idx" ON "Subscription"("plan", "status");
CREATE INDEX "Subscription_currentPeriodEndsAt_idx" ON "Subscription"("currentPeriodEndsAt");

-- Backfill every existing shop from its original creation moment. This deliberately
-- does not restart the ten-day trial when the migration is deployed.
INSERT INTO "Subscription" (
  "shopId",
  "plan",
  "status",
  "trialStartedAt",
  "trialEndsAt",
  "createdAt",
  "updatedAt"
)
SELECT
  shop."id",
  'PROFESSIONAL'::"SubscriptionPlan",
  CASE
    WHEN shop."createdAt" + INTERVAL '10 days' <= CURRENT_TIMESTAMP
      THEN 'EXPIRED'::"SubscriptionStatus"
    ELSE 'TRIALING'::"SubscriptionStatus"
  END,
  shop."createdAt",
  shop."createdAt" + INTERVAL '10 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Shop" AS shop
ON CONFLICT ("shopId") DO NOTHING;

-- Current country price catalogue. A paid subscription will snapshot its charged
-- amount later, so future catalogue changes never rewrite an existing purchase.
CREATE TABLE "SubscriptionPrice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "countryCode" VARCHAR(2) NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "billingInterval" "SubscriptionBillingInterval" NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionPrice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionPrice_countryCode_check"
    CHECK ("countryCode" ~ '^[A-Z]{2}$'),
  CONSTRAINT "SubscriptionPrice_currencyCode_check"
    CHECK ("currencyCode" ~ '^[A-Z]{3}$'),
  CONSTRAINT "SubscriptionPrice_amount_check"
    CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "SubscriptionPrice_countryCode_plan_billingInterval_key"
  ON "SubscriptionPrice"("countryCode", "plan", "billingInterval");
CREATE INDEX "SubscriptionPrice_countryCode_idx" ON "SubscriptionPrice"("countryCode");

WITH price_catalog (
  country_code,
  currency_code,
  basic_six,
  basic_annual,
  professional_six,
  professional_annual
) AS (
  VALUES
    ('SA', 'SAR', 79, 139, 129, 229),
    ('AE', 'AED', 99, 179, 149, 269),
    ('EG', 'EGP', 999, 1799, 1299, 2349),
    ('TR', 'TRY', 1249, 2249, 1949, 3499),
    ('JO', 'JOD', 22, 39, 29, 52),
    ('KW', 'KWD', 11, 19, 17, 29),
    ('BH', 'BHD', 11, 19, 17, 29),
    ('OM', 'OMR', 11, 19, 17, 29),
    ('QA', 'QAR', 129, 229, 229, 419),
    ('IQ', 'IQD', 27900, 49900, 38900, 69900),
    ('SY', 'SYP', 2095, 3995, 3295, 6495),
    ('LB', 'USD', 29, 52, 39, 69),
    ('PS', 'USD', 25, 45, 35, 63),
    ('YE', 'USD', 25, 45, 35, 63),
    ('LY', 'USD', 25, 45, 35, 63),
    ('TN', 'USD', 25, 45, 35, 63),
    ('DZ', 'USD', 22, 39, 29, 52),
    ('MA', 'USD', 25, 45, 35, 63),
    ('SD', 'USD', 25, 45, 35, 63),
    ('MR', 'USD', 25, 45, 35, 63),
    ('SO', 'USD', 25, 45, 35, 63),
    ('DJ', 'USD', 25, 45, 35, 63),
    ('KM', 'USD', 25, 45, 35, 63),
    ('ZZ', 'USD', 35, 63, 49, 89)
)
INSERT INTO "SubscriptionPrice" (
  "countryCode",
  "plan",
  "billingInterval",
  "currencyCode",
  "amount"
)
SELECT
  catalog.country_code,
  variant.plan,
  variant.billing_interval,
  catalog.currency_code,
  variant.amount::DECIMAL(12, 2)
FROM price_catalog AS catalog
CROSS JOIN LATERAL (
  VALUES
    ('BASIC'::"SubscriptionPlan", 'SIX_MONTHS'::"SubscriptionBillingInterval", catalog.basic_six),
    ('BASIC'::"SubscriptionPlan", 'ANNUAL'::"SubscriptionBillingInterval", catalog.basic_annual),
    ('PROFESSIONAL'::"SubscriptionPlan", 'SIX_MONTHS'::"SubscriptionBillingInterval", catalog.professional_six),
    ('PROFESSIONAL'::"SubscriptionPlan", 'ANNUAL'::"SubscriptionBillingInterval", catalog.professional_annual)
) AS variant(plan, billing_interval, amount)
ON CONFLICT ("countryCode", "plan", "billingInterval") DO UPDATE
SET
  "currencyCode" = EXCLUDED."currencyCode",
  "amount" = EXCLUDED."amount",
  "updatedAt" = CURRENT_TIMESTAMP;

-- These records are server-managed through Prisma and must not be reachable from
-- Supabase's anon/authenticated Data API roles.
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionPrice" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Subscription" FROM anon, authenticated;
REVOKE ALL ON TABLE "SubscriptionPrice" FROM anon, authenticated;
