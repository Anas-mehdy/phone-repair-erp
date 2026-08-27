import { PartCategory, Prisma, CompatibilityStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  SCREEN_PILOT_BATCH,
  SCREEN_PILOT_DEVICES,
  SCREEN_PILOT_FAMILY,
  SCREEN_PILOT_LICENSE_NOTE,
  SCREEN_PILOT_SOURCES,
  SCREEN_PILOT_VARIANTS,
  SCREEN_VARIANT_BATCH,
} from "./data/screen-pilot";

const ACTOR = "system:screen-source-pilot";

async function seedScreenPilot() {
  const sourceMap = new Map<string, string>();

  for (const source of SCREEN_PILOT_SOURCES) {
    const existing = await prisma.compatibilitySource.findFirst({ where: { url: source.url } });
    const record = existing ?? await prisma.compatibilitySource.create({
      data: {
        name: source.name,
        publisher: source.publisher,
        sourceType: source.sourceType,
        url: source.url,
        trustLevel: source.trustLevel,
        licenseNotes: SCREEN_PILOT_LICENSE_NOTE,
      },
    });
    sourceMap.set(source.url, record.id);
  }

  const devices = [];
  for (const device of SCREEN_PILOT_DEVICES) {
    const existing = await prisma.device.findFirst({
      where: {
        brand: { equals: device.brand, mode: "insensitive" },
        modelNumber: { equals: device.modelNumber, mode: "insensitive" },
        networkVariant: { equals: device.networkVariant, mode: "insensitive" },
        region: { equals: device.region, mode: "insensitive" },
        boardRevision: null,
      },
    });
    devices.push(existing ?? await prisma.device.create({
      data: {
        ...device,
        notes: "Identity confirmed from manufacturer documentation; regional suffix variants require separate mapping.",
      },
    }));
  }

  const part = await prisma.part.findFirst({
    where: { normalizedPartCode: SCREEN_PILOT_FAMILY.normalizedPartCode },
  }) ?? await prisma.part.create({
    data: {
      category: PartCategory.SCREEN,
      name: SCREEN_PILOT_FAMILY.name,
      normalizedPartCode: SCREEN_PILOT_FAMILY.normalizedPartCode,
      partAliases: [...SCREEN_PILOT_FAMILY.aliases],
      specifications: SCREEN_PILOT_FAMILY.specifications as unknown as Prisma.InputJsonValue,
    },
  });

  for (const device of devices) {
    const existing = await prisma.deviceCompatibility.findUnique({
      where: { deviceId_partId: { deviceId: device.id, partId: part.id } },
    });
    const compatibility = existing ?? await prisma.deviceCompatibility.create({
      data: {
        deviceId: device.id,
        partId: part.id,
        compatibilityStatus: CompatibilityStatus.UNVERIFIED,
        compatibilityType: SCREEN_PILOT_FAMILY.compatibilityType,
        verificationLevel: SCREEN_PILOT_FAMILY.verificationLevel,
        technicalNotes: SCREEN_PILOT_FAMILY.technicalNotes,
        createdById: ACTOR,
      },
    });

    for (const source of SCREEN_PILOT_SOURCES) {
      const alreadyRecorded = await prisma.compatibilityEvidence.findFirst({
        where: { compatibilityId: compatibility.id, sourceReference: source.url },
      });
      if (!alreadyRecorded) {
        await prisma.compatibilityEvidence.create({
          data: {
            compatibilityId: compatibility.id,
            sourceId: sourceMap.get(source.url),
            sourceType: source.sourceType,
            sourceReference: source.url,
            evidenceDetails: source.details,
            verifiedBy: ACTOR,
          },
        });
      }
    }

    const auditExists = await prisma.compatibilityAuditEvent.findFirst({
      where: { compatibilityId: compatibility.id, action: "SCREEN_PILOT_IMPORTED" },
    });
    if (!auditExists) {
      await prisma.compatibilityAuditEvent.create({
        data: {
          compatibilityId: compatibility.id,
          actorId: ACTOR,
          action: "SCREEN_PILOT_IMPORTED",
          toStatus: CompatibilityStatus.UNVERIFIED,
          reason: "Three supplier catalogs agree on the model family; quality-specific behavior remains under review.",
          metadata: { category: "SCREEN", sourceCount: 3, autoPublished: false },
        },
      });
    }
  }

  const batchExists = await prisma.compatibilityImportBatch.findFirst({
    where: { filename: SCREEN_PILOT_BATCH },
  });
  if (!batchExists) {
    await prisma.compatibilityImportBatch.create({
      data: {
        filename: SCREEN_PILOT_BATCH,
        status: "IMPORTED",
        totalRows: devices.length,
        validRows: devices.length,
        createdRecords: devices.length,
        validationReport: { category: "SCREEN", sourceCount: 3, publicationStatus: "UNVERIFIED" },
        createdById: ACTOR,
        completedAt: new Date(),
      },
    });
  }

  // The first pilot grouped conflicting quality claims into one research family.
  // Keep it as audit history, but never treat it as an installable screen.
  const archivedAt = new Date();
  await prisma.deviceCompatibility.updateMany({
    where: { partId: part.id, isArchived: false },
    data: { isArchived: true, archivedAt },
  });
  await prisma.part.update({
    where: { id: part.id },
    data: { isArchived: true, archivedAt },
  });

  let createdVariantRelationships = 0;
  for (const variant of SCREEN_PILOT_VARIANTS) {
    const variantPart = await prisma.part.findFirst({
      where: { normalizedPartCode: variant.normalizedPartCode },
    }) ?? await prisma.part.create({
      data: {
        category: PartCategory.SCREEN,
        name: variant.name,
        manufacturerCode: variant.manufacturerCode,
        normalizedPartCode: variant.normalizedPartCode,
        partAliases: [...variant.aliases],
        specifications: variant.specifications as unknown as Prisma.InputJsonValue,
      },
    });

    const source = SCREEN_PILOT_SOURCES.find((item) => item.url === variant.sourceUrl);
    if (!source) throw new Error(`Missing source metadata for ${variant.normalizedPartCode}`);

    for (const device of devices) {
      const existingCompatibility = await prisma.deviceCompatibility.findUnique({
        where: { deviceId_partId: { deviceId: device.id, partId: variantPart.id } },
      });
      const compatibility = existingCompatibility ?? await prisma.deviceCompatibility.create({
        data: {
          deviceId: device.id,
          partId: variantPart.id,
          compatibilityStatus: CompatibilityStatus.UNVERIFIED,
          compatibilityType: SCREEN_PILOT_FAMILY.compatibilityType,
          verificationLevel: SCREEN_PILOT_FAMILY.verificationLevel,
          technicalNotes: variant.technicalNotes,
          createdById: ACTOR,
        },
      });

      const sourceEvidence = await prisma.compatibilityEvidence.findFirst({
        where: { compatibilityId: compatibility.id, sourceReference: source.url },
      });
      if (!sourceEvidence) {
        await prisma.compatibilityEvidence.create({
          data: {
            compatibilityId: compatibility.id,
            sourceId: sourceMap.get(source.url),
            sourceType: source.sourceType,
            sourceReference: source.url,
            evidenceDetails: source.details,
            verifiedBy: ACTOR,
          },
        });
      }

      const auditExists = await prisma.compatibilityAuditEvent.findFirst({
        where: { compatibilityId: compatibility.id, action: "SCREEN_VARIANT_IMPORTED" },
      });
      if (!auditExists) {
        await prisma.compatibilityAuditEvent.create({
          data: {
            compatibilityId: compatibility.id,
            actorId: ACTOR,
            action: "SCREEN_VARIANT_IMPORTED",
            toStatus: CompatibilityStatus.UNVERIFIED,
            reason: "Exact supplier listing imported as a quality-specific screen candidate; no automatic publication.",
            metadata: {
              category: "SCREEN",
              quality: variant.specifications.quality,
              supplier: variant.specifications.supplier,
              autoPublished: false,
            },
          },
        });
      }
      createdVariantRelationships += 1;
    }
  }

  const variantBatchExists = await prisma.compatibilityImportBatch.findFirst({
    where: { filename: SCREEN_VARIANT_BATCH },
  });
  if (!variantBatchExists) {
    await prisma.compatibilityImportBatch.create({
      data: {
        filename: SCREEN_VARIANT_BATCH,
        status: "IMPORTED",
        totalRows: createdVariantRelationships,
        validRows: createdVariantRelationships,
        createdRecords: createdVariantRelationships,
        validationReport: {
          category: "SCREEN",
          variantCount: SCREEN_PILOT_VARIANTS.length,
          publicationStatus: "UNVERIFIED",
          legacyFamilyArchived: true,
        },
        createdById: ACTOR,
        completedAt: new Date(),
      },
    });
  }

  console.log(
    `Screen pilot ready: ${SCREEN_PILOT_VARIANTS.length} quality variants × ${devices.length} devices, status UNVERIFIED.`,
  );
}

seedScreenPilot()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
