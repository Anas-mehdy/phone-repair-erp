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

CREATE TABLE IF NOT EXISTS "LifetimeSubscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activatedById" UUID,
  "pricePaid" DECIMAL(12,2),
  "currencyCode" VARCHAR(3),
  "paymentMethod" VARCHAR(50),
  "paymentReference" TEXT,
  "adminNotes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LifetimeSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LifetimeSubscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LifetimeSubscription_shopId_key" ON "LifetimeSubscription"("shopId");
CREATE INDEX IF NOT EXISTS "LifetimeSubscription_isActive_idx" ON "LifetimeSubscription"("isActive");
