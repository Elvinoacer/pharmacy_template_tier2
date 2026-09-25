import "server-only";
import { getPharmacyPlanState } from "./plan-state";
import { PREMIUM_FEATURES } from "./plan-policy";

import { prismaUnscoped } from "@/app/lib/db";

export const DEFAULT_PLAN_FEATURES: Record<string, Record<string, { enabled: boolean; limitInt: number | null }>> = {
  starter: {
    ai_import: { enabled: true, limitInt: null },
    staff: { enabled: true, limitInt: 2 },
    branches: { enabled: true, limitInt: 1 },
    messages: { enabled: true, limitInt: 500 },
    ai: { enabled: true, limitInt: 50 },
    analytics: { enabled: true, limitInt: null },
    api: { enabled: false, limitInt: null },
    sso: { enabled: false, limitInt: null },
    pos_sync: { enabled: true, limitInt: null },
    loyalty: { enabled: true, limitInt: null },
    campaign_scheduling: { enabled: true, limitInt: null },
    multi_channel_campaigns: { enabled: true, limitInt: null },
    custom_segments: { enabled: true, limitInt: null },
    automated_followups: { enabled: true, limitInt: null },
    loyalty_automation: { enabled: true, limitInt: null },
    inventory_intelligence: { enabled: true, limitInt: null },
    advanced_storefront: { enabled: true, limitInt: null },
    custom_message_templates: { enabled: true, limitInt: null },
    online_orders: { enabled: true, limitInt: null },
  },
  professional: {
    ai_import: { enabled: true, limitInt: null },
    staff: { enabled: true, limitInt: 10 },
    branches: { enabled: true, limitInt: 3 },
    messages: { enabled: true, limitInt: 5000 },
    ai: { enabled: true, limitInt: 2000 },
    analytics: { enabled: true, limitInt: null },
    api: { enabled: true, limitInt: null },
    sso: { enabled: false, limitInt: null },
    pos_sync: { enabled: true, limitInt: null },
    loyalty: { enabled: true, limitInt: null },
    campaign_scheduling: { enabled: true, limitInt: null },
    multi_channel_campaigns: { enabled: true, limitInt: null },
    custom_segments: { enabled: true, limitInt: null },
    automated_followups: { enabled: true, limitInt: null },
    loyalty_automation: { enabled: true, limitInt: null },
    inventory_intelligence: { enabled: true, limitInt: null },
    advanced_storefront: { enabled: true, limitInt: null },
    custom_message_templates: { enabled: true, limitInt: null },
    online_orders: { enabled: true, limitInt: null },
  },
  enterprise: {
    ai_import: { enabled: true, limitInt: null },
    staff: { enabled: true, limitInt: null },
    branches: { enabled: true, limitInt: null },
    messages: { enabled: true, limitInt: null },
    ai: { enabled: true, limitInt: null },
    analytics: { enabled: true, limitInt: null },
    api: { enabled: true, limitInt: null },
    sso: { enabled: true, limitInt: null },
    pos_sync: { enabled: true, limitInt: null },
    loyalty: { enabled: true, limitInt: null },
    campaign_scheduling: { enabled: true, limitInt: null },
    multi_channel_campaigns: { enabled: true, limitInt: null },
    custom_segments: { enabled: true, limitInt: null },
    automated_followups: { enabled: true, limitInt: null },
    loyalty_automation: { enabled: true, limitInt: null },
    inventory_intelligence: { enabled: true, limitInt: null },
    advanced_storefront: { enabled: true, limitInt: null },
    custom_message_templates: { enabled: true, limitInt: null },
    online_orders: { enabled: true, limitInt: null },
    custom_integrations: { enabled: true, limitInt: null },
  },
};

export async function hasPremiumPlan(pharmacyId: string): Promise<boolean> {
  return (await getPharmacyPlanState(pharmacyId)).premiumEntitlementsActive;
}

export async function isFeatureEnabled(pharmacyId: string, key: string): Promise<boolean> {
  if (PREMIUM_FEATURES.has(key)) return hasPremiumPlan(pharmacyId);
  const override = await prismaUnscoped.tenantEntitlement.findUnique({
    where: { pharmacyId_key: { pharmacyId, key } },
  }).catch(() => null);
  if (override && override.source !== "plan") return override.enabled;

  const flag = await prismaUnscoped.featureFlag.findUnique({ where: { key } }).catch(() => null);
  if (flag) {
    const fo = await prismaUnscoped.featureOverride.findUnique({
      where: { pharmacyId_flagId: { pharmacyId, flagId: flag.id } },
    }).catch(() => null);
    if (fo) return fo.enabled;
    return flag.defaultOn;
  }

  const sub = await prismaUnscoped.subscription.findFirst({
    where: { pharmacyId, status: "active", currentPeriodEnd: { gt: new Date() } },
    include: { plan: { include: { features: true } } },
    orderBy: { createdAt: "desc" },
  });
  const feature = sub?.plan.features.find((f) => f.key === key);
  if (feature) return feature.enabled;
  return true;
}

export async function entitlementLimit(pharmacyId: string, key: string): Promise<number | null> {
  const override = await prismaUnscoped.tenantEntitlement.findUnique({
    where: { pharmacyId_key: { pharmacyId, key } },
  }).catch(() => null);
  if (override && override.source !== "plan") return override.limitInt;

  const sub = await prismaUnscoped.subscription.findFirst({
    where: { pharmacyId, status: "active", currentPeriodEnd: { gt: new Date() } },
    include: { plan: { include: { features: true } } },
    orderBy: { createdAt: "desc" },
  });
  const planLimit = sub?.plan.features.find((f) => f.key === key)?.limitInt;
  // A missing or expired subscription must not turn metered messaging into
  // unlimited billable delivery. Use the configured starter ceiling until a
  // distinct Free allowance is defined.
  return planLimit ?? (key === "messages" ? DEFAULT_PLAN_FEATURES.starter.messages.limitInt : null);
}

export async function assertWithinLimit(pharmacyId: string, key: string, current: number): Promise<void> {
  const limit = await entitlementLimit(pharmacyId, key);
  if (limit != null && current >= limit) {
    const err = new Error(`ENTITLEMENT_EXCEEDED:${key}`);
    (err as Error & { status?: number }).status = 402;
    throw err;
  }
}
