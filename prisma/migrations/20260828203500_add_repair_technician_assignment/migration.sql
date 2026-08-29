ALTER TABLE "RepairOrder"
  ADD COLUMN IF NOT EXISTS "assignedByUserId" UUID,
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assignmentSeenAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "RepairOrder_shopId_assignedByUserId_idx"
  ON "RepairOrder"("shopId", "assignedByUserId");

CREATE TABLE IF NOT EXISTS "RepairOrderAssignmentHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "repairOrderId" UUID NOT NULL,
  "fromUserId" UUID,
  "toUserId" UUID,
  "changedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RepairOrderAssignmentHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RepairOrderAssignmentHistory_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RepairOrderAssignmentHistory_repairOrderId_fkey"
    FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RepairOrderAssignmentHistory_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RepairOrderAssignmentHistory_toUserId_fkey"
    FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RepairOrderAssignmentHistory_changedByUserId_fkey"
    FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RepairOrderAssignmentHistory_shopId_repairOrderId_createdAt_idx"
  ON "RepairOrderAssignmentHistory"("shopId", "repairOrderId", "createdAt");

CREATE INDEX IF NOT EXISTS "RepairOrderAssignmentHistory_shopId_toUserId_idx"
  ON "RepairOrderAssignmentHistory"("shopId", "toUserId");

CREATE INDEX IF NOT EXISTS "RepairOrderAssignmentHistory_shopId_changedByUserId_idx"
  ON "RepairOrderAssignmentHistory"("shopId", "changedByUserId");

ALTER TABLE "RepairOrderAssignmentHistory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RepairOrderAssignmentHistory" FROM anon, authenticated;
