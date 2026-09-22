import assert from "node:assert/strict";
import { test } from "node:test";
import { clampFeeSubsidy, nextBillingMonth, VERIFICATION_FEE_KES, MONTHLY_FEE_KES } from "../app/lib/platform/pricing";
import { getServicePaymentPolicy } from "../app/lib/service-payment-policy";
import {
  FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT,
  FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT,
  growthLimitMessage,
  listingLimitMessage,
  PREMIUM_FEATURES,
} from "../app/lib/platform/plan-policy";
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
test("priced services fall back to a visit reservation when M-Pesa is not connected", () => {
  assert.equal(getServicePaymentPolicy({ price: 200 }, false), "PAY_AT_VISIT");
  assert.equal(getServicePaymentPolicy({ price: 200, eligibility: "[payable:before]" }, false), "UNAVAILABLE");
  assert.equal(getServicePaymentPolicy({ price: 200, eligibility: "[payable:after]" }, true), "PAY_AT_VISIT");
  assert.equal(getServicePaymentPolicy({ price: 200 }, true), "ONLINE_REQUIRED");
  assert.equal(getServicePaymentPolicy({ price: 0 }, true), "FREE");
});
test("free-plan limit errors explain the KES 500 upgrade", () => {
  assert.match(listingLimitMessage(new Error("FREE_MEDICINE_LIMIT")) || "", /5 public medicine listings/);
  assert.match(listingLimitMessage(new Error("FREE_SERVICE_LIMIT")) || "", /2 active services/);
  assert.equal(listingLimitMessage(new Error("other")), null);
});
test("free growth allowances are explicit", () => {
  assert.equal(FREE_MONTHLY_PRESCRIPTION_REFERRAL_LIMIT, 10);
  assert.equal(FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT, 1);
  assert.match(
    growthLimitMessage(new Error("FREE_MONTHLY_CAMPAIGN_LAUNCH_LIMIT")) || "",
    /1 campaign launch per month/,
  );
});

test("premium medication tooling is explicit and free acquisition paths stay free", () => {
  assert.equal(PREMIUM_FEATURES.has("ai_import"), true);
  assert.equal(PREMIUM_FEATURES.has("pos_sync"), true);
  assert.equal(PREMIUM_FEATURES.has("analytics"), true);
  assert.equal(PREMIUM_FEATURES.has("campaign_scheduling"), true);
  assert.equal(PREMIUM_FEATURES.has("multi_channel_campaigns"), true);
  assert.equal(PREMIUM_FEATURES.has("custom_segments"), true);
  assert.equal(PREMIUM_FEATURES.has("automated_followups"), true);
  assert.equal(PREMIUM_FEATURES.has("loyalty_automation"), true);
  assert.equal(PREMIUM_FEATURES.has("inventory_intelligence"), true);
  assert.equal(PREMIUM_FEATURES.has("custom_message_templates"), true);
  assert.equal(PREMIUM_FEATURES.has("csv_import"), false);
  assert.equal(PREMIUM_FEATURES.has("shared_library"), false);
  assert.equal(PREMIUM_FEATURES.has("manual"), false);
  assert.equal(PREMIUM_FEATURES.has("clinical_safety"), false);
  assert.equal(PREMIUM_FEATURES.has("dispensing"), false);
  assert.equal(PREMIUM_FEATURES.has("manual_reminders"), false);
});

test("growth paywalls return useful messages without paywalling core care", () => {
  assert.match(
    growthLimitMessage(new Error("PREMIUM_REQUIRED:custom_segments")) || "",
    /Custom patient segments/,
  );
  assert.match(
    growthLimitMessage(new Error("PREMIUM_REQUIRED:inventory_intelligence")) || "",
    /Stock levels, low-stock alerts, stock-outs, batches and expiry tracking remain available on Free/,
  );
  assert.equal(growthLimitMessage(new Error("clinical_safety")), null);
});
test("monthly renewals clamp month ends and handle leap years and year rollover", () => {
  for (const [start, end] of [
    ["2026-01-31T09:15:00Z", "2026-02-28T09:15:00.000Z"],
    ["2028-01-31T09:15:00Z", "2028-02-29T09:15:00.000Z"],
    ["2026-12-15T09:15:00Z", "2027-01-15T09:15:00.000Z"],
  ]) { const date = new Date(start); assert.equal(nextBillingMonth(date).toISOString(), end); assert.equal(date.toISOString(), new Date(start).toISOString()); }
});
