import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { auditRemainingCompatibilitySections } from "../lib/services/compatibility/multi-section-candidate-import";

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) throw new Error("Pass the source JSON path as the first argument");
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  const audits = auditRemainingCompatibilitySections(source);

  assert.equal(audits.length, 7);
  for (const audit of audits) {
    assert.ok(audit.groups.length > 0, `${audit.datasetKey} has no groups`);
    assert.ok(audit.stats.members >= audit.stats.groups * 2, `${audit.datasetKey} contains invalid singletons`);
    assert.ok(audit.stats.readyForCorroboration > 0, `${audit.datasetKey} has no visible groups`);
    assert.equal(
      audit.stats.groups,
      audit.stats.readyForCorroboration + audit.stats.needsReview + audit.stats.quarantined
    );
    assert.ok(audit.groups.filter((group) => group.status === "QUARANTINED")
      .every((group) => group.issues.length > 0));
  }

  console.log(JSON.stringify(audits.map(({ datasetKey, categoryName, stats }) => ({
    datasetKey,
    categoryName,
    ...stats,
  })), null, 2));
  console.log("All multi-section candidate import checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
