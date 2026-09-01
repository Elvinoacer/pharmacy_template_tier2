import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { DEFAULT_PLAN_FEATURES } from "@/app/lib/platform/entitlements";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { enqueueOutbox } from "@/app/lib/platform/outbox";
import { recordLifecycle } from "@/app/lib/platform/lifecycle";
import { stkPush } from "@/app/lib/services/daraja";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";

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

export async function nextInvoiceNumber(): Promise<string> {
  const rows = await prismaUnscoped.$queryRaw<Array<{ n: bigint | number }>>`
    SELECT nextval('invoice_number_seq') AS n
  `;
  const y = new Date().getUTCFullYear();
  const n = Number(rows[0]?.n ?? 0);
  return `INV-${y}-${String(n).padStart(8, "0")}`;
}

async function createInvoiceSafe(data: Parameters<typeof prismaUnscoped.invoice.create>[0]["data"]) {
  for (let i = 0; i < 3; i++) {
    try {
      return await prismaUnscoped.invoice.create({
        data: { ...data, number: await nextInvoiceNumber() },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002") {
        const existing = await prismaUnscoped.invoice.findFirst({
          where: {
            subscriptionId: (data as { subscriptionId?: string }).subscriptionId ?? undefined,
            periodStart: (data as { periodStart?: Date }).periodStart,
            periodEnd: (data as { periodEnd?: Date }).periodEnd,
          },
        });
        if (existing) return existing;
        continue;
      }
      throw err;
    }
  }
  throw new Error("invoice_number_collision");
}

export async function issueSubscriptionInvoice(
  subscriptionId: string,
  period?: { start: Date; end: Date },
) {
  const sub = await prismaUnscoped.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) throw new Error("subscription_not_found");
  const periodStart = period?.start ?? sub.currentPeriodStart;
  const periodEnd = period?.end ?? sub.currentPeriodEnd;

  const existing = await prismaUnscoped.invoice.findFirst({
    where: { subscriptionId: sub.id, periodStart, periodEnd },
  });
  if (existing) return existing;

  const invoice = await createInvoiceSafe({
    pharmacyId: sub.pharmacyId,
    subscriptionId: sub.id,
    number: "pending",
    periodStart,
    periodEnd,
    subtotalKes: sub.plan.priceKes,
    taxKes: 0,
    totalKes: sub.plan.priceKes,
    status: "open",
    dueAt: periodEnd,
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
  const current = await prismaUnscoped.invoice.findUnique({ where: { id: invoiceId } });
  if (!current) throw new Error("invoice_not_found");
  if (current.status === "paid") return current;

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
  if (invoice.subscriptionId) {
    await prismaUnscoped.subscription.updateMany({
      where: { id: invoice.subscriptionId, status: { not: "cancelled" } },
      data: { status: "active" },
    });
  }
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

export async function processSubscriptionCycle() {
  const now = new Date();
  let invoiced = 0;
  let activated = 0;
  const endingTrials = await prismaUnscoped.subscription.findMany({
    where: { status: "trialing", trialEndsAt: { lte: now } },
    include: { plan: true },
    take: 100,
  });
  for (const sub of endingTrials) {
    const claimed = await prismaUnscoped.subscription.updateMany({
      where: { id: sub.id, status: "trialing", trialEndsAt: sub.trialEndsAt ?? undefined },
      data: { status: "past_due" },
    });
    if (claimed.count === 0) continue;
    await issueSubscriptionInvoice(sub.id, { start: sub.currentPeriodStart, end: sub.currentPeriodEnd });
    invoiced++;
  }

  const renewing = await prismaUnscoped.subscription.findMany({
    where: { status: "active", currentPeriodEnd: { lte: now }, cancelAt: null },
    take: 100,
  });
  for (const sub of renewing) {
    const nextEnd = new Date(sub.currentPeriodEnd.getTime() + 30 * 86400000);
    const claimed = await prismaUnscoped.subscription.updateMany({
      where: {
        id: sub.id,
        status: "active",
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAt: null,
      },
      data: {
        currentPeriodStart: sub.currentPeriodEnd,
        currentPeriodEnd: nextEnd,
        status: "past_due", // Explicit: renewed period requires invoice payment to return to active
        ...(sub.pendingPlanId ? { planId: sub.pendingPlanId, pendingPlanId: null } : {}),
      },
    });
    if (claimed.count === 0) continue;
    if (sub.pendingPlanId) {
      await syncEntitlementsFromPlan(sub.pharmacyId, sub.pendingPlanId);
    }
    await issueSubscriptionInvoice(sub.id, { start: sub.currentPeriodEnd, end: nextEnd });
    invoiced++;
  }

  const cancelling = await prismaUnscoped.subscription.findMany({
    where: { status: { in: ["active", "past_due", "trialing"] }, cancelAt: { lte: now } },
    take: 50,
  });
  for (const sub of cancelling) {
    const claimed = await prismaUnscoped.subscription.updateMany({
      where: { id: sub.id, status: { in: ["active", "past_due", "trialing"] }, cancelAt: { lte: now } },
      data: { status: "cancelled", cancelledAt: now },
    });
    if (claimed.count === 0) continue;
    await recordLifecycle(sub.pharmacyId, "plan_changed", { reason: "cancelled_at_period_end" });
  }

  const paid = await prismaUnscoped.invoice.findMany({
    where: { status: "paid", subscriptionId: { not: null } },
    take: 50,
    include: { subscription: true },
  });
  for (const inv of paid) {
    if (inv.subscription && inv.subscription.status !== "active") {
      await prismaUnscoped.subscription.update({
        where: { id: inv.subscription.id },
        data: { status: "active" },
      });
      activated++;
    }
  }

  return { invoiced, activated, cancelled: cancelling.length };
}

export async function changePlan(
  subscriptionId: string,
  planSlug: string,
  timing: "immediate" | "period_end" = "period_end",
  actorId?: string | null,
) {
  const sub = await prismaUnscoped.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) throw new Error("subscription_not_found");
  const next = await prismaUnscoped.plan.findUnique({ where: { slug: planSlug } });
  if (!next || !next.active) throw new Error("plan_not_found");
  if (next.id === sub.planId && !sub.pendingPlanId) return sub;

  const upgrade = Number(next.priceKes) >= Number(sub.plan.priceKes);
  const applyNow = timing === "immediate" || upgrade;

  if (applyNow) {
    await prismaUnscoped.subscription.update({
      where: { id: sub.id },
      data: { planId: next.id, pendingPlanId: null, status: sub.status === "trialing" ? "trialing" : "active" },
    });
    await syncEntitlementsFromPlan(sub.pharmacyId, next.id);
    if (upgrade && Number(next.priceKes) > Number(sub.plan.priceKes)) {
      const fullDelta = Number(next.priceKes) - Number(sub.plan.priceKes);
      const totalMs = Math.max(1, sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime());
      const remainingMs = Math.max(0, sub.currentPeriodEnd.getTime() - Date.now());
      const fractionRemaining = remainingMs / totalMs;
      const proratedDelta = Math.max(0, Math.round(fullDelta * fractionRemaining));

      if (proratedDelta > 0) {
        await createInvoiceSafe({
          pharmacyId: sub.pharmacyId,
          subscriptionId: sub.id,
          number: "pending",
          periodStart: new Date(),
          periodEnd: sub.currentPeriodEnd,
          subtotalKes: proratedDelta,
          taxKes: 0,
          totalKes: proratedDelta,
          status: "open",
          dueAt: new Date(),
          items: {
            create: [
              {
                description: `Prorated upgrade ${sub.plan.name} → ${next.name} (${Math.round(fractionRemaining * 100)}% cycle remaining)`,
                quantity: 1,
                unitKes: proratedDelta,
                totalKes: proratedDelta,
              },
            ],
          },
        });
      }
    }
  } else {
    await prismaUnscoped.subscription.update({
      where: { id: sub.id },
      data: { pendingPlanId: next.id },
    });
  }

  await recordLifecycle(sub.pharmacyId, "plan_changed", {
    fromStatus: sub.plan.slug,
    toStatus: planSlug,
    actorId: actorId ?? undefined,
    meta: { timing: applyNow ? "immediate" : "period_end" },
  });
  return prismaUnscoped.subscription.findUnique({ where: { id: sub.id } });
}

export async function cancelSubscription(subscriptionId: string, atPeriodEnd = true, actorId?: string | null) {
  const sub = await prismaUnscoped.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("subscription_not_found");
  if (atPeriodEnd) {
    await prismaUnscoped.subscription.update({
      where: { id: sub.id },
      data: { cancelAt: sub.currentPeriodEnd },
    });
  } else {
    await prismaUnscoped.subscription.update({
      where: { id: sub.id },
      data: { status: "cancelled", cancelledAt: new Date(), cancelAt: new Date() },
    });
  }
  await recordLifecycle(sub.pharmacyId, "plan_changed", {
    reason: atPeriodEnd ? "cancel_at_period_end" : "cancelled_immediate",
    actorId: actorId ?? undefined,
  });
}

export async function resumeSubscription(subscriptionId: string, actorId?: string | null) {
  const sub = await prismaUnscoped.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("subscription_not_found");
  if (sub.status === "cancelled" && sub.currentPeriodEnd < new Date()) {
    throw new Error("period_ended");
  }
  await prismaUnscoped.subscription.update({
    where: { id: sub.id },
    data: {
      cancelAt: null,
      cancelledAt: null,
      status: sub.status === "cancelled" ? "active" : sub.status,
    },
  });
  await recordLifecycle(sub.pharmacyId, "plan_changed", { reason: "resumed", actorId: actorId ?? undefined });
}

export async function collectInvoicePayment(invoiceId: string, opts?: { phone?: string; actorId?: string | null }) {
  const invoice = await prismaUnscoped.invoice.findUnique({
    where: { id: invoiceId },
    include: { pharmacy: { select: { id: true } } },
  });
  if (!invoice) throw new Error("invoice_not_found");
  if (invoice.status === "paid") return { ok: true as const, alreadyPaid: true, invoiceId };

  const method = await prismaUnscoped.billingPaymentMethod.findFirst({
    where: { pharmacyId: invoice.pharmacyId, isDefault: true },
  });
  const phone = opts?.phone || method?.mpesaPhone;
  if (!phone) throw new Error("billing_phone_missing");

  const payment = await prismaUnscoped.billingPayment.create({
    data: {
      pharmacyId: invoice.pharmacyId,
      invoiceId: invoice.id,
      provider: "mpesa",
      status: "pending",
      amountKes: invoice.totalKes,
      phone,
    },
  });

  const creds = await resolveDarajaCredentials(null);
  const push = await stkPush({
    amount: Number(invoice.totalKes),
    phone,
    accountReference: invoice.number.slice(0, 12),
    transactionDesc: `Aether ${invoice.number}`,
    credentials: creds,
  });

  if (!push.ok) {
    await prismaUnscoped.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: push.error },
    });
    return { ok: false as const, error: push.error, paymentId: payment.id };
  }

  await prismaUnscoped.billingPayment.update({
    where: { id: payment.id },
    data: {
      status: "processing",
      checkoutRequestId: push.checkoutRequestId,
      merchantRequestId: push.merchantRequestId,
    },
  });
  await recordAuditRequired({
    actorId: opts?.actorId,
    action: "billing.invoice.collect",
    resource: "invoice",
    resourceId: invoiceId,
    tenantId: invoice.pharmacyId,
    details: { paymentId: payment.id },
  });
  return {
    ok: true as const,
    paymentId: payment.id,
    checkoutRequestId: push.checkoutRequestId,
    alreadyPaid: false,
    invoiceId,
  };
}

export async function completeBillingPayment(opts: {
  checkoutRequestId: string;
  merchantRequestId?: string | null;
  mpesaReceipt?: string | null;
  amount?: number | null;
  phone?: string | null;
  resultCode: number;
  resultDesc?: string | null;
}) {
  const row = await prismaUnscoped.billingPayment.findFirst({
    where: { checkoutRequestId: opts.checkoutRequestId },
    orderBy: { createdAt: "desc" },
    include: { invoice: true },
  });
  if (!row) return null;
  if (row.status === "succeeded") return row;

  if (opts.resultCode === 0) {
    // Reconcile amount if provided by the callback
    if (opts.amount != null) {
      const expected = Number(row.amountKes);
      const received = Number(opts.amount);
      if (Math.abs(expected - received) > 1.0) {
        await prismaUnscoped.billingPayment.update({
          where: { id: row.id },
          data: {
            status: "failed",
            failureReason: `amount_mismatch: expected ${expected}, got ${received}`,
            providerRef: opts.mpesaReceipt ?? row.providerRef,
          },
        });
        return prismaUnscoped.billingPayment.findUnique({ where: { id: row.id } });
      }
    }

    await prismaUnscoped.billingPayment.update({
      where: { id: row.id },
      data: {
        status: "succeeded",
        providerRef: opts.mpesaReceipt ?? row.providerRef,
        paidAt: new Date(),
        failureReason: null,
      },
    });
    await markInvoicePaid(row.invoiceId);
    return prismaUnscoped.billingPayment.findUnique({ where: { id: row.id } });
  }

  await prismaUnscoped.billingPayment.update({
    where: { id: row.id },
    data: { status: "failed", failureReason: opts.resultDesc ?? "stk_failed" },
  });
  return prismaUnscoped.billingPayment.findUnique({ where: { id: row.id } });
}
