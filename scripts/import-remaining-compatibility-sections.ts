import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { auditRemainingCompatibilitySections } from "../lib/services/compatibility/multi-section-candidate-import";

function argumentValue(name: string): string | null {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const sourcePath = argumentValue("--file");
  const shouldCommit = process.argv.includes("--commit");
  if (!sourcePath) {
    throw new Error("Usage: npm run compatibility:import:remaining -- --file=/absolute/source.json [--commit]");
  }

  const absolutePath = path.resolve(sourcePath);
  const raw = await readFile(absolutePath, "utf8");
  const source = JSON.parse(raw) as { summary?: Record<string, unknown> };
  const audits = auditRemainingCompatibilitySections(source);

  console.log(JSON.stringify({
    mode: shouldCommit ? "commit" : "dry-run",
    datasets: audits.map(({ datasetKey, categoryName, stats }) => ({ datasetKey, categoryName, ...stats })),
  }, null, 2));
  if (!shouldCommit) return;

  for (const audit of audits) {
    const sourceFileHash = createHash("sha256")
      .update(`${audit.categoryName}\n${raw}`)
      .digest("hex");
    const existing = await prisma.compatibilityImportBatch.findUnique({ where: { sourceFileHash } });
    if (existing) {
      console.log(`${audit.datasetKey}: already imported as ${existing.id}`);
      continue;
    }

    const batchId = randomUUID();
    const groups = audit.groups.map((group) => ({ id: randomUUID(), ...group }));
    await prisma.$transaction(async (tx) => {
      await tx.compatibilityImportBatch.create({
        data: {
          id: batchId,
          filename: path.basename(absolutePath),
          sourceFileHash,
          categoryName: audit.categoryName,
          status: "READY_FOR_REVIEW",
          totalRows: audit.stats.members,
          validRows: audit.stats.readyForCorroboration,
          invalidRows: audit.stats.quarantined,
          createdRecords: 0,
          createdById: "system:multi-section-candidate-importer",
          completedAt: new Date(),
          validationReport: {
            datasetKey: audit.datasetKey,
            sourceUrl: typeof source.summary?.source_endpoint === "string" ? source.summary.source_endpoint : null,
            auditStats: audit.stats,
          } as Prisma.InputJsonValue,
        },
      });
      await tx.compatibilityCandidateGroup.createMany({
        data: groups.map((group) => ({
          id: group.id,
          batchId,
          sourceGroupId: group.sourceGroupId,
          brandSection: group.brandSection,
          rawSourceText: group.rawSourceText,
          contributor: group.contributor,
          mappedCategory: audit.mappedCategory,
          confidenceScore: group.confidenceScore,
          status: group.status,
          issues: group.issues,
        })),
      });
      await tx.compatibilityCandidateMember.createMany({
        data: groups.flatMap((group) => group.members.map((member) => ({
          candidateGroupId: group.id,
          rawModelName: member.rawModelName,
          normalizedModelName: member.normalizedModelName,
          position: member.position,
        }))),
      });
    }, { timeout: 120_000 });
    console.log(`${audit.datasetKey}: imported batch ${batchId}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
