import "server-only";

import { prismaUnscoped as db } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { issueSubscriptionInvoice, markInvoicePaid } from "@/app/lib/platform/billing";
import { nextBillingMonth } from "@/app/lib/platform/pricing";
import { markWebhookProcessed, recordInboundWebhook } from "@/app/lib/platform/webhooks";
import { intasendWebhookChallenge } from "@/app/lib/services/intasend-checkout";

export type IntaSendSubscriptionEvent = {
  subscription_id?: string;
  reference?: string | null;
  payment_method?: string | null;
  card_mask?: string | null;
  card_type?: string | null;
  status?: string | null;
  start_date?: string | null;
  next_date?: string | null;
  completed_cycles?: number | null;
  fail_reason?: string | null;
  updated_at?: string | null;
  challenge?: string | null;
  customer?: {
    customer_id?: string;
    email?: string;
    reference?: string | null;
  } | null;
  plan?: {
    name?: string;
    plan_id?: string;
    frequency?: number;
    frequency_unit?: string;
    billing_cycles?: number;
    currency?: string;
    amount?: string | number;
    reference?: string | null;
  } | null;
  payments?: Array<{
    transaction_id?: string;
    created_at?: string;
    updated_at?: string;
    invoice?: {
      invoice_id?: string;
      state?: string;
      provider?: string;
      currency?: string;
      value?: string | number;
      net_amount?: string | number;
      failed_reason?: string | null;
      failed_code?: string | null;
      created_at?: string;
      updated_at?: string;
    } | null;
  }> | null;
};

type IntaSendCustomer = {
  customer_id: string;
  email?: string;
  reference?: string | null;
};

type IntaSendSubscription = {
  subscription_id: string;
  customer_id?: string;
  reference?: string | null;
  plan_id?: string;
  status?: string;
  start_date?: string;
  next_date?: string | null;
  setup_url?: string | null;
};

type Paginated<T> = { results?: T[]; count?: number } | T[];

function envName() {
  return process.env.INTASEND_ENV?.trim() === "production" ? "production" : "sandbox";
}

function apiBase() {
  return envName() === "production"
    ? "https://api.intasend.com/api/v1"
    : "https://sandbox.intasend.com/api/v1";
}

function secretKey() {
  return process.env.INTASEND_SECRET_KEY?.trim() || null;
}

export function intasendSubscriptionPlanId() {
  return process.env.INTASEND_SUBSCRIPTION_PLAN_ID?.trim() || null;
}

export function intasendSubscriptionConfigured() {
  return Boolean(secretKey() && intasendSubscriptionPlanId() && intasendWebhookChallenge());
}

function appOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  return vercelHost ? `https://${vercelHost.replace(/^https?:\/\//, "")}` : null;
}

function kenyaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function safePersonName(value: string, fallback: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9 _:-]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || fallback).slice(0, 50);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const key = secretKey();
  if (!key) throw new Error("IntaSend recurring billing is not configured: INTASEND_SECRET_KEY is missing.");

  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(init?.headers || {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    console.error("[intasend subscriptions] request failed", path, error);
    throw new Error("IntaSend recurring billing could not be reached. Try again shortly.");
  }

  const body = (await response.json().catch(() => ({}))) as T & { detail?: string; message?: string };
  if (!response.ok) {
    const providerMessage = body?.detail || body?.message;
    console.error("[intasend subscriptions] provider error", {
      path,
      status: response.status,
      providerMessage,
    });
    throw new Error(
      providerMessage
        ? `IntaSend recurring billing rejected the request: ${String(providerMessage).slice(0, 180)}`
        : `IntaSend recurring billing rejected the request (HTTP ${response.status}).`,
    );
  }
  return body;
}

function resultRows<T>(payload: Paginated<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results || [];
}

async function ensureCustomer(pharmacyId: string) {
  const pharmacy = await db.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: { owner: { select: { email: true } } },
  });
  if (!pharmacy) throw new Error("pharmacy_not_found");

  const email = pharmacy.email?.trim() || pharmacy.owner?.email?.trim();
  if (!email) throw new Error("Add a verified billing email before setting up recurring card payments.");

  const reference = `aether-pharmacy-${pharmacy.id}`;
  const existingPayload = await requestJson<Paginated<IntaSendCustomer>>(
    `/subscriptions-customers/?reference=${encodeURIComponent(reference)}`,
  );
  const existing = resultRows(existingPayload).find((row) => row.reference === reference);
  if (existing?.customer_id) return existing;

  const words = pharmacy.name.split(/\s+/).filter(Boolean);
  const firstName = safePersonName(words[0] || pharmacy.name, "Pharmacy");
  const lastName = safePersonName(words.slice(1).join(" ") || "Owner", "Owner");

  return requestJson<IntaSendCustomer>("/subscriptions-customers/", {
    method: "POST",
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      reference,
      address: pharmacy.city || pharmacy.county || "Kenya",
      city: pharmacy.city || "Nairobi",
      state: pharmacy.county || pharmacy.city || "Kenya",
      country: "KE",
    }),
  });
}

function validateSetupUrl(value: string | null | undefined) {
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("IntaSend returned an invalid subscription setup URL.");
  }
  if (parsed.protocol !== "https:" || !(parsed.hostname === "intasend.com" || parsed.hostname.endsWith(".intasend.com"))) {
    throw new Error("IntaSend returned an unsafe subscription setup URL.");
  }
  return parsed.toString();
}

async function retrieveProviderSubscription(externalId: string) {
  return requestJson<IntaSendSubscription>(`/subscriptions/${encodeURIComponent(externalId)}/`);
}

export async function createOrResumeIntaSendSubscription(input: {
  pharmacyId: string;
  subscriptionId: string;
  actorId?: string | null;
}) {
  if (!intasendSubscriptionConfigured()) {
    throw new Error(
      "Recurring card billing is not configured. Set INTASEND_SECRET_KEY, INTASEND_SUBSCRIPTION_PLAN_ID and INTASEND_WEBHOOK_CHALLENGE.",
    );
  }
  const origin = appOrigin();
  if (!origin) throw new Error("NEXT_PUBLIC_APP_URL is required for recurring card billing.");

  const local = await db.subscription.findFirst({
    where: { id: input.subscriptionId, pharmacyId: input.pharmacyId },
    include: { plan: true },
  });
  if (!local) throw new Error("subscription_not_found");
  if (local.status === "cancelled") throw new Error("This subscription has already been cancelled.");

  if (local.externalSubscriptionId) {
    const existing = await retrieveProviderSubscription(local.externalSubscriptionId);
    if (existing.reference && existing.reference !== local.id) {
      throw new Error("IntaSend subscription reference does not match this pharmacy subscription.");
    }
    const setupUrl = validateSetupUrl(existing.setup_url);
    return {
      subscriptionId: local.id,
      externalSubscriptionId: local.externalSubscriptionId,
      setupUrl,
      providerStatus: existing.status || "UNKNOWN",
      resumed: true,
      active: String(existing.status || "").toUpperCase() === "ACTIVE",
    };
  }

  const customer = await ensureCustomer(input.pharmacyId);
  const planId = intasendSubscriptionPlanId();
  if (!planId) throw new Error("INTASEND_SUBSCRIPTION_PLAN_ID is missing.");

  const firstInvoice = await db.invoice.findFirst({
    where: { subscriptionId: local.id },
    orderBy: { periodStart: "asc" },
  });
  const firstChargeDate = firstInvoice && Number(firstInvoice.totalKes) === 0
    ? firstInvoice.periodEnd
    : new Date();

  const created = await requestJson<IntaSendSubscription>("/subscriptions/", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customer.customer_id,
      plan_id: planId,
      reference: local.id,
      start_date: kenyaDate(firstChargeDate),
      redirect_url: `${origin}/onboard/billing?subscription=returned`,
    }),
  });

  if (!created.subscription_id) throw new Error("IntaSend did not return a subscription ID.");
  const setupUrl = validateSetupUrl(created.setup_url);
  if (!setupUrl) throw new Error("IntaSend did not return the secure card setup URL.");

  await db.subscription.update({
    where: { id: local.id },
    data: { externalSubscriptionId: created.subscription_id },
  });

  await recordAuditRequired({
    actorId: input.actorId,
    action: "billing.subscription.intasend.created",
    resource: "subscription",
    resourceId: local.id,
    tenantId: input.pharmacyId,
    details: {
      externalSubscriptionId: created.subscription_id,
      planId,
      startDate: kenyaDate(firstChargeDate),
      paymentMethod: "CARD-PAYMENT",
    },
  });

  return {
    subscriptionId: local.id,
    externalSubscriptionId: created.subscription_id,
    setupUrl,
    providerStatus: created.status || "PENDING",
    resumed: false,
    active: false,
  };
}

export async function cancelIntaSendSubscription(externalSubscriptionId: string) {
  if (!secretKey()) throw new Error("INTASEND_SECRET_KEY is missing; recurring billing cannot be cancelled safely.");
  return requestJson<IntaSendSubscription>(
    `/subscriptions/${encodeURIComponent(externalSubscriptionId)}/unsubscribe/`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

function latestPayment(event: IntaSendSubscriptionEvent) {
  const payments = (event.payments || []).filter((p) => p.invoice?.invoice_id);
  return payments.sort((a, b) => {
    const left = Date.parse(a.invoice?.updated_at || a.updated_at || a.invoice?.created_at || a.created_at || "") || 0;
    const right = Date.parse(b.invoice?.updated_at || b.updated_at || b.invoice?.created_at || b.created_at || "") || 0;
    return right - left;
  })[0];
}

function amountMatches(expected: number, received: unknown) {
  const amount = Number(received);
  return Number.isFinite(amount) && Math.abs(expected - amount) <= 0.01;
}

async function ensureInvoiceForProviderCycle(input: {
  subscriptionId: string;
  pharmacyId: string;
  completedCycles: number;
  paymentAt: Date;
}) {
  const open = await db.invoice.findFirst({
    where: {
      subscriptionId: input.subscriptionId,
      pharmacyId: input.pharmacyId,
      status: "open",
      totalKes: { gt: 0 },
    },
    orderBy: { periodStart: "asc" },
  });
  if (open) return open;

  const succeededCycles = await db.billingPayment.count({
    where: {
      pharmacyId: input.pharmacyId,
      provider: "intasend_subscription",
      status: "succeeded",
      invoice: { subscriptionId: input.subscriptionId },
    },
  });

  const sub = await db.subscription.findUnique({ where: { id: input.subscriptionId } });
  if (!sub || sub.status === "cancelled") return null;
  const nearOrPastRenewal = input.paymentAt.getTime() >= sub.currentPeriodEnd.getTime() - 36 * 60 * 60 * 1000;
  if (input.completedCycles <= succeededCycles && !nearOrPastRenewal) return null;

  const start = sub.currentPeriodEnd;
  const end = nextBillingMonth(start);
  const claimed = await db.subscription.updateMany({
    where: {
      id: sub.id,
      currentPeriodEnd: sub.currentPeriodEnd,
      status: { not: "cancelled" },
    },
    data: {
      currentPeriodStart: start,
      currentPeriodEnd: end,
      status: "past_due",
    },
  });
  if (claimed.count === 0) {
    return db.invoice.findFirst({
      where: { subscriptionId: sub.id, status: "open", totalKes: { gt: 0 } },
      orderBy: { periodStart: "asc" },
    });
  }
  return issueSubscriptionInvoice(sub.id, { start, end });
}

async function saveCardSummary(pharmacyId: string, event: IntaSendSubscriptionEvent) {
  const last4 = String(event.card_mask || "").replace(/\D/g, "").slice(-4) || null;
  const cardType = safePersonName(String(event.card_type || "Card"), "Card");
  await db.billingPaymentMethod.updateMany({
    where: { pharmacyId, isDefault: true },
    data: { isDefault: false },
  });
  const existing = await db.billingPaymentMethod.findFirst({
    where: { pharmacyId, type: "card" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await db.billingPaymentMethod.update({
      where: { id: existing.id },
      data: { label: `IntaSend ${cardType}`, last4, mpesaPhone: null, isDefault: true },
    });
  } else {
    await db.billingPaymentMethod.create({
      data: {
        pharmacyId,
        type: "card",
        label: `IntaSend ${cardType}`,
        last4,
        isDefault: true,
      },
    });
  }
}

export function isIntaSendSubscriptionEvent(body: unknown): body is IntaSendSubscriptionEvent {
  return Boolean(body && typeof body === "object" && "subscription_id" in body);
}

export async function processIntaSendSubscriptionWebhookEvent(event: IntaSendSubscriptionEvent) {
  const externalSubscriptionId = String(event.subscription_id || "").trim();
  const reference = String(event.reference || "").trim();
  if (!externalSubscriptionId) return { status: 400, note: "missing_subscription_id" };

  const local = reference
    ? await db.subscription.findFirst({
        where: { id: reference },
        include: { plan: true },
      })
    : await db.subscription.findFirst({
        where: { externalSubscriptionId },
        include: { plan: true },
      });
  if (!local) return { status: 200, note: "subscription_not_found" };

  if (local.externalSubscriptionId && local.externalSubscriptionId !== externalSubscriptionId) {
    return { status: 409, note: "subscription_reference_mismatch" };
  }
  if (!local.externalSubscriptionId) {
    await db.subscription.update({
      where: { id: local.id },
      data: { externalSubscriptionId },
    });
  }

  const configuredPlanId = intasendSubscriptionPlanId();
  const eventPlanId = String(event.plan?.plan_id || "").trim();
  const expectedAmount = Number(local.plan.priceKes);
  if (
    !configuredPlanId ||
    !eventPlanId ||
    eventPlanId !== configuredPlanId ||
    event.plan?.currency !== "KES" ||
    !amountMatches(expectedAmount, event.plan?.amount) ||
    String(event.payment_method || "").toUpperCase() !== "CARD-PAYMENT"
  ) {
    return { status: 202, note: "subscription_evidence_mismatch" };
  }

  const providerStatus = String(event.status || "").toUpperCase();
  if (providerStatus === "CANCELED") {
    await db.subscription.update({
      where: { id: local.id },
      data: { cancelAt: local.cancelAt || local.currentPeriodEnd },
    });
  }

  const payment = latestPayment(event);
  const providerInvoiceId = String(payment?.invoice?.invoice_id || "").trim();
  const paymentState = String(payment?.invoice?.state || "").toUpperCase();
  const providerUpdatedAt = payment?.invoice?.updated_at || payment?.updated_at || event.updated_at || "current";

  const inbound = await recordInboundWebhook({
    pharmacyId: local.pharmacyId,
    provider: "intasend",
    providerEventId: `${externalSubscriptionId}:${providerInvoiceId || "subscription"}:${paymentState || providerStatus}:${providerUpdatedAt}`,
    eventType: `subscription.${(paymentState || providerStatus || "update").toLowerCase()}`,
    payload: event,
  });
  if (inbound.duplicate && inbound.event.status === "delivered") {
    return { status: 200, note: "duplicate" };
  }

  if (!payment || !providerInvoiceId || !["PENDING", "PROCESSING", "COMPLETE", "FAILED"].includes(paymentState)) {
    await markWebhookProcessed(inbound.event.id);
    return { status: 200, note: providerStatus === "CANCELED" ? "cancelled" : "subscription_updated" };
  }

  if (payment.invoice?.currency !== "KES") {
    await markWebhookProcessed(inbound.event.id, "currency_mismatch");
    return { status: 202, note: "currency_mismatch" };
  }
  if (paymentState === "COMPLETE" && !amountMatches(expectedAmount, payment.invoice?.value)) {
    await markWebhookProcessed(inbound.event.id, "amount_mismatch");
    return { status: 202, note: "amount_mismatch" };
  }

  const paymentAt = new Date(payment.invoice?.created_at || payment.created_at || Date.now());
  const invoice = await ensureInvoiceForProviderCycle({
    subscriptionId: local.id,
    pharmacyId: local.pharmacyId,
    completedCycles: Number(event.completed_cycles || 0),
    paymentAt: Number.isNaN(paymentAt.getTime()) ? new Date() : paymentAt,
  });

  if (!invoice) {
    await markWebhookProcessed(inbound.event.id, "local_invoice_not_ready");
    return { status: 202, note: "local_invoice_not_ready" };
  }
  if (Number(invoice.totalKes) <= 0) {
    await markWebhookProcessed(inbound.event.id, "provider_charge_during_waived_cycle");
    return { status: 202, note: "provider_charge_during_waived_cycle" };
  }

  let billingPayment = await db.billingPayment.findFirst({
    where: {
      pharmacyId: local.pharmacyId,
      provider: "intasend_subscription",
      providerRef: providerInvoiceId,
    },
  });

  const failureReason = String(payment.invoice?.failed_reason || event.fail_reason || "IntaSend recurring card payment failed").slice(0, 250);
  const nextStatus = paymentState === "COMPLETE"
    ? "succeeded"
    : paymentState === "FAILED"
      ? "failed"
      : paymentState === "PROCESSING"
        ? "processing"
        : "pending";

  if (billingPayment) {
    billingPayment = await db.billingPayment.update({
      where: { id: billingPayment.id },
      data: {
        invoiceId: invoice.id,
        status: nextStatus,
        amountKes: expectedAmount,
        checkoutRequestId: externalSubscriptionId,
        failureReason: paymentState === "FAILED" ? failureReason : null,
        paidAt: paymentState === "COMPLETE" ? new Date() : null,
      },
    });
  } else {
    billingPayment = await db.billingPayment.create({
      data: {
        pharmacyId: local.pharmacyId,
        invoiceId: invoice.id,
        provider: "intasend_subscription",
        status: nextStatus,
        amountKes: expectedAmount,
        checkoutRequestId: externalSubscriptionId,
        providerRef: providerInvoiceId,
        failureReason: paymentState === "FAILED" ? failureReason : null,
        paidAt: paymentState === "COMPLETE" ? new Date() : null,
      },
    });
  }

  if (paymentState === "COMPLETE") {
    await saveCardSummary(local.pharmacyId, event);
    await markInvoicePaid(invoice.id);
    await db.subscription.update({
      where: { id: local.id },
      data: { status: "active" },
    });
    await db.pharmacy.updateMany({
      where: {
        id: local.pharmacyId,
        lifecycleStatus: { in: ["onboarding", "past_due", "restricted"] },
      },
      data: { lifecycleStatus: "active", restrictedAt: null },
    });
    await recordAuditRequired({
      action: "billing.subscription.intasend.paid",
      resource: "invoice",
      resourceId: invoice.id,
      tenantId: local.pharmacyId,
      details: {
        subscriptionId: local.id,
        externalSubscriptionId,
        providerInvoiceId,
        billingPaymentId: billingPayment.id,
        completedCycles: event.completed_cycles || 0,
      },
    });
    await markWebhookProcessed(inbound.event.id);
    return { status: 200, note: "settled" };
  }

  if (paymentState === "FAILED") {
    await db.subscription.update({ where: { id: local.id }, data: { status: "past_due" } });
    await db.pharmacy.updateMany({
      where: { id: local.pharmacyId, lifecycleStatus: { notIn: ["suspended", "archived", "deleted"] } },
      data: { lifecycleStatus: "past_due" },
    });
    await markWebhookProcessed(inbound.event.id);
    return { status: 200, note: "failed" };
  }

  await markWebhookProcessed(inbound.event.id);
  return { status: 200, note: paymentState.toLowerCase() };
}
