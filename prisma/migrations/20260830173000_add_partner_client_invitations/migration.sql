-- Durable partner client onboarding invitations.
CREATE TABLE "PartnerClientInvitation" (
  "id" UUID NOT NULL,
  "partnerId" UUID NOT NULL,
  "clientName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerClientInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerClientInvitation_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartnerClientInvitation_status_check"
    CHECK ("status" IN ('PENDING','USED','CANCELED','EXPIRED')),
  CONSTRAINT "PartnerClientInvitation_email_check" CHECK (length(btrim("email")) > 3),
  CONSTRAINT "PartnerClientInvitation_name_check" CHECK (length(btrim("clientName")) >= 2)
);

CREATE UNIQUE INDEX "PartnerClientInvitation_tokenHash_key"
  ON "PartnerClientInvitation" ("tokenHash");
CREATE UNIQUE INDEX "PartnerClientInvitation_pending_partner_email_key"
  ON "PartnerClientInvitation" ("partnerId", lower("email"))
  WHERE "status" = 'PENDING';
CREATE INDEX "PartnerClientInvitation_partner_status_idx"
  ON "PartnerClientInvitation" ("partnerId", "status", "createdAt" DESC);
CREATE INDEX "PartnerClientInvitation_expiresAt_idx"
  ON "PartnerClientInvitation" ("expiresAt");
