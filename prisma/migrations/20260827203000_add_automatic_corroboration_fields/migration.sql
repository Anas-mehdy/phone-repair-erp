ALTER TABLE "DeviceCompatibility"
  ADD COLUMN IF NOT EXISTS "corroboratedSourceCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT;

CREATE INDEX IF NOT EXISTS "DeviceCompatibility_publication_gate_idx"
  ON "DeviceCompatibility"("compatibilityStatus", "publishedAt", "suspendedAt", "isArchived");
