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
import {
  SCREEN_CANDIDATE_BATCH_1,
  SCREEN_CANDIDATE_COMPATIBILITY_TYPE,
  SCREEN_CANDIDATE_DEVICES,
  SCREEN_CANDIDATE_LICENSE_NOTE,
  SCREEN_CANDIDATE_SOURCES,
  SCREEN_CANDIDATE_VERIFICATION_LEVEL,
  SCREEN_CANDIDATES,
} from "./data/screen-candidate-batch-1";

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

  const candidateSourceMap = new Map<string, string>();
  for (const source of SCREEN_CANDIDATE_SOURCES) {
    const existingSource = await prisma.compatibilitySource.findFirst({ where: { url: source.url } });
    const sourceRecord = existingSource ?? await prisma.compatibilitySource.create({
      data: {
        ...source,
        licenseNotes: SCREEN_CANDIDATE_LICENSE_NOTE,
      },
    });
    candidateSourceMap.set(source.url, sourceRecord.id);
  }

  const candidateDeviceMap = new Map<string, string>();
  for (const device of SCREEN_CANDIDATE_DEVICES) {
    const { identitySource, ...deviceData } = device;
    const existingDevice = await prisma.device.findFirst({
      where: { modelNumber: { equals: device.modelNumber, mode: "insensitive" } },
    });
    const deviceRecord = existingDevice ?? await prisma.device.create({
      data: {
        ...deviceData,
        notes: `Device identity reference: ${identitySource}`,
      },
    });
    candidateDeviceMap.set(device.modelNumber, deviceRecord.id);
  }

  let candidateRelationshipCount = 0;
  for (const candidate of SCREEN_CANDIDATES) {
    const source = SCREEN_CANDIDATE_SOURCES.find((item) => item.url === candidate.sourceUrl);
    if (!source) throw new Error(`Missing candidate source: ${candidate.sourceUrl}`);

    const candidatePart = await prisma.part.findFirst({
      where: { normalizedPartCode: candidate.normalizedPartCode },
    }) ?? await prisma.part.create({
      data: {
        category: PartCategory.SCREEN,
        name: candidate.name,
        manufacturerCode: candidate.manufacturerCode,
        normalizedPartCode: candidate.normalizedPartCode,
        partAliases: [...candidate.aliases],
        specifications: candidate.specifications as unknown as Prisma.InputJsonValue,
      },
    });

    for (const modelNumber of candidate.deviceModelNumbers) {
      const deviceId = candidateDeviceMap.get(modelNumber);
      if (!deviceId) throw new Error(`Missing candidate device: ${modelNumber}`);

      const existingCompatibility = await prisma.deviceCompatibility.findUnique({
        where: { deviceId_partId: { deviceId, partId: candidatePart.id } },
      });
      const compatibility = existingCompatibility ?? await prisma.deviceCompatibility.create({
        data: {
          deviceId,
          partId: candidatePart.id,
          compatibilityStatus: CompatibilityStatus.UNVERIFIED,
          compatibilityType: SCREEN_CANDIDATE_COMPATIBILITY_TYPE,
          verificationLevel: SCREEN_CANDIDATE_VERIFICATION_LEVEL,
          technicalNotes: candidate.technicalNotes,
          createdById: ACTOR,
        },
      });

      const existingEvidence = await prisma.compatibilityEvidence.findFirst({
        where: { compatibilityId: compatibility.id, sourceReference: candidate.sourceUrl },
      });
      if (!existingEvidence) {
        await prisma.compatibilityEvidence.create({
          data: {
            compatibilityId: compatibility.id,
            sourceId: candidateSourceMap.get(candidate.sourceUrl),
            sourceType: source.sourceType,
            sourceReference: candidate.sourceUrl,
            evidenceDetails: candidate.evidenceDetails,
            verifiedBy: ACTOR,
          },
        });
      }

      const existingAudit = await prisma.compatibilityAuditEvent.findFirst({
        where: { compatibilityId: compatibility.id, action: "SCREEN_CANDIDATE_IMPORTED" },
      });
      if (!existingAudit) {
        await prisma.compatibilityAuditEvent.create({
          data: {
            compatibilityId: compatibility.id,
            actorId: ACTOR,
            action: "SCREEN_CANDIDATE_IMPORTED",
            toStatus: CompatibilityStatus.UNVERIFIED,
            reason: "Exact supplier SKU and device model candidate imported for further corroboration; never auto-published.",
            metadata: {
              category: "SCREEN",
              supplier: candidate.specifications.supplier,
              quality: candidate.specifications.quality,
              batch: SCREEN_CANDIDATE_BATCH_1,
              autoPublished: false,
            },
          },
        });
      }
      candidateRelationshipCount += 1;
    }
  }

  const candidateBatchExists = await prisma.compatibilityImportBatch.findFirst({
    where: { filename: SCREEN_CANDIDATE_BATCH_1 },
  });
  if (!candidateBatchExists) {
    await prisma.compatibilityImportBatch.create({
      data: {
        filename: SCREEN_CANDIDATE_BATCH_1,
        status: "IMPORTED",
        totalRows: candidateRelationshipCount,
        validRows: candidateRelationshipCount,
        createdRecords: candidateRelationshipCount,
        validationReport: {
          category: "SCREEN",
          candidateParts: SCREEN_CANDIDATES.length,
          devices: SCREEN_CANDIDATE_DEVICES.length,
          publicationStatus: "UNVERIFIED",
          autoPublished: false,
        },
        createdById: ACTOR,
        completedAt: new Date(),
      },
    });
  }

  console.log(
    `Candidate batch ready: ${SCREEN_CANDIDATES.length} screen SKUs, ${candidateRelationshipCount} unpublished relationships.`,
  );
}

seedScreenPilot()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
