-- Cover the InventoryItem.partId foreign key for deletes/updates from Part.
CREATE INDEX "InventoryItem_partId_idx" ON "InventoryItem"("partId");
