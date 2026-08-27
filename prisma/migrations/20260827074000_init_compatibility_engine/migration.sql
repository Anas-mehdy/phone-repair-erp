-- CreateEnum
CREATE TYPE "PartCategory" AS ENUM ('SCREEN', 'BATTERY', 'CHARGING_PORT', 'IC_CHIP', 'CONNECTOR', 'CAMERA', 'HOUSING_FRAME', 'OTHER');

-- CreateEnum
CREATE TYPE "CompatibilityStatus" AS ENUM ('VERIFIED', 'PROVISIONALLY_VERIFIED', 'UNVERIFIED', 'INCOMPATIBLE');

-- CreateEnum
CREATE TYPE "CompatibilityType" AS ENUM ('DIRECT_REPLACEMENT', 'FUNCTIONAL_EQUIVALENT', 'PHYSICAL_COMPATIBLE', 'REQUIRES_MODIFICATION', 'PARTIAL_COMPATIBILITY', 'INCOMPATIBLE');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('OEM_OFFICIAL', 'ENGINEERING_VERIFIED', 'PHYSICAL_TEST_VERIFIED', 'TECHNICIAN_REPORTED', 'SUPPLIER_CATALOG');

-- CreateEnum
CREATE TYPE "VerificationSourceType" AS ENUM ('OEM_SERVICE_MANUAL', 'MANUFACTURER_PART_NO', 'OFFICIAL_DOCUMENTATION', 'BOARDVIEW_SCHEMATIC', 'PHYSICAL_TEST', 'TRUSTED_SUPPLIER', 'TECHNICIAN_VERIFIED');

-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "commercialName" TEXT NOT NULL,
    "modelNumber" TEXT NOT NULL,
    "normalizedModel" TEXT NOT NULL,
    "networkVariant" TEXT,
    "region" TEXT,
    "boardRevision" TEXT,
    "releaseYear" INTEGER,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" UUID NOT NULL,
    "category" "PartCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturerCode" TEXT,
    "normalizedPartCode" TEXT,
    "partAliases" TEXT[],
    "specifications" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCompatibility" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "compatibilityStatus" "CompatibilityStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "compatibilityType" "CompatibilityType" NOT NULL,
    "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'TECHNICIAN_REPORTED',
    "technicalNotes" TEXT,
    "createdById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityEvidence" (
    "id" UUID NOT NULL,
    "compatibilityId" UUID NOT NULL,
    "sourceType" "VerificationSourceType" NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "evidenceDetails" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatibilityEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device_normalizedModel_idx" ON "Device"("normalizedModel");

-- CreateIndex
CREATE INDEX "Device_brand_commercialName_idx" ON "Device"("brand", "commercialName");

-- CreateIndex
CREATE INDEX "Device_isArchived_idx" ON "Device"("isArchived");

-- CreateIndex
CREATE INDEX "Part_category_idx" ON "Part"("category");

-- CreateIndex
CREATE INDEX "Part_normalizedPartCode_idx" ON "Part"("normalizedPartCode");

-- CreateIndex
CREATE INDEX "Part_isArchived_idx" ON "Part"("isArchived");

-- CreateIndex
CREATE INDEX "DeviceCompatibility_deviceId_idx" ON "DeviceCompatibility"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceCompatibility_partId_idx" ON "DeviceCompatibility"("partId");

-- CreateIndex
CREATE INDEX "DeviceCompatibility_compatibilityStatus_idx" ON "DeviceCompatibility"("compatibilityStatus");

-- CreateIndex
CREATE INDEX "DeviceCompatibility_isArchived_idx" ON "DeviceCompatibility"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCompatibility_deviceId_partId_key" ON "DeviceCompatibility"("deviceId", "partId");

-- CreateIndex
CREATE INDEX "CompatibilityEvidence_compatibilityId_idx" ON "CompatibilityEvidence"("compatibilityId");

-- CreateIndex
CREATE INDEX "CompatibilityEvidence_sourceType_idx" ON "CompatibilityEvidence"("sourceType");

-- Custom PostgreSQL Deterministic Index for Device Identity
CREATE UNIQUE INDEX "idx_device_deterministic_identity" ON "Device" (
  LOWER(TRIM(brand)),
  LOWER(TRIM("modelNumber")),
  COALESCE(LOWER(TRIM("networkVariant")), ''),
  COALESCE(LOWER(TRIM(region)), ''),
  COALESCE(LOWER(TRIM("boardRevision")), '')
);

-- AddForeignKey
ALTER TABLE "DeviceCompatibility" ADD CONSTRAINT "DeviceCompatibility_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCompatibility" ADD CONSTRAINT "DeviceCompatibility_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityEvidence" ADD CONSTRAINT "CompatibilityEvidence_compatibilityId_fkey" FOREIGN KEY ("compatibilityId") REFERENCES "DeviceCompatibility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
