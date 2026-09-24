/** Shared, time-aware policy. setupCompletedAt is written only after mandatory setup checks pass. */
export type PlanPharmacy = {
  status: string; lifecycleStatus: string; verifiedAt: Date | null; setupCompletedAt: Date | null;
};
export type PlanSubscription = {
  id: string; status: string; currentPeriodStart: Date; currentPeriodEnd: Date;
  trialEndsAt: Date | null; cancelAt: Date | null;
};
export function resolvePharmacyPlanState(pharmacy: PlanPharmacy | null, subscriptions: PlanSubscription[], now = new Date()) {
  const verified = Boolean(pharmacy?.verifiedAt) && ["approved", "active"].includes(pharmacy?.status ?? "");
  const setupCompleted = Boolean(pharmacy?.setupCompletedAt);
  const paused = !pharmacy || ["suspended", "regulatory_hold", "archived", "pending_deletion", "deleted"].includes(pharmacy.lifecycleStatus) || pharmacy.status === "suspended";
  const pharmacyReady = verified && setupCompleted && !paused;
  const usable = subscriptions.find(s => ["active", "trialing"].includes(s.status)
    && s.currentPeriodStart <= now && s.currentPeriodEnd > now
    && (!s.cancelAt || s.cancelAt > now)
    && (s.status !== "trialing" || !s.trialEndsAt || s.trialEndsAt > now));
  const subscription = usable ?? subscriptions[0] ?? null;
  const paymentAttention = !usable && !!subscription && ["past_due", "unpaid"].includes(subscription.status);
  const premiumEntitlementsActive = Boolean(usable) && pharmacyReady;
  const billingStatus = usable ? (!pharmacyReady ? "premium_pending_activation" : usable.cancelAt ? "premium_ending" : "premium_active")
    : paymentAttention ? "past_due" : subscription?.status === "cancelled" ? "cancelled" : subscription ? "premium_expired" : "free";
  return {
    tier: premiumEntitlementsActive ? "premium" as const : "free" as const,
    premiumEntitlementsActive, billingStatus, pharmacyReady, verified, setupCompleted,
    readiness: paused ? "paused" : !verified ? "verification_incomplete" : !setupCompleted ? "setup_incomplete" : "ready",
    periodEnd: subscription?.currentPeriodEnd ?? null, paymentAttention, subscription,
    canUpgrade: pharmacyReady && !usable, canReactivate: pharmacyReady && !usable && !!subscription,
    blockedReason: paused ? "Pharmacy operations are paused. Contact support." : !verified ? "Complete pharmacy verification first." : !setupCompleted ? "Finish pharmacy setup to activate Premium features." : null,
  };
}
