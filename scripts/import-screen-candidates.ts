import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { auditScreenCandidates } from "../lib/services/compatibility/candidate-import";

function argumentValue(name: string): string | null {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const sourcePath = argumentValue("--file");
  const shouldCommit = process.argv.includes("--commit");
  if (!sourcePath) {
    throw new Error("Usage: npm run compatibility:import:screen -- --file=/absolute/source.json [--commit]");
  }

  const absolutePath = path.resolve(sourcePath);
  const raw = await readFile(absolutePath, "utf8");
  const sourceFileHash = createHash("sha256").update(raw).digest("hex");
  const source = JSON.parse(raw) as { summary?: Record<string, unknown> };
  const audit = auditScreenCandidates(source);

  console.log(JSON.stringify({ mode: shouldCommit ? "commit" : "dry-run", sourceFileHash, ...audit.stats }, null, 2));
  if (!shouldCommit) {
    console.log("Dry run only: no database records were created.");
    return;
  }

  const existing = await prisma.compatibilityImportBatch.findUnique({ where: { sourceFileHash } });
  if (existing) {
    console.log(`This exact file was already imported as batch ${existing.id}. No duplicates created.`);
    return;
  }

  const batch = await prisma.$transaction(async (tx) => {
    const createdBatch = await tx.compatibilityImportBatch.create({
      data: {
        filename: path.basename(absolutePath),
        sourceFileHash,
        categoryName: audit.categoryName,
        status: "READY_FOR_REVIEW",
        totalRows: audit.stats.members,
        validRows: audit.stats.readyForCorroboration,
        invalidRows: audit.stats.quarantined,
        createdRecords: 0,
        createdById: "system:screen-candidate-importer",
        completedAt: new Date(),
        validationReport: {
          sourceUrl: typeof source.summary?.source_endpoint === "string" ? source.summary.source_endpoint : null,
          sourceSummary: source.summary || null,
          auditStats: audit.stats,
        } as Prisma.InputJsonValue,
      },
    });

    for (const group of audit.groups) {
      await tx.compatibilityCandidateGroup.create({
        data: {
          batchId: createdBatch.id,
          sourceGroupId: group.sourceGroupId,
          brandSection: group.brandSection,
          rawSourceText: group.rawSourceText,
          contributor: group.contributor,
          mappedCategory: "SCREEN",
          confidenceScore: group.confidenceScore,
          status: group.status,
          issues: group.issues,
          members: {
            create: group.members.map((member) => ({
              rawModelName: member.rawModelName,
              normalizedModelName: member.normalizedModelName,
              position: member.position,
            })),
          },
        },
      });
    }
    return createdBatch;
  }, { timeout: 60_000 });

  console.log(`Imported isolated candidate batch ${batch.id}. No operational compatibility was published.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
