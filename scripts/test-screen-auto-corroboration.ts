import assert from "node:assert/strict";
import { planAutomaticCorroboration } from "../lib/services/compatibility/screen-auto-corroboration.service";

const decisions = planAutomaticCorroboration([
  { partId: "part-a", compatibilityIds: ["a1", "a2"], deviceIds: ["d1", "d2"], sourceIdentities: ["Supplier One"] },
  { partId: "part-b", compatibilityIds: ["b1", "b2"], deviceIds: ["d2", "d1"], sourceIdentities: ["Supplier Two"] },
  { partId: "part-c", compatibilityIds: ["c1", "c2"], deviceIds: ["d3", "d4"], sourceIdentities: ["Supplier One"] },
  { partId: "part-d", compatibilityIds: ["d1", "d2"], deviceIds: ["d3", "d4"], sourceIdentities: ["Supplier One"] },
  { partId: "part-e", compatibilityIds: ["e1"], deviceIds: ["d5"], sourceIdentities: ["Supplier One", "Supplier Two"] },
]);

assert.equal(decisions.length, 1);
assert.equal(decisions[0].independentSourceCount, 2);
assert.deepEqual(decisions[0].partIds.sort(), ["part-a", "part-b"]);
assert.deepEqual(decisions[0].compatibilityIds.sort(), ["a1", "a2", "b1", "b2"]);

console.log("Automatic screen corroboration policy checks passed.");
