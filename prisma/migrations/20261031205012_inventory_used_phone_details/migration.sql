-- Optional used-phone details; existing inventory data is preserved.
ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "deviceColor" VARCHAR(60),
  ADD COLUMN IF NOT EXISTS "deviceNotes" VARCHAR(2000);
