ALTER TABLE "DebtLedgerEntry"
ADD COLUMN IF NOT EXISTS "sourceName" VARCHAR(80);

COMMENT ON COLUMN "DebtLedgerEntry"."sourceName" IS
'Immutable display snapshot of the payment source used for this debt collection, e.g. Vodafone Cash, InstaPay, Sham Cash.';
