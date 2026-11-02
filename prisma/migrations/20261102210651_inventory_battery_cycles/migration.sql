-- Optional battery cycle count. Existing inventory and quantities are unchanged.
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "batteryCycles" INTEGER;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_batteryCycles_nonnegative' AND conrelid = '"InventoryItem"'::regclass) THEN
    ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_batteryCycles_nonnegative" CHECK ("batteryCycles" IS NULL OR "batteryCycles" >= 0);
  END IF;
END $$;
