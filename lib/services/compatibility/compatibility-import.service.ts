import {
  CompatibilityImportStatus,
  CompatibilityStatus,
  CompatibilityType,
  VerificationLevel,
  VerificationSourceType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IMPORT_ROWS = 500;

export interface CompatibilityImportRow {
  deviceId: string;
  partId: string;
  compatibilityType: CompatibilityType;
  verificationLevel?: VerificationLevel;
  technicalNotes?: string | null;
  sourceReference: string;
  evidenceDetails: string;
}

export interface CompatibilityImportInput {
  filename: string;
  source: {
    name: string;
    publisher?: string | null;
    sourceType: VerificationSourceType;
    url?: string | null;
    trustLevel?: number;
    licenseNotes?: string | null;
  };
  rows: CompatibilityImportRow[];
}

interface ImportIssue {
  row: number;
  error: string;
}

function validateRow(row: CompatibilityImportRow, rowNumber: number): ImportIssue[] {
  const issues: ImportIssue[] = [];
  if (!UUID_PATTERN.test(row.deviceId || "")) issues.push({ row: rowNumber, error: "Invalid deviceId." });
  if (!UUID_PATTERN.test(row.partId || "")) issues.push({ row: rowNumber, error: "Invalid partId." });
  if (!Object.values(CompatibilityType).includes(row.compatibilityType)) {
    issues.push({ row: rowNumber, error: "Invalid compatibilityType." });
  }
  if (row.verificationLevel && !Object.values(VerificationLevel).includes(row.verificationLevel)) {
    issues.push({ row: rowNumber, error: "Invalid verificationLevel." });
  }
  if (!row.sourceReference?.trim()) issues.push({ row: rowNumber, error: "sourceReference is required." });
  if (!row.evidenceDetails?.trim()) issues.push({ row: rowNumber, error: "evidenceDetails is required." });
  return issues;
}

export class CompatibilityImportService {
  /**
   * Imports evidence-backed proposals. The invariant is intentional: every
   * imported relationship starts UNVERIFIED and therefore cannot be returned
   * by operational search or inventory matching.
   */
  async importDrafts(input: CompatibilityImportInput, createdById: string) {
    const filename = input.filename?.trim();
    const sourceName = input.source?.name?.trim();
    const rows = Array.isArray(input.rows) ? input.rows : [];

    if (!filename || !sourceName) throw new Error("Filename and source name are required.");
    if (!Object.values(VerificationSourceType).includes(input.source.sourceType)) {
      throw new Error("A valid source type is required.");
    }
    if (rows.length === 0 || rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`Import must contain between 1 and ${MAX_IMPORT_ROWS} rows.`);
    }

    const trustLevel = Math.min(Math.max(Number(input.source.trustLevel) || 1, 1), 5);
    const issues = rows.flatMap((row, index) => validateRow(row, index + 1));
    const invalidRows = new Set(issues.map((issue) => issue.row));

    return prisma.$transaction(async (tx) => {
      const source = await tx.compatibilitySource.create({
        data: {
          name: sourceName,
          publisher: input.source.publisher?.trim() || null,
          sourceType: input.source.sourceType,
          url: input.source.url?.trim() || null,
          trustLevel,
          licenseNotes: input.source.licenseNotes?.trim() || null,
        },
      });

      const batch = await tx.compatibilityImportBatch.create({
        data: {
          filename,
          sourceId: source.id,
          status: CompatibilityImportStatus.VALIDATING,
          totalRows: rows.length,
          createdById,
        },
      });

      const validCandidates = rows.filter((_, index) => !invalidRows.has(index + 1));
      const deviceIds = [...new Set(validCandidates.map((row) => row.deviceId))];
      const partIds = [...new Set(validCandidates.map((row) => row.partId))];
      const [devices, parts, existing] = await Promise.all([
        tx.device.findMany({ where: { id: { in: deviceIds }, isArchived: false }, select: { id: true } }),
        tx.part.findMany({ where: { id: { in: partIds }, isArchived: false }, select: { id: true } }),
        tx.deviceCompatibility.findMany({
          where: { OR: validCandidates.map((row) => ({ deviceId: row.deviceId, partId: row.partId })) },
          select: { deviceId: true, partId: true },
        }),
      ]);

      const knownDevices = new Set(devices.map((device) => device.id));
      const knownParts = new Set(parts.map((part) => part.id));
      const occupiedPairs = new Set(existing.map((item) => `${item.deviceId}:${item.partId}`));
      const seenPairs = new Set<string>();
      let createdRecords = 0;

      for (let index = 0; index < rows.length; index += 1) {
        const rowNumber = index + 1;
        const row = rows[index];
        if (invalidRows.has(rowNumber)) continue;

        const pairKey = `${row.deviceId}:${row.partId}`;
        if (!knownDevices.has(row.deviceId)) {
          issues.push({ row: rowNumber, error: "Device does not exist or is archived." });
          invalidRows.add(rowNumber);
          continue;
        }
        if (!knownParts.has(row.partId)) {
          issues.push({ row: rowNumber, error: "Part does not exist or is archived." });
          invalidRows.add(rowNumber);
          continue;
        }
        if (occupiedPairs.has(pairKey) || seenPairs.has(pairKey)) {
          issues.push({ row: rowNumber, error: "Compatibility pair already exists or is duplicated in this batch." });
          invalidRows.add(rowNumber);
          continue;
        }

        const compatibility = await tx.deviceCompatibility.create({
          data: {
            deviceId: row.deviceId,
            partId: row.partId,
            compatibilityType: row.compatibilityType,
            compatibilityStatus: CompatibilityStatus.UNVERIFIED,
            verificationLevel: row.verificationLevel ?? VerificationLevel.TECHNICIAN_REPORTED,
            technicalNotes: row.technicalNotes?.trim() || null,
            createdById,
          },
        });
        await tx.compatibilityEvidence.create({
          data: {
            compatibilityId: compatibility.id,
            sourceId: source.id,
            sourceType: input.source.sourceType,
            sourceReference: row.sourceReference.trim(),
            evidenceDetails: row.evidenceDetails.trim(),
            verifiedBy: createdById,
          },
        });
        await tx.compatibilityAuditEvent.create({
          data: {
            compatibilityId: compatibility.id,
            actorId: createdById,
            action: "IMPORTED_AS_UNVERIFIED",
            toStatus: CompatibilityStatus.UNVERIFIED,
            metadata: { batchId: batch.id, row: rowNumber, sourceId: source.id },
          },
        });
        seenPairs.add(pairKey);
        createdRecords += 1;
      }

      const finalStatus = createdRecords > 0
        ? CompatibilityImportStatus.IMPORTED
        : CompatibilityImportStatus.FAILED;
      const updatedBatch = await tx.compatibilityImportBatch.update({
        where: { id: batch.id },
        data: {
          status: finalStatus,
          validRows: createdRecords,
          invalidRows: invalidRows.size,
          createdRecords,
          validationReport: { issues } as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      return { batch: updatedBatch, source, issues };
    });
  }
}

export const compatibilityImportService = new CompatibilityImportService();
