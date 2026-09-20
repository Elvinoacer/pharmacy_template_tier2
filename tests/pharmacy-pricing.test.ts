import assert from "node:assert/strict";
import { test } from "node:test";
import { clampFeeSubsidy, nextBillingMonth, VERIFICATION_FEE_KES, MONTHLY_FEE_KES } from "../app/lib/platform/pricing";
test("pricing separates one-time verification from monthly service", () => {
  assert.equal(VERIFICATION_FEE_KES, 100);
  assert.equal(MONTHLY_FEE_KES, 500);
});
test("fee subsidies support exact partial and full balances", () => {
  assert.deepEqual(clampFeeSubsidy({ verificationKes: 40, monthlyKes: 200 }), {
    verificationKes: 40,
    monthlyKes: 200,
    verificationBalanceKes: 60,
    monthlyBalanceKes: 300,
    bundleBalanceKes: 360,
  });
  assert.deepEqual(clampFeeSubsidy({ verificationKes: 500, monthlyKes: 900 }), {
    verificationKes: 100,
    monthlyKes: 500,
    verificationBalanceKes: 0,
    monthlyBalanceKes: 0,
    bundleBalanceKes: 0,
  });
});
test("monthly renewals clamp month ends and handle leap years and year rollover", () => {
  for (const [start, end] of [
    ["2026-01-31T09:15:00Z", "2026-02-28T09:15:00.000Z"],
    ["2028-01-31T09:15:00Z", "2028-02-29T09:15:00.000Z"],
    ["2026-12-15T09:15:00Z", "2027-01-15T09:15:00.000Z"],
  ]) { const date = new Date(start); assert.equal(nextBillingMonth(date).toISOString(), end); assert.equal(date.toISOString(), new Date(start).toISOString()); }
});
