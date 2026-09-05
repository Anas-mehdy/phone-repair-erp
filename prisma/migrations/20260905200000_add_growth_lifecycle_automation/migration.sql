-- Growth lifecycle automation: durable delivery dedupe/retry state + lifecycle-email opt-out.
-- No message content, recipient email, customer data, monetary values, or business entity IDs are stored here.

CREATE TYPE "GrowthLifecycleDeliveryStatus" AS ENUM ('PROCESSING', 'SENT', 'FAILED');

CREATE TABLE "GrowthLifecyclePreference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "emailOptOutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GrowthLifecyclePreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GrowthLifecyclePreference_shopId_key" UNIQUE ("shopId"),
  CONSTRAINT "GrowthLifecyclePreference_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "GrowthLifecycleDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "flowVersion" INTEGER NOT NULL,
  "kind" VARCHAR(64) NOT NULL,
  "triggerKey" VARCHAR(220) NOT NULL,
  "status" "GrowthLifecycleDeliveryStatus" NOT NULL DEFAULT 'PROCESSING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "providerMessageId" VARCHAR(160),
  "failureCode" VARCHAR(80),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GrowthLifecycleDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GrowthLifecycleDelivery_shopId_kind_triggerKey_key" UNIQUE ("shopId", "kind", "triggerKey"),
  CONSTRAINT "GrowthLifecycleDelivery_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GrowthLifecycleDelivery_flowVersion_check" CHECK ("flowVersion" >= 1),
  CONSTRAINT "GrowthLifecycleDelivery_attemptCount_check" CHECK ("attemptCount" >= 0),
  CONSTRAINT "GrowthLifecycleDelivery_sent_state_check"
    CHECK (("status" = 'SENT' AND "sentAt" IS NOT NULL) OR "status" <> 'SENT')
);

CREATE INDEX "GrowthLifecycleDelivery_shopId_sentAt_idx"
  ON "GrowthLifecycleDelivery"("shopId", "sentAt");
CREATE INDEX "GrowthLifecycleDelivery_status_lastAttemptAt_idx"
  ON "GrowthLifecycleDelivery"("status", "lastAttemptAt");
CREATE INDEX "GrowthLifecycleDelivery_kind_createdAt_idx"
  ON "GrowthLifecycleDelivery"("kind", "createdAt");

ALTER TABLE "GrowthLifecyclePreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GrowthLifecycleDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GrowthLifecyclePreference" FROM anon, authenticated;
REVOKE ALL ON TABLE "GrowthLifecycleDelivery" FROM anon, authenticated;
