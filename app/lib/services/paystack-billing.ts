import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { prismaUnscoped as db } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { issueSubscriptionInvoice, markInvoicePaid } from "@/app/lib/platform/billing";
import { MONTHLY_FEE_KES, nextBillingMonth } from "@/app/lib/platform/pricing";
import { markWebhookProcessed, recordInboundWebhook } from "@/app/lib/platform/webhooks";

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };
type PaystackPlan = {
  plan_code?: string;
  name?: string;
  interval?: string;
  amount?: number;
  currency?: string;
};
type PaystackAuthorization = {
  authorization_code?: string;
  last4?: string;
  card_type?: string;
  brand?: string;
  channel?: string;
  reusable?: boolean;
};
type PaystackTransaction = {
  id?: number;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  paid_at?: string;
  plan?: PaystackPlan | string | null;
  metadata?: unknown;
  customer?: { email?: string; customer_code?: string } | null;
  authorization?: PaystackAuthorization | null;
};
type PaystackSubscription = {
  subscription_code?: string;
  email_token?: string;
  status?: string;
  amount?: number;
  next_payment_date?: string | null;
  plan?: PaystackPlan | number | null;
  customer?: { email?: string; customer_code?: string } | number | null;
  authorization?: PaystackAuthorization | null;
};
type PaystackCheckout = {
  authorization_url?: string;
  access_code?: string;
  reference?: string;
};
export type PaystackWebhookEvent = { event?: string; data?: any };

const API_BASE = "https://api.paystack.co";
const PROVIDER_PREFIX = "paystack:";

function secretKey() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || null;
}

export function paystackPlanCode() {
  return process.env.PAYSTACK_SUBSCRIPTION_PLAN_CODE?.trim() || null;
}

export function paystackCheckoutConfigured() {
  return Boolean(secretKey());
}

export function paystackSubscriptionConfigured() {
  return Boolean(secretKey() && paystackPlanCode());
}

function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  return host ? `https://${host.replace(/^https?:\/\//, "")}` : null;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const key = secretKey();
  if (!key) throw new Error("Paystack is not configured. Add PAYSTACK_SECRET_KEY.");
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
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
    console.error("[paystack] request failed", path, error);
    throw new Error("Paystack could not be reached. Try again shortly.");
  }

  const body = (await response.json().catch(() => ({}))) as PaystackEnvelope<T> & { message?: string };
  if (!response.ok || body.status === false) {
    const message = String(body.message || `HTTP ${response.status}`).slice(0, 220);
    throw new Error(`Paystack rejected the request: ${message}`);
  }
  return body.data;
}

function validateCheckoutUrl(value: string | null | undefined) {
  if (!value) throw new Error("Paystack did not return a checkout URL.");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || !(parsed.hostname === "paystack.com" || parsed.hostname.endsWith(".paystack.com"))) {
    throw new Error("Paystack returned an unsafe checkout URL.");
  }
  return parsed.toString();
}

function externalCode(value: string | null | undefined) {
  if (!value) return null;
  return value.startsWith(PROVIDER_PREFIX) ? value.slice(PROVIDER_PREFIX.length) : null;
}

function providerExternal(code: string) {
  return `${PROVIDER_PREFIX}${code}`;
}

function extractPlanCode(plan: PaystackPlan | string | number | null | undefined) {
  if (!plan) return null;
  if (typeof plan === "string") return plan.startsWith("PLN_") ? plan : null;
  if (typeof plan === "number") return null;
  return plan.plan_code || null;
}

function amountMatchesKes(expectedKes: number, receivedSubunit: unknown) {
  const amount = Number(receivedSubunit);
  return Number.isFinite(amount) && amount === Math.round(expectedKes * 100);
}

function normalizedEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

async function billingEmail(pharmacyId: string) {
  const pharmacy = await db.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: { owner: { select: { email: true } } },
  });
  if (!pharmacy) throw new Error("pharmacy_not_found");
  const email = normalizedEmail(pharmacy.email || pharmacy.owner?.email);
  if (!email) throw new Error("Add a verified billing email before setting up card billing.");
  return { pharmacy, email };
}

async function assertMonthlyPlan() {
  const code = paystackPlanCode();
  if (!code) throw new Error("PAYSTACK_SUBSCRIPTION_PLAN_CODE is missing.");
  const plan = await requestJson<PaystackPlan>(`/plan/${encodeURIComponent(code)}`);
  if (
    plan.plan_code !== code ||
    String(plan.interval || "").toLowerCase() !== "monthly" ||
    String(plan.currency || "").toUpperCase() !== "KES" ||
    !amountMatchesKes(MONTHLY_FEE_KES, plan.amount)
  ) {
    throw new Error(`Paystack plan ${code} must be KES ${MONTHLY_FEE_KES}/month before billing can go live.`);
  }
  return plan;
}

async function saveCardSummary(pharmacyId: string, authorization?: PaystackAuthorization | null) {
  if (!authorization || String(authorization.channel || "").toLowerCase() !== "card") return;
  const last4 = String(authorization.last4 || "").replace(/\D/g, "").slice(-4) || null;
  const brand = String(authorization.brand || authorization.card_type || "Card").replace(/[^a-zA-Z0-9 _-]/g, " ").trim().slice(0, 40) || "Card";
  await db.billingPaymentMethod.updateMany({ where: { pharmacyId, isDefault: true }, data: { isDefault: false } });
  const existing = await db.billingPaymentMethod.findFirst({ where: { pharmacyId, type: "card" }, orderBy: { createdAt: "desc" } });
  if (existing) {
    await db.billingPaymentMethod.update({
      where: { id: existing.id },
      data: { label: `Paystack ${brand}`, last4, mpesaPhone: null, isDefault: true },
    });
  } else {
    await db.billingPaymentMethod.create({
      data: { pharmacyId, type: "card", label: `Paystack ${brand}`, last4, isDefault: true },
    });
  }
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  const key = secretKey();
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function initializeTransaction(input: {
  email: string;
  amountKes: number;
  reference: string;
  metadata: Record<string, string>;
  plan?: string;
}) {
  const origin = appOrigin();
  if (!origin) throw new Error("NEXT_PUBLIC_APP_URL is required for Paystack billing.");
  return requestJson<PaystackCheckout>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: String(Math.round(input.amountKes * 100)),
      currency: "KES",
      channels: ["card"],
      reference: input.reference,
      callback_url: `${origin}/api/payments/paystack/callback`,
      ...(input.plan ? { plan: input.plan } : {}),
      metadata: JSON.stringify(input.metadata),
    }),
  });
}

export async function createPaystackInvoiceCheckout(input: {
  invoiceId: string;
  actorId?: string | null;
}) {
  if (!paystackCheckoutConfigured()) throw new Error("Paystack card checkout is not configured.");
  const invoice = await db.invoice.findUnique({ where: { id: input.invoiceId }, include: { pharmacy: { include: { owner: { select: { email: true } } } } } });
  if (!invoice) throw new Error("invoice_not_found");
  if (invoice.status === "paid") return { alreadyPaid: true as const, resumed: false as const, url: null };
  if (invoice.status !== "open" || Number(invoice.totalKes) <= 0) throw new Error("invoice_not_collectible");

  const email = normalizedEmail(invoice.pharmacy.email || invoice.pharmacy.owner?.email);
  if (!email) throw new Error("A billing email is required before card checkout.");

  const pending = await db.billingPayment.findFirst({
    where: { invoiceId: invoice.id, provider: "paystack", status: { in: ["pending", "processing"] } },
    orderBy: { createdAt: "desc" },
  });
  if (pending?.providerRef?.startsWith("https://")) {
    return { alreadyPaid: false as const, resumed: true as const, url: pending.providerRef };
  }

  const payment = await db.billingPayment.create({
    data: { pharmacyId: invoice.pharmacyId, invoiceId: invoice.id, provider: "paystack", status: "pending", amountKes: invoice.totalKes },
  });
  const reference = `AETHER-${payment.id}`;
  try {
    const checkout = await initializeTransaction({
      email,
      amountKes: Number(invoice.totalKes),
      reference,
      metadata: { kind: "platform_invoice", pharmacy_id: invoice.pharmacyId, invoice_id: invoice.id, payment_id: payment.id },
    });
    const url = validateCheckoutUrl(checkout.authorization_url);
    await db.billingPayment.update({ where: { id: payment.id }, data: { status: "processing", checkoutRequestId: checkout.reference || reference, providerRef: url } });
    await recordAuditRequired({ actorId: input.actorId, action: "billing.invoice.paystack.checkout", resource: "invoice", resourceId: invoice.id, tenantId: invoice.pharmacyId, details: { paymentId: payment.id, reference: checkout.reference || reference } });
    return { alreadyPaid: false as const, resumed: false as const, url };
  } catch (error) {
    await db.billingPayment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: String(error instanceof Error ? error.message : error).slice(0, 250) } });
    throw error;
  }
}

async function fetchProviderSubscription(code: string) {
  return requestJson<PaystackSubscription>(`/subscription/${encodeURIComponent(code)}`);
}

async function tryCreateDeferredSubscription(input: { subscriptionId: string; pharmacyId: string; email: string; startDate: Date }) {
  const plan = paystackPlanCode();
  if (!plan) throw new Error("PAYSTACK_SUBSCRIPTION_PLAN_CODE is missing.");
  try {
    const created = await requestJson<PaystackSubscription>("/subscription", {
      method: "POST",
      body: JSON.stringify({ customer: input.email, plan, start_date: input.startDate.toISOString() }),
    });
    if (!created.subscription_code) throw new Error("Paystack did not return a subscription code.");
    await db.subscription.update({ where: { id: input.subscriptionId }, data: { externalSubscriptionId: providerExternal(created.subscription_code) } });
    await saveCardSummary(input.pharmacyId, created.authorization);
    return { externalSubscriptionId: providerExternal(created.subscription_code), active: String(created.status || "").toLowerCase() === "active", deferred: false };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("no saved authorizations") || message.includes("no active authorizations") || message.includes("hasn't made") || message.includes("has not made")) {
      return { externalSubscriptionId: null, active: true, deferred: true };
    }
    throw error;
  }
}

export async function createOrResumePaystackSubscription(input: {
  pharmacyId: string;
  subscriptionId: string;
  actorId?: string | null;
}) {
  if (!paystackSubscriptionConfigured()) throw new Error("Recurring card billing is not configured. Add PAYSTACK_SECRET_KEY and PAYSTACK_SUBSCRIPTION_PLAN_CODE.");
  await assertMonthlyPlan();
  const local = await db.subscription.findFirst({ where: { id: input.subscriptionId, pharmacyId: input.pharmacyId }, include: { plan: true } });
  if (!local) throw new Error("subscription_not_found");
  if (local.status === "cancelled") throw new Error("This subscription has already been cancelled.");
  const { email } = await billingEmail(input.pharmacyId);

  const code = externalCode(local.externalSubscriptionId);
  if (code) {
    const provider = await fetchProviderSubscription(code);
    return { active: ["active", "non-renewing", "attention"].includes(String(provider.status || "").toLowerCase()), resumed: true, deferred: false, setupUrl: null, externalSubscriptionId: local.externalSubscriptionId };
  }
  if (local.externalSubscriptionId) {
    await db.subscription.update({ where: { id: local.id }, data: { externalSubscriptionId: null } });
  }

  const firstInvoice = await db.invoice.findFirst({ where: { subscriptionId: local.id }, orderBy: { periodStart: "asc" } });
  if (!firstInvoice) throw new Error("Monthly invoice is missing.");

  if (Number(firstInvoice.totalKes) === 0) {
    const deferred = await tryCreateDeferredSubscription({ subscriptionId: local.id, pharmacyId: input.pharmacyId, email, startDate: firstInvoice.periodEnd });
    await recordAuditRequired({ actorId: input.actorId, action: "billing.subscription.paystack.deferred", resource: "subscription", resourceId: local.id, tenantId: input.pharmacyId, details: { startDate: firstInvoice.periodEnd.toISOString(), providerSubscriptionCreated: Boolean(deferred.externalSubscriptionId) } });
    return { ...deferred, resumed: false, setupUrl: null };
  }

  const pending = await db.billingPayment.findFirst({
    where: { invoiceId: firstInvoice.id, provider: "paystack_subscription_setup", status: { in: ["pending", "processing"] } },
    orderBy: { createdAt: "desc" },
  });
  if (pending?.providerRef?.startsWith("https://")) {
    return { active: false, resumed: true, deferred: false, setupUrl: pending.providerRef, externalSubscriptionId: null };
  }

  const payment = await db.billingPayment.create({
    data: { pharmacyId: input.pharmacyId, invoiceId: firstInvoice.id, provider: "paystack_subscription_setup", status: "pending", amountKes: firstInvoice.totalKes },
  });
  const reference = `AETHER-SUB-${payment.id}`;
  try {
    const checkout = await initializeTransaction({
      email,
      amountKes: Number(firstInvoice.totalKes),
      reference,
      plan: paystackPlanCode()!,
      metadata: { kind: "subscription_setup", pharmacy_id: input.pharmacyId, subscription_id: local.id, invoice_id: firstInvoice.id, payment_id: payment.id },
    });
    const url = validateCheckoutUrl(checkout.authorization_url);
    await db.billingPayment.update({ where: { id: payment.id }, data: { status: "processing", checkoutRequestId: checkout.reference || reference, providerRef: url } });
    await recordAuditRequired({ actorId: input.actorId, action: "billing.subscription.paystack.checkout", resource: "subscription", resourceId: local.id, tenantId: input.pharmacyId, details: { paymentId: payment.id, reference: checkout.reference || reference, planCode: paystackPlanCode() } });
    return { active: false, resumed: false, deferred: false, setupUrl: url, externalSubscriptionId: null };
  } catch (error) {
    await db.billingPayment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: String(error instanceof Error ? error.message : error).slice(0, 250) } });
    throw error;
  }
}

export async function paystackManageSubscriptionLink(externalSubscriptionId: string) {
  const code = externalCode(externalSubscriptionId);
  if (!code) throw new Error("This subscription is not managed by Paystack.");
  const result = await requestJson<{ link?: string }>(`/subscription/${encodeURIComponent(code)}/manage/link`);
  return validateCheckoutUrl(result.link);
}

export async function cancelPaystackSubscription(externalSubscriptionId: string) {
  const code = externalCode(externalSubscriptionId);
  if (!code) throw new Error("This subscription is not managed by Paystack.");
  const subscription = await fetchProviderSubscription(code);
  if (!subscription.email_token) throw new Error("Paystack did not return the cancellation token. Try again shortly.");
  await requestJson<unknown>("/subscription/disable", {
    method: "POST",
    body: JSON.stringify({ code, token: subscription.email_token }),
  });
}

async function verifyTransaction(reference: string) {
  return requestJson<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function verifyAndProcessPaystackReference(reference: string) {
  const payment = await db.billingPayment.findFirst({
    where: { checkoutRequestId: reference, provider: { in: ["paystack", "paystack_subscription_setup"] } },
    include: { invoice: true },
  });
  if (!payment) return { ok: true, note: "payment_not_found" };
  if (payment.status === "succeeded") return { ok: true, note: "already_settled" };

  const tx = await verifyTransaction(reference);
  if (String(tx.status || "").toLowerCase() !== "success") return { ok: false, note: "not_successful" };
  if (String(tx.currency || "").toUpperCase() !== "KES" || !amountMatchesKes(Number(payment.amountKes), tx.amount)) {
    return { ok: false, note: "payment_evidence_mismatch" };
  }
  if (String(tx.channel || tx.authorization?.channel || "").toLowerCase() !== "card") {
    return { ok: false, note: "non_card_payment_rejected" };
  }
  if (payment.provider === "paystack_subscription_setup") {
    const eventPlan = extractPlanCode(tx.plan);
    if (eventPlan && eventPlan !== paystackPlanCode()) return { ok: false, note: "plan_mismatch" };
  }

  await db.billingPayment.update({
    where: { id: payment.id },
    data: { status: "succeeded", providerRef: String(tx.id || reference), paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(), failureReason: null },
  });
  await saveCardSummary(payment.pharmacyId, tx.authorization);
  await markInvoicePaid(payment.invoiceId);
  if (payment.invoice.subscriptionId) {
    await db.subscription.updateMany({ where: { id: payment.invoice.subscriptionId, status: { not: "cancelled" } }, data: { status: "active" } });
  }
  await recordAuditRequired({ action: "billing.paystack.paid", resource: "invoice", resourceId: payment.invoiceId, tenantId: payment.pharmacyId, details: { paymentId: payment.id, reference, transactionId: tx.id || null } });
  return { ok: true, note: "settled" };
}

async function bindCreatedSubscription(data: any) {
  const code = String(data?.subscription_code || "").trim();
  const planCode = extractPlanCode(data?.plan);
  const email = normalizedEmail(data?.customer?.email);
  if (!code || !email || planCode !== paystackPlanCode()) return null;

  const already = await db.subscription.findFirst({ where: { externalSubscriptionId: providerExternal(code) } });
  if (already) return already;

  const recent = await db.billingPayment.findMany({
    where: { provider: "paystack_subscription_setup", status: "succeeded" },
    orderBy: { paidAt: "desc" },
    take: 25,
    include: {
      invoice: {
        include: {
          subscription: {
            include: { pharmacy: { include: { owner: { select: { email: true } } } } },
          },
        },
      },
    },
  });
  const matched = recent.find((row) => {
    const sub = row.invoice.subscription;
    if (!sub || sub.status === "cancelled") return false;
    const localEmail = normalizedEmail(sub.pharmacy.email || sub.pharmacy.owner?.email);
    return localEmail === email && !externalCode(sub.externalSubscriptionId);
  })?.invoice.subscription;
  if (!matched) return null;

  const next = data?.next_payment_date ? new Date(data.next_payment_date) : null;
  const updated = await db.subscription.update({
    where: { id: matched.id },
    data: {
      externalSubscriptionId: providerExternal(code),
      status: "active",
      ...(next && !Number.isNaN(next.getTime()) ? { currentPeriodEnd: next } : {}),
    },
  });
  await saveCardSummary(updated.pharmacyId, data?.authorization);
  return updated;
}

async function ensureInvoiceForRecurringCharge(local: { id: string; pharmacyId: string; currentPeriodEnd: Date; status: string }, paymentAt: Date) {
  const open = await db.invoice.findFirst({
    where: { subscriptionId: local.id, pharmacyId: local.pharmacyId, status: "open", totalKes: { gt: 0 } },
    orderBy: { periodStart: "asc" },
  });
  if (open) return open;
  if (paymentAt.getTime() < local.currentPeriodEnd.getTime() - 36 * 60 * 60 * 1000) return null;

  const start = local.currentPeriodEnd;
  const end = nextBillingMonth(start);
  const claimed = await db.subscription.updateMany({
    where: { id: local.id, currentPeriodEnd: local.currentPeriodEnd, status: { not: "cancelled" } },
    data: { currentPeriodStart: start, currentPeriodEnd: end, status: "past_due" },
  });
  if (!claimed.count) {
    return db.invoice.findFirst({ where: { subscriptionId: local.id, status: "open", totalKes: { gt: 0 } }, orderBy: { periodStart: "asc" } });
  }
  return issueSubscriptionInvoice(local.id, { start, end });
}

async function processRecurringInvoice(eventName: string, data: any) {
  const code = String(data?.subscription?.subscription_code || data?.subscription_code || "").trim();
  if (!code) return { status: 200, note: "missing_subscription_code" };
  const local = await db.subscription.findFirst({ where: { externalSubscriptionId: providerExternal(code) } });
  if (!local) return { status: 200, note: "subscription_not_found" };

  const providerSub = await fetchProviderSubscription(code);
  const providerPlanCode = extractPlanCode(providerSub.plan);
  if (providerPlanCode && providerPlanCode !== paystackPlanCode()) return { status: 202, note: "plan_mismatch" };
  if (providerSub.amount != null && !amountMatchesKes(MONTHLY_FEE_KES, providerSub.amount)) return { status: 202, note: "amount_mismatch" };

  const inbound = await recordInboundWebhook({
    pharmacyId: local.pharmacyId,
    provider: "paystack",
    providerEventId: `${eventName}:${code}:${String(data?.invoice_code || data?.transaction?.reference || data?.created_at || "current")}`,
    eventType: eventName,
    payload: data,
  });
  if (inbound.duplicate && inbound.event.status === "delivered") return { status: 200, note: "duplicate" };

  const paymentAtRaw = data?.paid_at || data?.created_at || data?.transaction?.paid_at || Date.now();
  const paymentAt = new Date(paymentAtRaw);
  const invoice = await ensureInvoiceForRecurringCharge(local, Number.isNaN(paymentAt.getTime()) ? new Date() : paymentAt);
  if (!invoice) {
    await markWebhookProcessed(inbound.event.id, "local_invoice_not_ready");
    return { status: 202, note: "local_invoice_not_ready" };
  }

  const isPaid = eventName === "invoice.update" && (data?.paid === true || String(data?.status || "").toLowerCase() === "success") && String(data?.transaction?.status || "success").toLowerCase() === "success";
  const isFailed = eventName === "invoice.payment_failed" || String(data?.status || "").toLowerCase() === "failed";
  const providerInvoice = String(data?.invoice_code || data?.transaction?.reference || `${code}:${invoice.periodStart.toISOString()}`);

  let payment = await db.billingPayment.findFirst({ where: { pharmacyId: local.pharmacyId, provider: "paystack_subscription", providerRef: providerInvoice } });
  const status = isPaid ? "succeeded" : isFailed ? "failed" : "processing";
  const failureReason = String(data?.description || data?.gateway_response || "Paystack recurring card payment failed").slice(0, 250);
  if (payment) {
    payment = await db.billingPayment.update({ where: { id: payment.id }, data: { invoiceId: invoice.id, status, amountKes: invoice.totalKes, checkoutRequestId: code, failureReason: isFailed ? failureReason : null, paidAt: isPaid ? new Date() : null } });
  } else {
    payment = await db.billingPayment.create({ data: { pharmacyId: local.pharmacyId, invoiceId: invoice.id, provider: "paystack_subscription", status, amountKes: invoice.totalKes, checkoutRequestId: code, providerRef: providerInvoice, failureReason: isFailed ? failureReason : null, paidAt: isPaid ? new Date() : null } });
  }

  if (isPaid) {
    await saveCardSummary(local.pharmacyId, data?.authorization);
    await markInvoicePaid(invoice.id);
    const next = providerSub.next_payment_date ? new Date(providerSub.next_payment_date) : null;
    await db.subscription.update({ where: { id: local.id }, data: { status: "active", ...(next && !Number.isNaN(next.getTime()) ? { currentPeriodEnd: next } : {}) } });
    await db.pharmacy.updateMany({ where: { id: local.pharmacyId, lifecycleStatus: { in: ["onboarding", "past_due", "restricted"] } }, data: { lifecycleStatus: "active", restrictedAt: null } });
    await markWebhookProcessed(inbound.event.id);
    return { status: 200, note: "settled" };
  }

  if (isFailed) {
    await db.subscription.update({ where: { id: local.id }, data: { status: "past_due" } });
    await db.pharmacy.updateMany({ where: { id: local.pharmacyId, lifecycleStatus: { notIn: ["suspended", "archived", "deleted"] } }, data: { lifecycleStatus: "past_due" } });
    await markWebhookProcessed(inbound.event.id);
    return { status: 200, note: "failed" };
  }

  await markWebhookProcessed(inbound.event.id);
  return { status: 200, note: "processing" };
}

export async function processPaystackWebhookEvent(event: PaystackWebhookEvent) {
  const name = String(event.event || "").trim();
  const data = event.data || {};

  if (name === "charge.success") {
    const reference = String(data.reference || "").trim();
    if (!reference) return { status: 200, note: "missing_reference" };
    const result = await verifyAndProcessPaystackReference(reference);
    return { status: result.ok ? 200 : 202, note: result.note };
  }

  if (name === "subscription.create") {
    const local = await bindCreatedSubscription(data);
    if (!local) return { status: 200, note: "subscription_not_matched" };
    await recordAuditRequired({ action: "billing.subscription.paystack.created", resource: "subscription", resourceId: local.id, tenantId: local.pharmacyId, details: { externalSubscriptionId: local.externalSubscriptionId, planCode: paystackPlanCode() } });
    return { status: 200, note: "subscription_bound" };
  }

  if (name === "invoice.update" || name === "invoice.payment_failed") {
    return processRecurringInvoice(name, data);
  }

  if (name === "subscription.not_renew" || name === "subscription.disable") {
    const code = String(data?.subscription_code || "").trim();
    if (!code) return { status: 200, note: "missing_subscription_code" };
    const local = await db.subscription.findFirst({ where: { externalSubscriptionId: providerExternal(code) } });
    if (!local) return { status: 200, note: "subscription_not_found" };
    await db.subscription.update({ where: { id: local.id }, data: { cancelAt: local.cancelAt || local.currentPeriodEnd } });
    return { status: 200, note: name === "subscription.disable" ? "disabled" : "not_renewing" };
  }

  return { status: 200, note: "ignored_event" };
}
