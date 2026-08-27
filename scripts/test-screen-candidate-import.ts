import assert from "node:assert/strict";
import { auditScreenCandidates, SCREEN_SOURCE_CATEGORY } from "../lib/services/compatibility/candidate-import";

const fixture = {
  categories: [{
    category_name: SCREEN_SOURCE_CATEGORY,
    brands: [{
      brand_name: "TEST",
      entries: [
        {
          group_id: "GOOD-1",
          raw_source_text: "Redmi Note 11 = Poco M4 Pro 4G",
          parsed_models: ["Redmi Note 11", "Poco M4 Pro 4G"],
          is_parsed_compatibility_group: true,
        },
        {
          group_id: "BAD-1",
          raw_source_text: "Realme C21Y Realme C20A = 501",
          parsed_models: ["Realme C21Y Realme C20A", "501"],
          is_parsed_compatibility_group: true,
        },
      ],
    }],
  }],
};

const audit = auditScreenCandidates(fixture);
assert.equal(audit.stats.groups, 2);
assert.equal(audit.stats.members, 4);
assert.equal(audit.stats.readyForCorroboration, 1);
assert.equal(audit.stats.quarantined, 1);
assert.deepEqual(audit.groups[0].issues, []);
assert(audit.groups[1].issues.includes("MERGED_MODEL_NAMES"));
assert(audit.groups[1].issues.includes("INVALID_MODEL_TOKEN"));
assert(audit.groups.every((group) => group.confidenceScore <= 60));

console.log("Screen candidate import safety checks passed.");
