CREATE TABLE IF NOT EXISTS "LifetimeSubscriptionPrice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "countryCode" VARCHAR(2) NOT NULL,
  "currencyCode" VARCHAR(3) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifetimeSubscriptionPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LifetimeSubscriptionPrice_countryCode_key" ON "LifetimeSubscriptionPrice"("countryCode");
CREATE INDEX IF NOT EXISTS "LifetimeSubscriptionPrice_countryCode_idx" ON "LifetimeSubscriptionPrice"("countryCode");
