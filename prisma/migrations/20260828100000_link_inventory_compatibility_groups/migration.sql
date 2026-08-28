CREATE TABLE "InventoryCompatibilityGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventoryItemId" UUID NOT NULL,
    "candidateGroupId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryCompatibilityGroup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryCompatibilityGroup_inventoryItemId_candidateGroupId_key" UNIQUE ("inventoryItemId", "candidateGroupId")
);

CREATE INDEX "InventoryCompatibilityGroup_inventoryItemId_idx"
    ON "InventoryCompatibilityGroup"("inventoryItemId");

CREATE INDEX "InventoryCompatibilityGroup_candidateGroupId_idx"
    ON "InventoryCompatibilityGroup"("candidateGroupId");

ALTER TABLE "InventoryCompatibilityGroup"
    ADD CONSTRAINT "InventoryCompatibilityGroup_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryCompatibilityGroup"
    ADD CONSTRAINT "InventoryCompatibilityGroup_candidateGroupId_fkey"
    FOREIGN KEY ("candidateGroupId") REFERENCES "CompatibilityCandidateGroup"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryCompatibilityGroup" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "InventoryCompatibilityGroup" FROM PUBLIC, anon, authenticated;
