-- Growth onboarding state: stores user-selected onboarding preferences only.
-- Product activation/first-value signals remain derived from real business data.

CREATE TABLE "ShopOnboardingProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shopId" UUID NOT NULL,
  "flowVersion" INTEGER NOT NULL DEFAULT 1,
  "primaryJob" VARCHAR(40),
  "selectedJobs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ShopOnboardingProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShopOnboardingProfile_shopId_key" UNIQUE ("shopId"),
  CONSTRAINT "ShopOnboardingProfile_shopId_fkey"
    FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ShopOnboardingProfile_flowVersion_check"
    CHECK ("flowVersion" >= 1),
  CONSTRAINT "ShopOnboardingProfile_primaryJob_check"
    CHECK (
      "primaryJob" IS NULL OR
      "primaryJob" IN ('REPAIRS','SALES','INVENTORY','WALLETS','DEBTS','ELECTRONIC_SERVICES')
    ),
  CONSTRAINT "ShopOnboardingProfile_selectedJobs_check"
    CHECK (
      "selectedJobs" <@ ARRAY['REPAIRS','SALES','INVENTORY','WALLETS','DEBTS','ELECTRONIC_SERVICES']::TEXT[]
    ),
  CONSTRAINT "ShopOnboardingProfile_primary_selected_check"
    CHECK ("primaryJob" IS NULL OR "primaryJob" = ANY ("selectedJobs")),
  CONSTRAINT "ShopOnboardingProfile_terminal_state_check"
    CHECK (NOT ("completedAt" IS NOT NULL AND "skippedAt" IS NOT NULL)),
  CONSTRAINT "ShopOnboardingProfile_completed_preferences_check"
    CHECK (
      "completedAt" IS NULL OR
      ("primaryJob" IS NOT NULL AND cardinality("selectedJobs") > 0)
    )
);

CREATE INDEX "ShopOnboardingProfile_primaryJob_idx"
  ON "ShopOnboardingProfile"("primaryJob");
CREATE INDEX "ShopOnboardingProfile_flowVersion_completedAt_idx"
  ON "ShopOnboardingProfile"("flowVersion", "completedAt");

ALTER TABLE "ShopOnboardingProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ShopOnboardingProfile" FROM anon, authenticated;
