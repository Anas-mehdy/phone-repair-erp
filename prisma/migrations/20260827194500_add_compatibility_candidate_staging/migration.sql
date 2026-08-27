DO $$ BEGIN
  CREATE TYPE "CompatibilityCandidateStatus" AS ENUM (
    'READY_FOR_CORROBORATION',
    'NEEDS_REVIEW',
    'QUARANTINED',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CompatibilityImportBatch"
  ADD COLUMN IF NOT EXISTS "sourceFileHash" TEXT,
  ADD COLUMN IF NOT EXISTS "categoryName" TEXT;

CREATE TABLE IF NOT EXISTS "CompatibilityCandidateGroup" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchId" UUID NOT NULL,
  "sourceGroupId" TEXT NOT NULL,
  "brandSection" TEXT NOT NULL,
  "rawSourceText" TEXT NOT NULL,
  "contributor" TEXT,
  "mappedCategory" "PartCategory",
  "confidenceScore" INTEGER NOT NULL DEFAULT 0,
  "status" "CompatibilityCandidateStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "issues" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompatibilityCandidateGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CompatibilityCandidateMember" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "candidateGroupId" UUID NOT NULL,
  "rawModelName" TEXT NOT NULL,
  "normalizedModelName" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "matchedDeviceId" UUID,
  "matchConfidence" INTEGER,
  "matchNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompatibilityCandidateMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompatibilityImportBatch_sourceFileHash_key" ON "CompatibilityImportBatch"("sourceFileHash");
CREATE INDEX IF NOT EXISTS "CompatibilityImportBatch_categoryName_idx" ON "CompatibilityImportBatch"("categoryName");
CREATE UNIQUE INDEX IF NOT EXISTS "CompatibilityCandidateGroup_batchId_sourceGroupId_key" ON "CompatibilityCandidateGroup"("batchId", "sourceGroupId");
CREATE INDEX IF NOT EXISTS "CompatibilityCandidateGroup_status_idx" ON "CompatibilityCandidateGroup"("status");
CREATE INDEX IF NOT EXISTS "CompatibilityCandidateGroup_mappedCategory_idx" ON "CompatibilityCandidateGroup"("mappedCategory");
CREATE INDEX IF NOT EXISTS "CompatibilityCandidateGroup_brandSection_idx" ON "CompatibilityCandidateGroup"("brandSection");
CREATE UNIQUE INDEX IF NOT EXISTS "CompatibilityCandidateMember_candidateGroupId_position_key" ON "CompatibilityCandidateMember"("candidateGroupId", "position");
CREATE INDEX IF NOT EXISTS "CompatibilityCandidateMember_normalizedModelName_idx" ON "CompatibilityCandidateMember"("normalizedModelName");
CREATE INDEX IF NOT EXISTS "CompatibilityCandidateMember_matchedDeviceId_idx" ON "CompatibilityCandidateMember"("matchedDeviceId");

DO $$ BEGIN
  ALTER TABLE "CompatibilityCandidateGroup"
    ADD CONSTRAINT "CompatibilityCandidateGroup_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "CompatibilityImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompatibilityCandidateMember"
    ADD CONSTRAINT "CompatibilityCandidateMember_candidateGroupId_fkey"
    FOREIGN KEY ("candidateGroupId") REFERENCES "CompatibilityCandidateGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CompatibilityCandidateMember"
    ADD CONSTRAINT "CompatibilityCandidateMember_matchedDeviceId_fkey"
    FOREIGN KEY ("matchedDeviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- These staging tables are internal-only. RLS with no public policies prevents
-- accidental access through Supabase's Data API while Prisma uses the DB connection.
ALTER TABLE "CompatibilityCandidateGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompatibilityCandidateMember" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "CompatibilityCandidateGroup" FROM anon, authenticated;
REVOKE ALL ON TABLE "CompatibilityCandidateMember" FROM anon, authenticated;
