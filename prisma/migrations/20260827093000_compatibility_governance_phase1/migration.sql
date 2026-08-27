-- Phase 1: trusted compatibility governance and explicit inventory mapping.

CREATE TYPE "CompatibilityReviewDecision" AS ENUM ('APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'CONFLICT');
CREATE TYPE "CompatibilityImportStatus" AS ENUM ('VALIDATING', 'READY_FOR_REVIEW', 'IMPORTED', 'REJECTED', 'FAILED');
CREATE TYPE "CompatibilityTestResult" AS ENUM ('PASS', 'FAIL', 'PARTIAL');
CREATE TYPE "CompatibilityConflictSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "CompatibilityConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

ALTER TABLE "InventoryItem" ADD COLUMN "partId" UUID;
ALTER TABLE "DeviceCompatibility"
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "publishedById" TEXT,
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "reviewVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CompatibilityEvidence" ADD COLUMN "sourceId" UUID;

CREATE TABLE "CompatibilitySource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "publisher" TEXT,
  "sourceType" "VerificationSourceType" NOT NULL,
  "url" TEXT,
  "trustLevel" INTEGER NOT NULL DEFAULT 1,
  "licenseNotes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompatibilitySource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompatibilitySource_trustLevel_check" CHECK ("trustLevel" BETWEEN 1 AND 5)
);

CREATE TABLE "CompatibilityReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compatibilityId" UUID NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" "CompatibilityReviewDecision" NOT NULL,
  "notes" TEXT,
  "reviewVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompatibilityReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompatibilityAuditEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compatibilityId" UUID NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "fromStatus" "CompatibilityStatus",
  "toStatus" "CompatibilityStatus",
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompatibilityAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompatibilityImportBatch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "filename" TEXT NOT NULL,
  "sourceId" UUID,
  "status" "CompatibilityImportStatus" NOT NULL DEFAULT 'VALIDATING',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "validRows" INTEGER NOT NULL DEFAULT 0,
  "invalidRows" INTEGER NOT NULL DEFAULT 0,
  "createdRecords" INTEGER NOT NULL DEFAULT 0,
  "validationReport" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "CompatibilityImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompatibilityPhysicalTest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compatibilityId" UUID NOT NULL,
  "testerId" TEXT NOT NULL,
  "result" "CompatibilityTestResult" NOT NULL,
  "protocolVersion" TEXT NOT NULL,
  "checklist" JSONB NOT NULL,
  "notes" TEXT,
  "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  CONSTRAINT "CompatibilityPhysicalTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompatibilityConflictReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "compatibilityId" UUID NOT NULL,
  "reportedById" TEXT,
  "severity" "CompatibilityConflictSeverity" NOT NULL,
  "status" "CompatibilityConflictStatus" NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  CONSTRAINT "CompatibilityConflictReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryItem_shopId_partId_idx" ON "InventoryItem"("shopId", "partId");
CREATE INDEX "DeviceCompatibility_publishedAt_idx" ON "DeviceCompatibility"("publishedAt");
CREATE INDEX "DeviceCompatibility_suspendedAt_idx" ON "DeviceCompatibility"("suspendedAt");
CREATE INDEX "CompatibilityEvidence_sourceId_idx" ON "CompatibilityEvidence"("sourceId");
CREATE INDEX "CompatibilitySource_sourceType_isActive_idx" ON "CompatibilitySource"("sourceType", "isActive");
CREATE INDEX "CompatibilitySource_trustLevel_idx" ON "CompatibilitySource"("trustLevel");
CREATE UNIQUE INDEX "CompatibilityReview_compatibilityId_reviewerId_reviewVersion_key" ON "CompatibilityReview"("compatibilityId", "reviewerId", "reviewVersion");
CREATE INDEX "CompatibilityReview_compatibilityId_reviewVersion_decision_idx" ON "CompatibilityReview"("compatibilityId", "reviewVersion", "decision");
CREATE INDEX "CompatibilityReview_reviewerId_createdAt_idx" ON "CompatibilityReview"("reviewerId", "createdAt");
CREATE INDEX "CompatibilityAuditEvent_compatibilityId_createdAt_idx" ON "CompatibilityAuditEvent"("compatibilityId", "createdAt");
CREATE INDEX "CompatibilityAuditEvent_actorId_createdAt_idx" ON "CompatibilityAuditEvent"("actorId", "createdAt");
CREATE INDEX "CompatibilityAuditEvent_action_createdAt_idx" ON "CompatibilityAuditEvent"("action", "createdAt");
CREATE INDEX "CompatibilityImportBatch_status_createdAt_idx" ON "CompatibilityImportBatch"("status", "createdAt");
CREATE INDEX "CompatibilityImportBatch_sourceId_createdAt_idx" ON "CompatibilityImportBatch"("sourceId", "createdAt");
CREATE INDEX "CompatibilityPhysicalTest_compatibilityId_result_testedAt_idx" ON "CompatibilityPhysicalTest"("compatibilityId", "result", "testedAt");
CREATE INDEX "CompatibilityPhysicalTest_testerId_testedAt_idx" ON "CompatibilityPhysicalTest"("testerId", "testedAt");
CREATE INDEX "CompatibilityConflictReport_compatibilityId_status_severity_idx" ON "CompatibilityConflictReport"("compatibilityId", "status", "severity");
CREATE INDEX "CompatibilityConflictReport_status_createdAt_idx" ON "CompatibilityConflictReport"("status", "createdAt");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompatibilityEvidence" ADD CONSTRAINT "CompatibilityEvidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CompatibilitySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompatibilityReview" ADD CONSTRAINT "CompatibilityReview_compatibilityId_fkey" FOREIGN KEY ("compatibilityId") REFERENCES "DeviceCompatibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompatibilityAuditEvent" ADD CONSTRAINT "CompatibilityAuditEvent_compatibilityId_fkey" FOREIGN KEY ("compatibilityId") REFERENCES "DeviceCompatibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompatibilityImportBatch" ADD CONSTRAINT "CompatibilityImportBatch_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CompatibilitySource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompatibilityPhysicalTest" ADD CONSTRAINT "CompatibilityPhysicalTest_compatibilityId_fkey" FOREIGN KEY ("compatibilityId") REFERENCES "DeviceCompatibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompatibilityConflictReport" ADD CONSTRAINT "CompatibilityConflictReport_compatibilityId_fkey" FOREIGN KEY ("compatibilityId") REFERENCES "DeviceCompatibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New governance tables are server-only. No Data API policies are created.
ALTER TABLE "CompatibilitySource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompatibilityReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompatibilityAuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompatibilityImportBatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompatibilityPhysicalTest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompatibilityConflictReport" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CompatibilitySource", "CompatibilityReview", "CompatibilityAuditEvent", "CompatibilityImportBatch", "CompatibilityPhysicalTest", "CompatibilityConflictReport" FROM anon, authenticated;

-- Existing provisional/legacy rows remain unpublished until two independent reviews.
UPDATE "DeviceCompatibility"
SET "publishedAt" = NULL, "publishedById" = NULL
WHERE "compatibilityStatus" <> 'VERIFIED' OR "verifiedById" IS NULL;
