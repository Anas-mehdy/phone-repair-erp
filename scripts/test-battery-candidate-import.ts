import assert from "node:assert/strict";
import {
  auditBatteryCandidates,
  BATTERY_SOURCE_CATEGORY,
  parseBatterySourceText,
} from "../lib/services/compatibility/battery-candidate-import";

assert.deepEqual(parseBatterySourceText("2. BLP605 = Oppo A33 = Oppo A33T = Oppo F1"), {
  batteryCode: "BLP605",
  capacityMah: null,
  devices: ["Oppo A33", "Oppo A33T", "Oppo F1"],
});

assert.deepEqual(parseBatterySourceText("3. BA10 5000 Vivo Y17s / Y36"), {
  batteryCode: "BA10",
  capacityMah: 5000,
  devices: ["Vivo Y17s", "Vivo Y36"],
});

assert.deepEqual(parseBatterySourceText("BLP681/BLP683 = 3700mAh = Oppo F9 = Realme U1"), {
  batteryCode: "BLP681/BLP683",
  capacityMah: 3700,
  devices: ["Oppo F9", "Realme U1"],
});

assert.deepEqual(parseBatterySourceText("HE316 / 317 / 335 / NK6 3000 Nokia 6"), {
  batteryCode: "HE316 / 317 / 335 / NK6",
  capacityMah: 3000,
  devices: ["Nokia 6"],
});

const audit = auditBatteryCandidates({
  categories: [{
    category_name: BATTERY_SOURCE_CATEGORY,
    brands: [{
      brand_name: "VIVO IQOO",
      entries: [
        { entry_index: 1, raw_source_text: "BA10 5000 Vivo Y17s / Y36" },
        { entry_index: 2, raw_source_text: "BA20 5000 Vivo Y36" },
        { entry_index: 3, raw_source_text: "Universal Battery List" },
      ],
    }],
  }],
});

assert.equal(audit.stats.sourceRows, 3);
assert.equal(audit.stats.groups, 2);
assert.equal(audit.stats.needsReview, 2);
assert(audit.groups.every((group) => group.issues.includes("CROSS_CODE_OVERLAP")));
console.log("Battery candidate import safety checks passed.");
