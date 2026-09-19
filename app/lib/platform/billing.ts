import "server-only";
import { MONTHLY_FEE_KES, nextBillingMonth } from "./pricing";

import type { Prisma } from "@/app/generated/prisma/client";
import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { DEFAULT_PLAN_FEATURES } from "@/app/lib/platform/entitlements";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { recordLifecycle } from "@/app/lib/platform/lifecycle";
import { stkPush } from "@/app/lib/services/daraja";
import { resolveDarajaCredentials } from "@/app/lib/platform/integrations";
import { createIntasendCheckout, getIntasendConfig, logIntasend } from "@/app/lib/services/intasend";

export async function ensureDefaultPlans() {
  await prismaUnscoped.plan.updateMany({ where: { slug: { in: ["professional", "enterprise"] } }, data: { active: false, priceKes: MONTHLY_FEE_KES } });
  const defs = [{ slug: "starter", name: "Pharmacy Platform", priceKes: MONTHLY_FEE_KES, sortOrder: 1 }] as const;
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
  await prismaUnscoped.pharmacy.update({ where: { id: pharmacyId }, data: { lifecycleStatus: "trial", trialEndsAt: trialEnds } });
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
  const rows = await prismaUnscoped.$queryRaw<Array<{ n: bigint | number }>>`SELECT nextval('invoice_number_seq') AS n`;
  const y = new Date().getUTCFullYear();
  const n = Number(rows[0]?.n ?? 0);
  return `INV-${y}-${String(n).padStart(8, "0")}`;
}

async function createInvoiceSafe(data: Parameters<typeof prismaUnscoped.invoice.create>[0]["data"]) {
  for (let i = 0; i < 3; i++) {
    try {
      return await prismaUnscoped.invoice.create({ data: { ...data, number: await nextInvoiceNumber() } });
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

export async function issueSubscriptionInvoice(subscriptionId: string, period?: { start: Date; end: Date }) {
  return prismaUnscoped.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM subscriptions WHERE id = ${subscriptionId}::uuid FOR UPDATE`;
    const sub = await tx.subscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      include: { plan: true, pharmacy: { include: { owner: { select: { email: true } } } } },
    });
    const periodStart = period?.start ?? sub.currentPeriodStart;
    const periodEnd = period?.end ?? sub.currentPeriodEnd;
    const existing = await tx.invoice.findFirst({ where: { subscriptionId, periodStart, periodEnd } });
    if (existing) return existing;
    if (sub.status === "cancelled") throw new Error("subscription_cancelled");
    const grant = await tx.pharmacyPromotionGrant.findUnique({ where: { pharmacyId: sub.pharmacyId } });
    const firstSubscription = grant
      ? await tx.subscription.findFirst({ where: { pharmacyId: sub.pharmacyId }, orderBy: { startedAt: "asc" }, select: { startedAt: true } })
      : null;
    let waiverEnd = new Date(firstSubscription?.startedAt ?? sub.startedAt);
    for (let i = 0; i < (grant?.recurringMonths ?? 0); i++) waiverEnd = nextBillingMonth(waiverEnd);
    const waived = periodStart < waiverEnd && (grant?.recurringMonths ?? 0) > 0;
    const price = Number(sub.plan.priceKes);
    const sequence = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT nextval('invoice_number_seq') AS n`;
    const number = `INV-${new Date().getUTCFullYear()}-${String(sequence[0].n).padStart(8, "0")}`;
    const invoice = await tx.invoice.create({
      data: {
        pharmacyId: sub.pharmacyId,
        subscriptionId,
        number,
        periodStart,
        periodEnd,
        subtotalKes: price,
        taxKes: 0,
        totalKes: waived ? 0 : price,
        status: "open",
        dueAt: periodStart,
        items: {
          create: [
            { description: `${sub.plan.name} (monthly)`, quantity: 1, unitKes: price, totalKes: price },
            ...(waived ? [{ description: "Promotional monthly service waiver", quantity: 1, unitKes: -price, totalKes: -price }] : []),
          ],
        },
      },
    });
    await tx.billingEvent.create({ data: { pharmacyId: sub.pharmacyId, type: "invoice.created", payload: { invoiceId: invoice.id } } });
    await tx.outboxEvent.create({
      data: {
        pharmacyId: sub.pharmacyId,
        eventType: "invoice.created",
        aggregateType: "Invoice",
        aggregateId: invoice.id,
        payload: { invoiceId: invoice.id, totalKes: Number(invoice.totalKes) },
      },
    });
    const email = sub.pharmacy.owner?.email;
    if (email) {
      await tx.notificationDelivery.create({
        data: {
          pharmacyId: sub.pharmacyId,
          channel: "email",
          status: "queued",
          payload: {
            channel: "email",
            purpose: "transactional",
            recipient: { email },
            subject: `Your Afyvia pharmacy invoice ${number}`,
            body: waived
              ? "Your monthly platform service fee has been waived for this period. Review your invoices at /onboard/billing."
              : `Your monthly platform service invoice is KES ${price}. If M-PESA Ratiba is authorized, Safaricom will collect it automatically; otherwise open Pricing & billing to pay securely with M-PESA STK Push.`,
            fallback: ["email"],
            attempted: [],
          },
        },
      });
    }
    return waived ? settleInvoice(tx, invoice.id) : invoice;
  }, { timeout: 30000, maxWait: 15000 });
}

export async function settleInvoice(tx: Prisma.TransactionClient, invoiceId: string, actorId?: string | null) {
  await tx.$queryRaw`SELECT id FROM invoices WHERE id = ${invoiceId}::uuid FOR UPDATE`;
  const current = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (!["open", "paid"].includes(current.status)) throw new Error("invoice_not_collectible");
  const invoice = current.status === "paid"
    ? current
    : await tx.invoice.update({ where: { id: invoiceId }, data: { status: "paid", paidAt: new Date() } });
  await tx.dunningCase.updateMany({ where: { invoiceId, status: { not: "resolved" } }, data: { status: "resolved", resolvedAt: new Date() } });
  if (invoice.subscriptionId) {
    const unpaid = await tx.invoice.count({ where: { subscriptionId: invoice.subscriptionId, status: "open" } });
    if (unpaid === 0) {
      const activated = await tx.subscription.updateMany({
        where: { id: invoice.subscriptionId, status: "past_due", currentPeriodStart: invoice.periodStart },
        data: { status: "active" },
      });
      if (activated.count) {
        await tx.pharmacy.updateMany({
          where: { id: invoice.pharmacyId, status: { in: ["approved", "active"] }, lifecycleStatus: { notIn: ["suspended", "archived"] } },
          data: { lifecycleStatus: "active", restrictedAt: null },
        });
      }
    }
  }
  if (current.status !== "paid") {
    await tx.auditLog.create({ data: { actorId, pharmacyId: invoice.pharmacyId, action: "billing.invoice.paid", entityType: "invoice", entityId: invoiceId } });
  }
  return invoice;
}

export async function markInvoicePaid(invoiceId: string, actorId?: string | null) {
  return prismaUnscoped.$transaction(async (tx) => {
    const evidence = await tx.billingPayment.findFirst({ where: { invoiceId, status: "succeeded" } });
    if (!evidence) throw new Error("confirmed_payment_required");
    return settleInvoice(tx, invoiceId, actorId);
  });
}

export async function applyDunning(invoiceId: string) {
  const invoice = await prismaUnscoped.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status !== "open" || !invoice.subscriptionId || invoice.dueAt > new Date()) return null;
  const now = new Date();
  const due = invoice.dueAt.getTime();
  const daysLate = Math.floor((now.getTime() - due) / 86400000);
  let status: "warning" | "grace" | "restricted" | "suspended" = "warning";
  if (daysLate >= 14) status = "suspended";
  else if (daysLate >= 7) status = "restricted";
  else if (daysLate >= 3) status = "grace";

  const existing = await prismaUnscoped.dunningCase.findFirst({ where: { invoiceId, status: { notIn: ["resolved", "written_off"] } } });
  const row = existing
    ? await prismaUnscoped.dunningCase.update({ where: { id: existing.id }, data: { status, warningAt: existing.warningAt ?? now, graceUntil: new Date(due + 7 * 86400000) } })
    : await prismaUnscoped.dunningCase.create({ data: { pharmacyId: invoice.pharmacyId, invoiceId, status, warningAt: now, graceUntil: new Date(due + 7 * 86400000) } });

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
    await recordLifecycle(invoice.pharmacyId, status === "suspended" ? "suspended" : "restricted", { toStatus: status, reason: "invoice_overdue" });
  }
  return row;
}

export async function processSubscriptionCycle() {
  const now = new Date();
  let invoiced = 0;
  const activated = 0;
  const endingTrials = await prismaUnscoped.subscription.findMany({ where: { status: "trialing", trialEndsAt: { lte: now } }, include: { plan: true }, take: 100 });
  for (const sub of endingTrials) {
    const claimed = await prismaUnscoped.subscription.updateMany({
      where: { id: sub.id, status: "trialing", trialEndsAt: sub.trialEndsAt ?? undefined },
      data: { status: "past_due", currentPeriodStart: sub.currentPeriodEnd, currentPeriodEnd: nextBillingMonth(sub.currentPeriodEnd) },
    });
    if (claimed.count === 0) continue;
    await issueSubscriptionInvoice(sub.id, { start: sub.currentPeriodEnd, end: nextBillingMonth(sub.currentPeriodEnd) });
    invoiced++;
  }

  const renewing = await prismaUnscoped.subscription.findMany({ where: { status: "active", currentPeriodEnd: { lte: now }, cancelAt: null }, take: 100 });
  for (const sub of renewing) {
    const nextEnd = nextBillingMonth(sub.currentPeriodEnd);
    const claimed = await prismaUnscoped.subscription.updateMany({
      where: { id: sub.id, status: "active", currentPeriodEnd: sub.currentPeriodEnd, cancelAt: null },
      data: {
        currentPeriodStart: sub.currentPeriodEnd,
        currentPeriodEnd: nextEnd,
        status: "past_due",
        ...(sub.pendingPlanId ? { planId: sub.pendingPlanId, pendingPlanId: null } : {}),
      },
    });
    if (claimed.count === 0) continue;
    if (sub.pendingPlanId) await syncEntitlementsFromPlan(sub.pharmacyId, sub.pendingPlanId);
    await issueSubscriptionInvoice(sub.id, { start: sub.currentPeriodEnd, end: nextEnd });
    invoiced++;
  }

  const cancelling = await prismaUnscoped.subscription.findMany({ where: { status: { in: ["active", "past_due", "trialing"] }, cancelAt: { lte: now } }, take: 50 });
  for (const sub of cancelling) {
    const claimed = await prismaUnscoped.subscription.updateMany({
      where: { id: sub.id, status: { in: ["active", "past_due", "trialing"] }, cancelAt: { lte: now } },
      data: { status: "cancelled", cancelledAt: now },
    });
    if (claimed.count === 0) continue;
    await recordLifecycle(sub.pharmacyId, "plan_changed", { reason: "cancelled_at_period_end" });
  }

  const unfinished = await prismaUnscoped.subscription.findMany({ where: { status: "past_due" }, take: 100 });
  for (const sub of unfinished) await issueSubscriptionInvoice(sub.id);
  return { invoiced, activated, cancelled: cancelling.length };
}

export async function changePlan(subscriptionId: string, planSlug: string, timing: "immediate" | "period_end" = "period_end", actorId?: string | null) {
  const sub = await prismaUnscoped.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } });
  if (!sub) throw new Error("subscription_not_found");
  const next = await prismaUnscoped.plan.findUnique({ where: { slug: planSlug } });
  if (!next || !next.active) throw new Error("plan_not_found");
  if (next.id === sub.planId && !sub.pendingPlanId) return sub;

  const upgrade = Number(next.priceKes) >= Number(sub.plan.priceKes);
  const applyNow = timing === "immediate" || upgrade;
  if (applyNow) {
    await prismaUnscoped.subscription.update({ where: { id: sub.id }, data: { planId: next.id, pendingPlanId: null, status: sub.status === "trialing" ? "trialing" : "active" } });
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
          items: { create: [{ description: `Prorated upgrade ${sub.plan.name} → ${next.name} (${Math.round(fractionRemaining * 100)}% cycle remaining)`, quantity: 1, unitKes: proratedDelta, totalKes: proratedDelta }] },
        });
      }
    }
  } else {
    await prismaUnscoped.subscription.update({ where: { id: sub.id }, data: { pendingPlanId: next.id } });
  }
  await recordLifecycle(sub.pharmacyId, "plan_changed", { fromStatus: sub.plan.slug, toStatus: planSlug, actorId: actorId ?? undefined, meta: { timing: applyNow ? "immediate" : "period_end" } });
  return prismaUnscoped.subscription.findUnique({ where: { id: sub.id } });
}

export async function cancelSubscription(subscriptionId: string, atPeriodEnd = true, actorId?: string | null) {
  const sub = await prismaUnscoped.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("subscription_not_found");
  if (atPeriodEnd) await prismaUnscoped.subscription.update({ where: { id: sub.id }, data: { cancelAt: sub.currentPeriodEnd } });
  else await prismaUnscoped.subscription.update({ where: { id: sub.id }, data: { status: "cancelled", cancelledAt: new Date(), cancelAt: new Date() } });
  await recordLifecycle(sub.pharmacyId, "plan_changed", { reason: atPeriodEnd ? "cancel_at_period_end" : "cancelled_immediate", actorId: actorId ?? undefined });
}

export async function resumeSubscription(subscriptionId: string, actorId?: string | null) {
  const sub = await prismaUnscoped.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("subscription_not_found");
  if (sub.status === "cancelled" && sub.currentPeriodEnd < new Date()) throw new Error("period_ended");
  await prismaUnscoped.subscription.update({ where: { id: sub.id }, data: { cancelAt: null, cancelledAt: null, status: sub.status === "cancelled" ? "active" : sub.status } });
  await recordLifecycle(sub.pharmacyId, "plan_changed", { reason: "resumed", actorId: actorId ?? undefined });
}

export async function handleBundleSettlement(
  tx: Prisma.TransactionClient,
  invoice: { id: string; pharmacyId: string; number: string },
  actorId?: string | null,
) {
  if (!invoice.number.startsWith("BUNDLE-")) return;

  await tx.invoice.updateMany({
    where: { pharmacyId: invoice.pharmacyId, number: `KYP-${invoice.pharmacyId}` },
    data: { status: "paid", paidAt: new Date(), totalKes: 0 },
  });

  const pharmacy = await tx.pharmacy.findUnique({
    where: { id: invoice.pharmacyId },
    select: { status: true, ownerUserId: true },
  });

  const priorGrant = await tx.pharmacyPromotionGrant.findUnique({
    where: { pharmacyId: invoice.pharmacyId },
  });
  if (priorGrant) {
    if ((priorGrant.recurringMonths || 0) < 1) {
      await tx.pharmacyPromotionGrant.update({
        where: { pharmacyId: invoice.pharmacyId },
        data: { recurringMonths: 1, verification: true },
      });
    }
  } else {
    let promo = await tx.pharmacyPromotion.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
    if (!promo) {
      const creatorId =
        pharmacy?.ownerUserId ??
        actorId ??
        (await tx.user.findFirst({ select: { id: true } }))?.id;
      if (creatorId) {
        promo = await tx.pharmacyPromotion.create({
          data: {
            name: "Standard Bundle Prepaid Month",
            capacity: 999999,
            verification: true,
            recurring: true,
            recurringMonths: 1,
            active: true,
            createdBy: creatorId,
          },
        });
      }
    } else {
      await tx.pharmacyPromotion.update({
        where: { id: promo.id },
        data: { claimed: { increment: 1 } },
      });
    }
    if (promo) {
      await tx.pharmacyPromotionGrant.create({
        data: {
          pharmacyId: invoice.pharmacyId,
          promotionId: promo.id,
          verification: true,
          recurringMonths: 1,
        },
      });
    }
  }

  await tx.pharmacyOnboardingEvent.create({
    data: {
      pharmacyId: invoice.pharmacyId,
      actorId: actorId ?? pharmacy?.ownerUserId ?? undefined,
      type: "bundle_prepaid_credit_granted",
      message: "Prepaid first-month subscription credited; will activate at post-approval service activation",
    },
  });

  // If the pharmacy is already approved/active, activate the subscription now.
  if (pharmacy && ["approved", "active"].includes(pharmacy.status)) {
    const existingSub = await tx.subscription.findFirst({
      where: { pharmacyId: invoice.pharmacyId, status: { not: "cancelled" } },
    });
    if (!existingSub) {
      const plan = await tx.plan.findUniqueOrThrow({ where: { slug: "starter" } });
      const start = new Date();
      await tx.subscription.create({
        data: {
          pharmacyId: invoice.pharmacyId,
          planId: plan.id,
          status: "active",
          startedAt: start,
          currentPeriodStart: start,
          currentPeriodEnd: nextBillingMonth(start),
        },
      });
    } else if (existingSub.status === "past_due") {
      await tx.subscription.update({
        where: { id: existingSub.id },
        data: { status: "active" },
      });
    }
  }
}

export async function createIntasendBillingCheckout(
  pharmacyId: string,
  invoiceId: string,
  opts?: {
    actorId?: string | null;
    redirectUrl?: string;
  },
) {
  // A checkout spans several reads and writes. Re-establish the tenant scope here
  // rather than relying on a server action to keep its AsyncLocalStorage scope alive.
  return withPharmacy(pharmacyId, () =>
    createIntasendBillingCheckoutInPharmacy(pharmacyId, invoiceId, opts),
  );
}

async function createIntasendBillingCheckoutInPharmacy(
  pharmacyId: string,
  invoiceId: string,
  opts?: {
    actorId?: string | null;
    redirectUrl?: string;
  },
) {
  const invoice = await prismaUnscoped.invoice.findFirst({
    where: { id: invoiceId, pharmacyId },
    include: {
      pharmacy: {
        include: {
          owner: { select: { email: true } },
        },
      },
    },
  });
  if (!invoice) {
    logIntasend("warn", "billing.checkout.invoice_not_found", {
      invoiceId,
      pharmacyId,
    });
    throw new Error("invoice_not_found");
  }
  if (invoice.status === "paid") {
    return { ok: true as const, alreadyPaid: true, invoiceId };
  }
  if (invoice.status !== "open") {
    throw new Error("invoice_not_collectible");
  }

  // If total is 0 (waived by promo card/waiver), settle immediately with zero friction!
  if (Number(invoice.totalKes) === 0) {
    await prismaUnscoped.$transaction(async (tx) => {
      await settleInvoice(tx, invoice.id, opts?.actorId);
      if (invoice.number.startsWith("BUNDLE-")) {
        await handleBundleSettlement(tx, invoice, opts?.actorId);
      }
    });
    return { ok: true as const, alreadyPaid: true, waived: true, invoiceId };
  }

  const existing = await prismaUnscoped.billingPayment.findFirst({
    where: {
      invoiceId,
      provider: "intasend",
      status: { in: ["pending", "processing"] },
      createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
  });

  const intasendConfig = getIntasendConfig();

  let defaultRedirect = `${intasendConfig.appBaseUrl}/onboard?stage=payment&status=returned&invoice=${invoice.id}`;
  if (invoice.subscriptionId || invoice.number.startsWith("SUB-")) {
    defaultRedirect = `${intasendConfig.appBaseUrl}/onboard?stage=service&status=returned&invoice=${invoice.id}`;
  }

  const redirectUrl = opts?.redirectUrl || defaultRedirect;

  if (existing?.checkoutUrl) {
    return {
      ok: true as const,
      alreadyPaid: false,
      checkoutUrl: existing.checkoutUrl,
      paymentId: existing.id,
      invoiceId: invoice.id,
    };
  }

  const apiRef = invoice.number;

  const checkoutRes = await createIntasendCheckout({
    amount: Number(invoice.totalKes),
    currency: "KES",
    apiRef,
    email: invoice.pharmacy.owner?.email || invoice.pharmacy.email || "billing@afyvia.co.ke",
    firstName: invoice.pharmacy.name,
    phone: invoice.pharmacy.phone || undefined,
    redirectUrl,
    comment: `Invoice ${invoice.number} for ${invoice.pharmacy.name}`,
  });

  if (!checkoutRes.ok) {
    logIntasend("error", "billing.checkout.failed", {
      invoiceId,
      pharmacyId: invoice.pharmacyId,
      apiRef,
      errorCode: checkoutRes.error,
    });
    return {
      ok: false as const,
      error: checkoutRes.error,
      message: checkoutRes.message,
    };
  }

  const payment = await prismaUnscoped.billingPayment.create({
    data: {
      pharmacyId: invoice.pharmacyId,
      invoiceId: invoice.id,
      provider: "intasend",
      status: "pending",
      amountKes: invoice.totalKes,
      phone: invoice.pharmacy.phone,
      checkoutUrl: checkoutRes.url,
      checkoutRequestId: checkoutRes.id || checkoutRes.invoiceId,
      providerRef: checkoutRes.invoiceId,
    },
  });

  logIntasend("info", "billing.payment.pending", {
    invoiceId: invoice.id,
    paymentId: payment.id,
    pharmacyId: invoice.pharmacyId,
    apiRef,
    amount: Number(invoice.totalKes),
  });

  await recordAuditRequired({
    actorId: opts?.actorId,
    action: "billing.invoice.intasend_checkout",
    resource: "invoice",
    resourceId: invoiceId,
    tenantId: invoice.pharmacyId,
    details: { paymentId: payment.id, provider: "intasend", checkoutUrl: checkoutRes.url },
  });

  return {
    ok: true as const,
    alreadyPaid: false,
    checkoutUrl: checkoutRes.url,
    paymentId: payment.id,
    invoiceId: invoice.id,
  };
}

export async function completeIntasendBillingPayment(opts: {
  apiRef: string;
  intasendInvoiceId?: string;
  amount: number;
  provider?: string;
}) {
  return prismaUnscoped.$transaction(async (tx) => {
    let invoice = await tx.invoice.findFirst({
      where: {
        OR: [
          { number: opts.apiRef },
          { id: opts.apiRef.startsWith("SUBINV_") ? opts.apiRef.replace("SUBINV_", "") : undefined },
        ],
      },
    });

    if (!invoice) {
      const paymentRow = await tx.billingPayment.findFirst({
        where: {
          OR: [
            { checkoutRequestId: opts.apiRef },
            { checkoutRequestId: opts.intasendInvoiceId },
            { providerRef: opts.intasendInvoiceId },
          ],
        },
      });
      if (paymentRow) {
        invoice = await tx.invoice.findUnique({ where: { id: paymentRow.invoiceId } });
      }
    }

    if (!invoice) {
      logIntasend("warn", "billing.webhook.invoice_not_found", { apiRef: opts.apiRef });
      return null;
    }

    const expected = Number(invoice.totalKes);
    if (Math.abs(expected - opts.amount) > 0.05) {
      logIntasend("error", "billing.webhook.amount_mismatch", {
        apiRef: opts.apiRef,
        invoiceId: invoice.id,
        expected,
        received: opts.amount,
      });
      throw new Error("billing_amount_mismatch");
    }

    const payment = await tx.billingPayment.findFirst({
      where: {
        invoiceId: invoice.id,
        provider: "intasend",
        status: { in: ["pending", "processing", "succeeded"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (payment) {
      await tx.billingPayment.update({
        where: { id: payment.id },
        data: {
          status: "succeeded",
          paidAt: new Date(),
          providerRef: opts.intasendInvoiceId || payment.providerRef,
        },
      });
    } else {
      await tx.billingPayment.create({
        data: {
          pharmacyId: invoice.pharmacyId,
          invoiceId: invoice.id,
          provider: "intasend",
          status: "succeeded",
          amountKes: invoice.totalKes,
          providerRef: opts.intasendInvoiceId,
          paidAt: new Date(),
        },
      });
    }

    const settled = await settleInvoice(tx, invoice.id);

    await handleBundleSettlement(tx, invoice);

    return settled;
  }, { timeout: 30000, maxWait: 15000 });
}

export async function failIntasendBillingPayment(opts: {
  apiRef: string;
  reason: string;
}) {
  const invoice = await prismaUnscoped.invoice.findFirst({
    where: { number: opts.apiRef },
  });
  if (!invoice) return;

  const result = await prismaUnscoped.billingPayment.updateMany({
    where: { invoiceId: invoice.id, provider: "intasend", status: { in: ["pending", "processing"] } },
    data: { status: "failed", failureReason: opts.reason.slice(0, 500) },
  });
  logIntasend("warn", "billing.payment.failed", {
    apiRef: opts.apiRef,
    invoiceId: invoice.id,
    updatedPayments: result.count,
    reason: opts.reason.slice(0, 160),
  });
}

export async function collectInvoicePayment(invoiceId: string, opts?: { phone?: string; actorId?: string | null }) {
  const invoice = await prismaUnscoped.invoice.findUnique({ where: { id: invoiceId }, include: { pharmacy: { select: { id: true } } } });
  if (!invoice) throw new Error("invoice_not_found");
  if (invoice.status === "paid") return { ok: true as const, alreadyPaid: true, invoiceId };
  if (invoice.status !== "open" || Number(invoice.totalKes) <= 0) throw new Error("invoice_not_collectible");
  const pending = await prismaUnscoped.billingPayment.findFirst({ where: { invoiceId, status: { in: ["pending", "processing"] } } });
  if (pending) throw new Error("A payment is awaiting confirmation. Please refresh before trying again.");

  const method = await prismaUnscoped.billingPaymentMethod.findFirst({ where: { pharmacyId: invoice.pharmacyId, isDefault: true } });
  const phone = opts?.phone || method?.mpesaPhone;
  if (!phone) throw new Error("billing_phone_missing");
  const creds = await resolveDarajaCredentials(null);
  if (!creds) throw new Error("Platform M-PESA is not configured.");

  const payment = await prismaUnscoped.billingPayment.create({
    data: { pharmacyId: invoice.pharmacyId, invoiceId: invoice.id, provider: "daraja", status: "pending", amountKes: invoice.totalKes, phone },
  });
  const push = await stkPush({ amount: Number(invoice.totalKes), phone, accountReference: invoice.number.slice(0, 12), transactionDesc: `Afyvia ${invoice.number}`, credentials: creds });
  if (!push.ok) {
    await prismaUnscoped.billingPayment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: push.error } });
    return { ok: false as const, error: push.error, paymentId: payment.id };
  }
  await prismaUnscoped.billingPayment.update({ where: { id: payment.id }, data: { status: "processing", checkoutRequestId: push.checkoutRequestId, merchantRequestId: push.merchantRequestId } });
  await recordAuditRequired({ actorId: opts?.actorId, action: "billing.invoice.collect", resource: "invoice", resourceId: invoiceId, tenantId: invoice.pharmacyId, details: { paymentId: payment.id, provider: "daraja" } });
  return { ok: true as const, paymentId: payment.id, checkoutRequestId: push.checkoutRequestId, alreadyPaid: false, invoiceId };
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
  return prismaUnscoped.$transaction(async (tx) => {
    const found = await tx.billingPayment.findFirst({ where: { checkoutRequestId: opts.checkoutRequestId } });
    if (!found) return null;
    await tx.$queryRaw`SELECT id FROM billing_payments WHERE id = ${found.id}::uuid FOR UPDATE`;
    const row = await tx.billingPayment.findUniqueOrThrow({ where: { id: found.id } });
    if (row.status === "succeeded") {
      await settleInvoice(tx, row.invoiceId);
      return row;
    }
    if (opts.resultCode === 0) {
      if (!opts.mpesaReceipt || opts.amount == null || !Number.isFinite(opts.amount) || opts.merchantRequestId !== row.merchantRequestId || Math.abs(Number(row.amountKes) - opts.amount) > 0.01) {
        throw new Error("billing_evidence_mismatch");
      }
      const payment = await tx.billingPayment.update({ where: { id: row.id }, data: { status: "succeeded", providerRef: opts.mpesaReceipt, paidAt: new Date(), failureReason: null } });
      await settleInvoice(tx, row.invoiceId);
      return payment;
    }
    return tx.billingPayment.update({ where: { id: row.id }, data: { status: "failed", failureReason: opts.resultDesc ?? "stk_failed" } });
  });
}

export async function reconcileBillingPayments(limit = 50) {
  const { stkQuery } = await import("@/app/lib/services/daraja");
  const { verifyDarajaCallback } = await import("@/app/lib/services/daraja-callback-verification");
  const rows = await prismaUnscoped.billingPayment.findMany({
    where: {
      provider: { in: ["daraja", "mpesa"] },
      status: { in: ["pending", "processing"] },
      updatedAt: { lt: new Date(Date.now() - 60_000) },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });
  const credentials = await resolveDarajaCredentials(null);
  if (!credentials) return { scanned: 0, reconciled: 0 };
  let reconciled = 0;
  for (const row of rows) {
    try {
      if (!row.checkoutRequestId) {
        await prismaUnscoped.billingPayment.update({ where: { id: row.id }, data: { failureReason: "Provider response was not recorded. Check merchant records before allowing another payment." } });
        continue;
      }
      const result = await stkQuery(row.checkoutRequestId, credentials);
      if (!result.ok || !result.resultCode) continue;
      if (result.resultCode !== "0") {
        await completeBillingPayment({ checkoutRequestId: row.checkoutRequestId, merchantRequestId: row.merchantRequestId, resultCode: Number(result.resultCode), resultDesc: result.resultDesc });
        reconciled++;
        continue;
      }
      const event = await prismaUnscoped.webhookEvent.findFirst({ where: { pharmacyId: row.pharmacyId, provider: "daraja", providerEventId: row.checkoutRequestId } });
      const payload = event?.payload as { Body?: { stkCallback?: { MerchantRequestID?: string; ResultCode?: number; CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: string | number }> } } } } | null;
      const cb = payload?.Body?.stkCallback;
      if (cb?.ResultCode === 0) {
        const verified = await verifyDarajaCallback({
          pharmacyId: null,
          expectedAmount: Number(row.amountKes),
          expectedCheckoutRequestId: row.checkoutRequestId,
          expectedMerchantRequestId: row.merchantRequestId,
          callback: { checkoutRequestId: row.checkoutRequestId, merchantRequestId: cb.MerchantRequestID, resultCode: 0, items: cb.CallbackMetadata?.Item },
        });
        if (verified.ok) {
          await completeBillingPayment({ checkoutRequestId: row.checkoutRequestId, merchantRequestId: row.merchantRequestId, resultCode: 0, amount: verified.evidence.amount, mpesaReceipt: verified.evidence.receipt });
          reconciled++;
          continue;
        }
      }
      await prismaUnscoped.billingPayment.update({ where: { id: row.id }, data: { failureReason: "Provider confirms success; waiting for complete receipt evidence. Do not collect again." } });
    } catch (error) {
      console.error("[billing reconciliation]", row.id, error instanceof Error ? error.message : "failed");
    }
  }
  return { scanned: rows.length, reconciled };
}
