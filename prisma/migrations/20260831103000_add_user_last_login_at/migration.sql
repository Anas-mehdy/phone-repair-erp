ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "User_lastLoginAt_idx"
ON "User"("lastLoginAt");
