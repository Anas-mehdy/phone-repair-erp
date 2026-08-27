import { PartCategory, Prisma, CompatibilityStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  SCREEN_PILOT_BATCH,
  SCREEN_PILOT_DEVICES,
  SCREEN_PILOT_FAMILY,
  SCREEN_PILOT_LICENSE_NOTE,
  SCREEN_PILOT_SOURCES,
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

  console.log(`Screen pilot ready: ${devices.length} devices, ${SCREEN_PILOT_SOURCES.length} sources each, status UNVERIFIED.`);
}

seedScreenPilot()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
