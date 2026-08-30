import assert from "node:assert/strict";
import { calculatePartnerWholesalePrice } from "../lib/partners/partner-pricing";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("10% discount from 50 yields 45", () => {
  const result = calculatePartnerWholesalePrice({
    baseAmount: 50,
    discountPercent: 10,
    currencyCode: "USD",
  });
  assert.equal(result.discountAmount, 5);
  assert.equal(result.payableAmount, 45);
});

test("fractional discount is rounded to two decimals", () => {
  const result = calculatePartnerWholesalePrice({
    baseAmount: 99.99,
    discountPercent: 12.5,
    currencyCode: "USD",
  });
  assert.equal(result.discountAmount, 12.5);
  assert.equal(result.payableAmount, 87.49);
});

test("zero discount keeps official price", () => {
  const result = calculatePartnerWholesalePrice({
    baseAmount: 80,
    discountPercent: 0,
    currencyCode: "usd",
  });
  assert.equal(result.payableAmount, 80);
  assert.equal(result.currencyCode, "USD");
});

test("100% discount cannot produce a negative amount", () => {
  const result = calculatePartnerWholesalePrice({
    baseAmount: 80,
    discountPercent: 100,
    currencyCode: "USD",
  });
  assert.equal(result.payableAmount, 0);
});

test("rejects discount over 100", () => {
  assert.throws(
    () =>
      calculatePartnerWholesalePrice({
        baseAmount: 50,
        discountPercent: 100.01,
        currencyCode: "USD",
      }),
    /بين 0 و100/,
  );
});

test("rejects negative base price", () => {
  assert.throws(
    () =>
      calculatePartnerWholesalePrice({
        baseAmount: -1,
        discountPercent: 10,
        currencyCode: "USD",
      }),
    /السعر الأساسي/,
  );
});

test("rejects invalid currency", () => {
  assert.throws(
    () =>
      calculatePartnerWholesalePrice({
        baseAmount: 50,
        discountPercent: 10,
        currencyCode: "US",
      }),
    /رمز العملة/,
  );
});

console.log("Partner wholesale pricing tests passed.");
