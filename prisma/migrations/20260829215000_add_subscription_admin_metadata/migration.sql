-- Subscription admin metadata for manual activation/payment tracking.
-- Additive only: all columns are nullable and existing subscription rows remain unchanged.

ALTER TABLE "Subscription"
  ADD COLUMN "adminNotes" TEXT,
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "paymentMethod" VARCHAR(50),
  ADD COLUMN "activatedById" UUID;

CREATE INDEX "Subscription_activatedById_idx"
  ON "Subscription"("activatedById");
