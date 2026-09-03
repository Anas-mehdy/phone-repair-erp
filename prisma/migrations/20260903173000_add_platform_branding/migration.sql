CREATE TABLE "PlatformBranding" (
  "id" TEXT NOT NULL,
  "darkModeLogoBase64" TEXT,
  "darkModeLogoMimeType" VARCHAR(100),
  "darkModeLogoUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformBranding_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformBranding" ("id")
VALUES ('GLOBAL')
ON CONFLICT ("id") DO NOTHING;
