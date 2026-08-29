CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requestFingerprint" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
    ON "PasswordResetToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_createdAt_idx"
    ON "PasswordResetToken"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx"
    ON "PasswordResetToken"("expiresAt");

CREATE INDEX IF NOT EXISTS "PasswordResetToken_requestFingerprint_createdAt_idx"
    ON "PasswordResetToken"("requestFingerprint", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PasswordResetToken_userId_fkey'
    ) THEN
        ALTER TABLE "PasswordResetToken"
            ADD CONSTRAINT "PasswordResetToken_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- This table is server-only. Keep it inaccessible through Supabase's Data API.
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PasswordResetToken" FROM anon, authenticated;
