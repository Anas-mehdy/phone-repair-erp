import assert from "node:assert/strict";
import { normalizeDeviceDetails, normalizeDeviceBarcode, assertDeviceQuantity, EMPTY_DEVICE_DETAILS } from "../lib/inventory-device";
import { makeDeviceLabel } from "../lib/device-label";
import { inventoryDeviceSummary } from "../lib/device-summary";

const raw = { isDevice: true, deviceModel: "  iPhone 17 Pro Max  ", deviceCondition: "USED", batteryHealth: 70, storageCapacity: "256 gb", deviceIdentifier: " 123456789012345 " };
const device = normalizeDeviceDetails(raw);
assert.equal(device.deviceModel, "iPhone 17 Pro Max");
assert.equal(device.storageCapacity, "256 GB");
assert.deepEqual(normalizeDeviceDetails({ ...raw, isDevice: false }), EMPTY_DEVICE_DETAILS);
for (const invalid of [{ batteryHealth: 101 }, { batteryHealth: -1 }, { batteryHealth: 70.5 }, { storageCapacity: "0 GB" }, { storageCapacity: "256" }, { deviceCondition: null }, { deviceModel: "" }, { deviceIdentifier: "123" }]) {
  assert.throws(() => normalizeDeviceDetails({ ...raw, ...invalid }));
}
assert.doesNotThrow(() => assertDeviceQuantity(true, 0));
assert.doesNotThrow(() => assertDeviceQuantity(true, 1));
assert.throws(() => assertDeviceQuantity(true, 2), /كمية واحدة/);
assert.doesNotThrow(() => assertDeviceQuantity(false, 200));
assert.equal(normalizeDeviceBarcode(" 201234567890 "), "201234567890");
assert.throws(() => normalizeDeviceBarcode("هاتف"), /بالإنكليزية/);
assert.throws(() => normalizeDeviceBarcode("x".repeat(25)), /24/);
const label = makeDeviceLabel({ ...device, barcode: "201234567890", unitPrice: { toString: () => "9300" } }, "متجر مسار", "SAR");
assert.equal(label.condition, "Used");
assert.equal(makeDeviceLabel({ ...device, barcode: "201234567890", unitPrice: { toString: () => "0" }, salePriceConfigured: false }, "Shop", "SAR").priceConfigured, false);
assert.equal(label.price, "9300");
assert.ok(label.minimumBarcodeWidthMm < 46);
assert.equal(label.batteryHealth, 70);
assert.ok(!JSON.stringify(label).includes("123456789012345"));
assert.ok(Buffer.from(label.barcodeDataUrl.split(",")[1], "base64").toString().includes("<svg"));
assert.ok(inventoryDeviceSummary(device)?.includes("Battery 70%"));
assert.equal(inventoryDeviceSummary(EMPTY_DEVICE_DETAILS), null);
assert.throws(() => makeDeviceLabel({ ...device, barcode: null, unitPrice: { toString: () => "9300" } }, "Shop", "SAR"), /باركوده/);
assert.equal(makeDeviceLabel({ ...device, batteryHealth: null, barcode: "SN-ABC123", unitPrice: { toString: () => "9300" } }, "Shop", "SAR").batteryHealth, null);
console.log("PASS device metadata and label: normalization, validation, individual quantities, scanner-compatible barcode, actual SVG, private identifier exclusion, and POS summary.");
