CREATE TABLE IF NOT EXISTS "TutorialVideoSetting" (
  "categoryKey" VARCHAR(64) PRIMARY KEY,
  "youtubeUrl" TEXT,
  "youtubeVideoId" VARCHAR(32),
  "isEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TutorialVideoSetting_categoryKey_check" CHECK (
    "categoryKey" IN (
      'repair',
      'sales-pos',
      'software-services',
      'electronic-services',
      'inventory-compatibility',
      'installments-payments',
      'debts',
      'cash-drawer',
      'wallets-transfers',
      'reports-profits'
    )
  ),
  CONSTRAINT "TutorialVideoSetting_videoId_check" CHECK (
    "youtubeVideoId" IS NULL OR "youtubeVideoId" ~ '^[A-Za-z0-9_-]{11}$'
  ),
  CONSTRAINT "TutorialVideoSetting_enabled_requires_video_check" CHECK (
    "isEnabled" = FALSE OR ("youtubeUrl" IS NOT NULL AND "youtubeVideoId" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "TutorialVideoSetting_isEnabled_idx"
  ON "TutorialVideoSetting"("isEnabled");

INSERT INTO "TutorialVideoSetting" ("categoryKey") VALUES
  ('repair'),
  ('sales-pos'),
  ('software-services'),
  ('electronic-services'),
  ('inventory-compatibility'),
  ('installments-payments'),
  ('debts'),
  ('cash-drawer'),
  ('wallets-transfers'),
  ('reports-profits')
ON CONFLICT ("categoryKey") DO NOTHING;

ALTER TABLE "TutorialVideoSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TutorialVideoSetting" FROM anon, authenticated;
