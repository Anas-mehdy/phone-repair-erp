-- One private photo per repair ticket. Blob data is isolated from ordinary ticket queries.
CREATE TABLE "RepairOrderIntakePhoto" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "repairOrderId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "uploadedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepairOrderIntakePhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepairOrderIntakePhoto_repairOrderId_key" ON "RepairOrderIntakePhoto"("repairOrderId");
CREATE INDEX "RepairOrderIntakePhoto_shopId_repairOrderId_idx" ON "RepairOrderIntakePhoto"("shopId", "repairOrderId");

ALTER TABLE "RepairOrderIntakePhoto"
    ADD CONSTRAINT "RepairOrderIntakePhoto_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepairOrderIntakePhoto"
    ADD CONSTRAINT "RepairOrderIntakePhoto_repairOrderId_fkey"
    FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- No REST or browser access: custom app sessions are not Supabase Auth sessions.
-- Application server reads the photo only after repairs:read and shopId checks.
ALTER TABLE "RepairOrderIntakePhoto" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RepairOrderIntakePhoto" FROM anon, authenticated;
