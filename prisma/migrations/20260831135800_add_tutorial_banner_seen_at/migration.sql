ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "tutorialBannerSeenAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_tutorialBannerSeenAt_idx"
ON "User"("tutorialBannerSeenAt");
