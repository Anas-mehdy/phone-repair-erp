CREATE TABLE "GrowthExperimentAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "experimentKey" VARCHAR(100) NOT NULL,
  "variant" VARCHAR(60) NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstExposedAt" TIMESTAMP(3),
  "lastExposedAt" TIMESTAMP(3),
  "exposureCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthExperimentAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GrowthExperimentAssignment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GrowthExperimentAssignment_exposureCount_check" CHECK ("exposureCount" >= 0),
  CONSTRAINT "GrowthExperimentAssignment_experimentKey_check" CHECK (length(trim("experimentKey")) > 0),
  CONSTRAINT "GrowthExperimentAssignment_variant_check" CHECK (length(trim("variant")) > 0)
);

CREATE UNIQUE INDEX "GrowthExperimentAssignment_shopId_experimentKey_key"
  ON "GrowthExperimentAssignment"("shopId", "experimentKey");
CREATE INDEX "GrowthExperimentAssignment_experiment_variant_exposure_idx"
  ON "GrowthExperimentAssignment"("experimentKey", "variant", "firstExposedAt");
CREATE INDEX "GrowthExperimentAssignment_firstExposedAt_idx"
  ON "GrowthExperimentAssignment"("firstExposedAt");

ALTER TABLE "GrowthExperimentAssignment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "GrowthExperimentAssignment" FROM anon, authenticated;
