-- Inventory categories phase 1
-- Additive migration: legacy InventoryItem.category remains untouched as a fallback.

CREATE TABLE IF NOT EXISTS "InventoryCategory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "shopId" uuid NOT NULL,
  "name" text NOT NULL,
  "normalizedName" text NOT NULL,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "deletedAt" timestamptz NULL,
  CONSTRAINT "InventoryCategory_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryCategory_shopId_normalizedName_active_key"
  ON "InventoryCategory" ("shopId", "normalizedName")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "InventoryCategory_shopId_sortOrder_idx"
  ON "InventoryCategory" ("shopId", "sortOrder", "name");

ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "categoryId" uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_categoryId_fkey'
  ) THEN
    ALTER TABLE "InventoryItem"
      ADD CONSTRAINT "InventoryItem_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "InventoryItem_shopId_categoryId_idx"
  ON "InventoryItem" ("shopId", "categoryId");

-- One saved category per distinct existing legacy text, scoped to each shop.
INSERT INTO "InventoryCategory" ("shopId", "name", "normalizedName")
SELECT DISTINCT ON (i."shopId", lower(btrim(i."category")))
  i."shopId",
  btrim(i."category") AS "name",
  lower(btrim(i."category")) AS "normalizedName"
FROM "InventoryItem" i
WHERE i."deletedAt" IS NULL
  AND i."category" IS NOT NULL
  AND btrim(i."category") <> ''
ORDER BY i."shopId", lower(btrim(i."category")), i."createdAt" ASC
ON CONFLICT DO NOTHING;

-- Link every existing item without overwriting its legacy category text or any product data.
UPDATE "InventoryItem" i
SET "categoryId" = c."id"
FROM "InventoryCategory" c
WHERE i."shopId" = c."shopId"
  AND c."deletedAt" IS NULL
  AND i."categoryId" IS NULL
  AND i."category" IS NOT NULL
  AND btrim(i."category") <> ''
  AND lower(btrim(i."category")) = c."normalizedName";

ALTER TABLE "InventoryCategory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "InventoryCategory" FROM anon, authenticated;
