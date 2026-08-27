import { prisma } from "../lib/prisma";
import {
  compatibilityService,
  deviceService,
  partService,
} from "../lib/services/compatibility";
import {
  CURATED_DEVICES,
  CURATED_PARTS,
  CURATED_COMPATIBILITIES,
} from "./data/compatibility-dataset";
import {
  CompatibilityStatus,
  Device,
  Part,
} from "@prisma/client";

async function seedCompatibilityEngine() {
  console.log("==================================================");
  console.log("🌱 SEEDING HIGH-CONFIDENCE COMPATIBILITY DATASET");
  console.log("==================================================");

  // 1. Establish distinct identities for Four-Eyes Principle
  const creatorUser = {
    id: "00000000-0000-0000-0000-000000000101",
    email: "technical-submitter@system.internal",
    role: "TECHNICIAN",
    isSuperAdmin: false,
  };

  const verifierUser = {
    id: "00000000-0000-0000-0000-000000000102",
    email: "lead-engineer@system.internal",
    role: "ADMIN",
    isSuperAdmin: true,
  };

  // 2. Seed Devices Idempotently
  console.log(`Processing ${CURATED_DEVICES.length} Curated Devices...`);
  const deviceMap = new Map<string, Device>();

  for (const devInput of CURATED_DEVICES) {
    const brand = devInput.brand.trim();
    const modelNumber = devInput.modelNumber.trim();
    const networkVariant = devInput.networkVariant?.trim() || null;
    const region = devInput.region?.trim() || null;
    const boardRevision = devInput.boardRevision?.trim() || null;

    const existing: any[] = await prisma.$queryRaw`
      SELECT * FROM "Device"
      WHERE LOWER(TRIM("brand")) = LOWER(${brand})
        AND LOWER(TRIM("modelNumber")) = LOWER(${modelNumber})
        AND COALESCE(LOWER(TRIM("networkVariant")), '') = COALESCE(LOWER(${networkVariant}), '')
        AND COALESCE(LOWER(TRIM("region")), '') = COALESCE(LOWER(${region}), '')
        AND COALESCE(LOWER(TRIM("boardRevision")), '') = COALESCE(LOWER(${boardRevision}), '');
    `;

    let deviceRecord: Device;
    if (existing && existing.length > 0) {
      deviceRecord = existing[0];
    } else {
      deviceRecord = await deviceService.createDevice({
        brand,
        commercialName: devInput.commercialName,
        modelNumber,
        networkVariant,
        region,
        boardRevision,
        releaseYear: devInput.releaseYear || null,
        notes: devInput.notes || null,
      });
    }

    const key = `${brand}_${modelNumber}_${networkVariant || ""}`;
    deviceMap.set(key, deviceRecord);
  }

  // 3. Seed Parts Idempotently
  console.log(`Processing ${CURATED_PARTS.length} Curated Parts...`);
  const partMap = new Map<string, Part>();

  for (const partInput of CURATED_PARTS) {
    let existingPart: Part | null = null;
    if (partInput.manufacturerCode) {
      existingPart = await prisma.part.findFirst({
        where: {
          category: partInput.category,
          manufacturerCode: partInput.manufacturerCode.trim(),
        },
      });
    }

    if (!existingPart) {
      existingPart = await prisma.part.findFirst({
        where: {
          category: partInput.category,
          name: partInput.name.trim(),
        },
      });
    }

    if (!existingPart) {
      existingPart = await partService.createPart({
        category: partInput.category,
        name: partInput.name,
        manufacturerCode: partInput.manufacturerCode || null,
        partAliases: partInput.partAliases || [],
        specifications: partInput.specifications,
      });

    }

    if (partInput.manufacturerCode) {
      partMap.set(partInput.manufacturerCode.trim(), existingPart);
    }
    partMap.set(partInput.name.trim(), existingPart);
  }

  // 4. Seed Compatibilities & Verified Evidences Idempotently with Four-Eyes
  console.log(`Processing ${CURATED_COMPATIBILITIES.length} Curated Compatibilities...`);
  let createdCount = 0;
  let existingCount = 0;

  for (const compat of CURATED_COMPATIBILITIES) {
    const devKey = `${compat.deviceBrand}_${compat.deviceModel}_${compat.deviceNetworkVariant || ""}`;
    const device = deviceMap.get(devKey);
    const part = partMap.get(compat.partNameOrCode.trim());

    if (!device || !part) {
      console.warn(`⚠️ Skipped compat for missing device [${devKey}] or part [${compat.partNameOrCode}]`);
      continue;
    }

    const existingCompat = await prisma.deviceCompatibility.findUnique({
      where: {
        deviceId_partId: {
          deviceId: device.id,
          partId: part.id,
        },
      },
      include: { evidences: true },
    });

    if (existingCompat) {
      existingCount++;
      // Check if evidence exists, if not add it
      const hasEv = existingCompat.evidences.some(
        (e) => e.sourceReference === compat.evidence.sourceReference
      );
      if (!hasEv) {
        await prisma.compatibilityEvidence.create({
          data: {
            compatibilityId: existingCompat.id,
            sourceType: compat.evidence.sourceType,
            sourceReference: compat.evidence.sourceReference,
            evidenceDetails: compat.evidence.evidenceDetails,
            verifiedBy: verifierUser.id,
            verifiedAt: new Date(),
          },
        });
      }
      continue;
    }

    if (compat.status === CompatibilityStatus.VERIFIED) {
      // 1. Create UNVERIFIED by creatorUser
      const unverified = await compatibilityService.createCompatibility(
        {
          deviceId: device.id,
          partId: part.id,
          compatibilityType: compat.type,
          technicalNotes: compat.technicalNotes,
        },
        creatorUser
      );

      // 2. Atomically verify with verifierUser + Evidence (Four-Eyes compliant)
      await compatibilityService.verifyCompatibility(
        {
          compatibilityId: unverified.id,
          verificationLevel: compat.level,
          compatibilityType: compat.type,
          technicalNotes: compat.technicalNotes,
          evidence: {
            sourceType: compat.evidence.sourceType,
            sourceReference: compat.evidence.sourceReference,
            evidenceDetails: compat.evidence.evidenceDetails,
          },
        },
        verifierUser
      );
      createdCount++;
    } else if (compat.status === CompatibilityStatus.INCOMPATIBLE) {
      // Create and mark incompatible
      const unverified = await compatibilityService.createCompatibility(
        {
          deviceId: device.id,
          partId: part.id,
          compatibilityType: compat.type,
          technicalNotes: compat.technicalNotes,
        },
        creatorUser
      );

      // Attach evidence
      await prisma.compatibilityEvidence.create({
        data: {
          compatibilityId: unverified.id,
          sourceType: compat.evidence.sourceType,
          sourceReference: compat.evidence.sourceReference,
          evidenceDetails: compat.evidence.evidenceDetails,
          verifiedBy: verifierUser.id,
          verifiedAt: new Date(),
        },
      });

      await compatibilityService.markIncompatible(
        {
          compatibilityId: unverified.id,
          reason: compat.technicalNotes,
        },
        verifierUser
      );
      createdCount++;
    }
  }

  // 5. Query and Print Database Statistics
  const totalDevices = await prisma.device.count();
  const totalParts = await prisma.part.count();
  const totalCompatibilities = await prisma.deviceCompatibility.count();
  const verifiedCount = await prisma.deviceCompatibility.count({
    where: { compatibilityStatus: CompatibilityStatus.VERIFIED },
  });
  const incompatibleCount = await prisma.deviceCompatibility.count({
    where: { compatibilityStatus: CompatibilityStatus.INCOMPATIBLE },
  });
  const totalEvidences = await prisma.compatibilityEvidence.count();

  console.log("==================================================");
  console.log("📊 SEED DATASET SUMMARY STATS");
  console.log("==================================================");
  console.log(`Total Devices in DB:        ${totalDevices}`);
  console.log(`Total Parts in DB:          ${totalParts}`);
  console.log(`Total Compatibilities:      ${totalCompatibilities}`);
  console.log(`  - VERIFIED:               ${verifiedCount}`);
  console.log(`  - INCOMPATIBLE:           ${incompatibleCount}`);
  console.log(`Total Evidences in DB:      ${totalEvidences}`);
  console.log(`New compatibilities created: ${createdCount}`);
  console.log(`Existing untouched:         ${existingCount}`);
  console.log("==================================================");
}

seedCompatibilityEngine()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("FATAL ERROR IN COMPATIBILITY SEED:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
