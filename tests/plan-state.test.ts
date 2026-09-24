import assert from "node:assert/strict";
import { test } from "node:test";
import { resolvePharmacyPlanState, type PlanSubscription } from "../app/lib/platform/plan-state-model";
const now = new Date("2026-09-24T12:00:00Z");
const pharmacy = { status: "active", lifecycleStatus: "active", verifiedAt: now, setupCompletedAt: now };
const paid: PlanSubscription = { id: "paid", status: "active", currentPeriodStart: new Date("2026-09-01Z"), currentPeriodEnd: new Date("2026-10-01Z"), trialEndsAt: null, cancelAt: null };
test("Free → paid Premium → expired Free → reactivated Premium", () => {
 assert.equal(resolvePharmacyPlanState(pharmacy, [], now).tier, "free");
 assert.equal(resolvePharmacyPlanState(pharmacy, [paid], now).tier, "premium");
 assert.equal(resolvePharmacyPlanState(pharmacy, [paid], paid.currentPeriodEnd).billingStatus, "premium_expired");
 assert.equal(resolvePharmacyPlanState(pharmacy, [{ ...paid, currentPeriodEnd: new Date("2026-11-01Z") }], paid.currentPeriodEnd).tier, "premium");
});
test("paid, waived and trial subscriptions cannot bypass readiness", () => {
 for (const status of ["active", "trialing"]) {
   const state = resolvePharmacyPlanState({ ...pharmacy, setupCompletedAt: null }, [{ ...paid, status }], now);
   assert.equal(state.premiumEntitlementsActive, false);
   assert.equal(state.billingStatus, "premium_pending_activation");
   assert.equal(state.canUpgrade, false);
 }
 for (const patch of [{ verifiedAt: null }, { status: "suspended" }, { lifecycleStatus: "regulatory_hold" }]) assert.equal(resolvePharmacyPlanState({ ...pharmacy, ...patch }, [paid], now).tier, "free");
});
test("cancellation respects the paid period and exact cancellation instant", () => {
 const ending = { ...paid, cancelAt: paid.currentPeriodEnd };
 assert.equal(resolvePharmacyPlanState(pharmacy, [ending], now).billingStatus, "premium_ending");
 assert.equal(resolvePharmacyPlanState(pharmacy, [ending], ending.cancelAt).premiumEntitlementsActive, false);
 assert.equal(resolvePharmacyPlanState(pharmacy, [{ ...paid, status: "cancelled" }], now).billingStatus, "cancelled");
});
test("past due, expired trials and future periods do not grant Premium", () => {
 assert.equal(resolvePharmacyPlanState(pharmacy, [{ ...paid, status: "past_due" }], now).paymentAttention, true);
 assert.equal(resolvePharmacyPlanState(pharmacy, [{ ...paid, status: "trialing", trialEndsAt: now }], now).tier, "free");
 assert.equal(resolvePharmacyPlanState(pharmacy, [{ ...paid, currentPeriodStart: new Date("2026-09-25Z") }], now).tier, "free");
});
test("a newer cancelled history row cannot hide a valid paid period", () => {
 assert.equal(resolvePharmacyPlanState(pharmacy, [{ ...paid, id: "cancelled", status: "cancelled" }, paid], now).subscription?.id, "paid");
});
