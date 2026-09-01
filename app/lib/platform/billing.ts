import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { DEFAULT_PLAN_FEATURES } from "@/app/lib/platform/entitlements";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { enqueueOutbox } from "@/app/lib/platform/outbox";
import { recordLifecycle } from "@/app/lib/platform/lifecycle";

export async function ensureDefaultPlans() {
  const defs = [
    { slug: "starter", name: "Starter", priceKes: 4999, sortOrder: 1 },
    { slug: "professional", name: "Professional", priceKes: 14999, sortOrder: 2 },
    { slug: "enterprise", name: "Enterprise", priceKes: 49999, sortOrder: 3 },
  ] as const;

  for (const d of defs) {
    const plan = await prismaUnscoped.plan.upsert({
      where: { slug: d.slug },
      update: { name: d.name, priceKes: d.priceKes, active: true, sortOrder: d.sortOrder },
      create: { slug: d.slug, name: d.name, priceKes: d.priceKes, interval: "monthly", active: true, sortOrder: d.sortOrder },
    });
    const features = DEFAULT_PLAN_FEATURES[d.slug] ?? {};
    for (const [key, val] of Object.entries(features)) {
      await prismaUnscoped.planFeature.upsert({
        where: { planId_key: { planId: plan.id, key } },
        update: { enabled: val.enabled, limitInt: val.limitInt },
        create: { planId: plan.id, key, enabled: val.enabled, limitInt: val.limitInt },
      });
    }
  }
}

export async function startTrial(pharmacyId: string, planSlug = "starter", days = 14) {
  await ensureDefaultPlans();
  const plan = await prismaUnscoped.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new Error("plan_not_found");
  const now = new Date();
  const trialEnds = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const sub = await prismaUnscoped.subscription.create({
    data: {
      pharmacyId,
      planId: plan.id,
      status: "trialing",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnds,
      trialEndsAt: trialEnds,
    },
  });
  await prismaUnscoped.pharmacy.update({
    where: { id: pharmacyId },
    data: { lifecycleStatus: "trial", trialEndsAt: trialEnds },
  });
  await recordLifecycle(pharmacyId, "activated", { toStatus: "trial" });
  await syncEntitlementsFromPlan(pharmacyId, plan.id);
  return sub;
}

export async function syncEntitlementsFromPlan(pharmacyId: string, planId: string) {
  const features = await prismaUnscoped.planFeature.findMany({ where: { planId } });
  for (const f of features) {
    await prismaUnscoped.tenantEntitlement.upsert({
      where: { pharmacyId_key: { pharmacyId, key: f.key } },
      update: { enabled: f.enabled, limitInt: f.limitInt, source: "plan" },
      create: { pharmacyId, key: f.key, enabled: f.enabled, limitInt: f.limitInt, source: "plan" },
    });
  }
}

function invoiceNumber() {
  const y = new Date().getFullYear();
  const n = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `INV-${y}-${n}`;
}

export async function issueSubscriptionInvoice(subscriptionId: string) {
  const sub = await prismaUnscoped.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) throw new Error("subscription_not_found");
  const invoice = await prismaUnscoped.invoice.create({
    data: {
      pharmacyId: sub.pharmacyId,
      subscriptionId: sub.id,
      number: invoiceNumber(),
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      subtotalKes: sub.plan.priceKes,
      taxKes: 0,
      totalKes: sub.plan.priceKes,
      status: "open",
      dueAt: sub.currentPeriodEnd,
      items: {
        create: [
          {
            description: `${sub.plan.name} (${sub.plan.interval})`,
            quantity: 1,
            unitKes: sub.plan.priceKes,
            totalKes: sub.plan.priceKes,
          },
        ],
      },
    },
  });
  await prismaUnscoped.billingEvent.create({
    data: { pharmacyId: sub.pharmacyId, type: "invoice.created", payload: { invoiceId: invoice.id } },
  });
  await enqueueOutbox({
    pharmacyId: sub.pharmacyId,
    eventType: "invoice.created",
    aggregateType: "Invoice",
    aggregateId: invoice.id,
    payload: { invoiceId: invoice.id, totalKes: Number(invoice.totalKes) },
  });
  return invoice;
}

export async function markInvoicePaid(invoiceId: string, actorId?: string | null) {
  const invoice = await prismaUnscoped.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date() },
  });
  await prismaUnscoped.dunningCase.updateMany({
    where: { invoiceId, status: { not: "resolved" } },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  await prismaUnscoped.pharmacy.update({
    where: { id: invoice.pharmacyId },
    data: { lifecycleStatus: "active", restrictedAt: null },
  });
  await recordAuditRequired({
    actorId,
    action: "billing.invoice.paid",
    resource: "invoice",
    resourceId: invoiceId,
    tenantId: invoice.pharmacyId,
  });
  return invoice;
}

export async function applyDunning(invoiceId: string) {
  const invoice = await prismaUnscoped.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "paid") return null;
  const now = new Date();
  const due = invoice.dueAt.getTime();
  const daysLate = Math.floor((now.getTime() - due) / 86400000);
  let status: "warning" | "grace" | "restricted" | "suspended" = "warning";
  if (daysLate >= 14) status = "suspended";
  else if (daysLate >= 7) status = "restricted";
  else if (daysLate >= 3) status = "grace";

  const existing = await prismaUnscoped.dunningCase.findFirst({
    where: { invoiceId, status: { notIn: ["resolved", "written_off"] } },
  });
  const row = existing
    ? await prismaUnscoped.dunningCase.update({
        where: { id: existing.id },
        data: { status, warningAt: existing.warningAt ?? now, graceUntil: new Date(due + 7 * 86400000) },
      })
    : await prismaUnscoped.dunningCase.create({
        data: {
          pharmacyId: invoice.pharmacyId,
          invoiceId,
          status,
          warningAt: now,
          graceUntil: new Date(due + 7 * 86400000),
        },
      });

  if (status === "restricted" || status === "suspended") {
    await withPharmacy(invoice.pharmacyId, async () => {
      await prismaUnscoped.pharmacy.update({
        where: { id: invoice.pharmacyId },
        data: {
          lifecycleStatus: status === "suspended" ? "suspended" : "restricted",
          restrictedAt: now,
          suspendedAt: status === "suspended" ? now : undefined,
          listed: status === "suspended" ? false : undefined,
        },
      });
    });
    await recordLifecycle(invoice.pharmacyId, status === "suspended" ? "suspended" : "restricted", {
      toStatus: status,
      reason: "invoice_overdue",
    });
  }
  return row;
}
