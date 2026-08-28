ALTER TABLE "Payment" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "InstallmentPayment" ADD COLUMN "sourceName" TEXT;

CREATE TABLE "PaymentSourceOption" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "PaymentSourceOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentSourceOption_shopId_normalizedName_key"
  ON "PaymentSourceOption"("shopId", "normalizedName");
CREATE INDEX "PaymentSourceOption_shopId_deletedAt_name_idx"
  ON "PaymentSourceOption"("shopId", "deletedAt", "name");

ALTER TABLE "PaymentSourceOption"
  ADD CONSTRAINT "PaymentSourceOption_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentSourceOption" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PaymentSourceOption" FROM PUBLIC, anon, authenticated;
