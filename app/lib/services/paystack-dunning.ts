import "server-only";

import { prismaUnscoped as db } from "@/app/lib/db";
import { markInvoicePaid } from "@/app/lib/platform/billing";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { recordLifecycle } from "@/app/lib/platform/lifecycle";

const API_BASE = "https://api.paystack.co";
const RETRY_PROVIDER = "paystack_retry";
const RETRY_DAYS = new Set([2, 5, 9, 13]);
export const SUBSCRIPTION_GRACE_DAYS = 14;
const DAY_MS = 86_400_000;

type PaystackEnvelope<T> = { status: boolean; message?: string; data: T };
type PaystackAuthorization = {
  authorization_code?: string;
  reusable?: boolean;
  channel?: string;
  last4?: string;
  brand?: string;
  card_type?: string;
};
type PaystackSubscription = {
  subscription_code?: string;
  email_token?: string;
  status?: string;
  customer?: { email?: string } | number | null;
  authorization?: PaystackAuthorization | null;
};
type PaystackTransaction = {
  id?: number;
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  gateway_response?: string;
  paid_at?: string;
  authorization?: PaystackAuthorization | null;
};
type ChargeAuthorizationResponse = PaystackTransaction & {
  paused?: boolean;
  authorization_url?: string;
  access_code?: string;
};

class PaystackRequestError extends Error {
  constructor(
    message: string,
    readonly providerRejected: boolean,
    readonly internalDetail?: string,
  ) {
    super(message);
    this.name = "PaystackRequestError";
  }
}

function secretKey() {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || null;
}

function planCode() {
  return process.env.PAYSTACK_SUBSCRIPTION_PLAN_CODE?.trim() || null;
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

function externalCode(value: string | null | undefined) {
  if (!value?.startsWith("paystack:")) return null;
  return value.slice("paystack:".length);
}

function amountMatchesKes(expectedKes: number, receivedSubunit: unknown) {
  const amount = Number(receivedSubunit);
  return Number.isFinite(amount) && amount === Math.round(expectedKes * 100);
}

function daysLate(dueAt: Date, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / DAY_MS));
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const key = secretKey();
  if (!key) {
    console.error("[billing retry] payment credential missing");
    throw new PaystackRequestError(
      "Payment service is temporarily unavailable. Please try again later.",
      false,
      "missing payment credential",
    );
  }

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
    console.error("[billing retry] provider request failed", path, error);
    throw new PaystackRequestError(
      "Payment service is temporarily unavailable. Please try again shortly.",
      false,
      error instanceof Error ? error.message : "network error",
    );
  }

  const body = (await response.json().catch(() => ({}))) as PaystackEnvelope<T>;
  if (!response.ok || body.status === false) {
    const internalDetail = String(body.message || `HTTP ${response.status}`).slice(0, 220);
    console.warn("[billing retry] provider rejected request", {
      path,
      status: response.status,
      detail: internalDetail,
    });
    throw new PaystackRequestError(
      "The payment request could not be completed. Please update your card or try again.",
      true,
      internalDetail,
    );
  }
  return body.data;
}

async function fetchProviderSubscription(code: string) {
  return requestJson<PaystackSubscription>(`/subscription/${encodeURIComponent(code)}`);
}

async function verifyTransaction(reference: string) {
  return requestJson<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

async function queueBillingNotice(pharmacyId: string, subject: string, body: string) {
  const pharmacy = await db.pharmacy.findUnique({
    where: { id: pharmacyId },
    include: { owner: { select: { email: true } } },
  });
  const email = pharmacy?.owner?.email || pharmacy?.email;
  if (!email) return;
  await db.notificationDelivery.create({
    data: {
      pharmacyId,
      channel: "email",
      status: "queued",
      payload: {
        channel: "email",
        purpose: "transactional",
        recipient: { email },
        subject,
        body,
        fallback: ["email"],
        attempted: [],
      },
    },
  });
}

async function latestBillingSuspensionIsOurs(pharmacyId: string) {
  const latest = await db.pharmacyLifecycleEvent.findFirst({
    where: { pharmacyId, toStatus: "suspended" },
    orderBy: { createdAt: "desc" },
  });
  return latest?.reason === "billing_nonpayment";
}

async function restorePharmacyAfterBillingRecovery(pharmacyId: string) {
  const pharmacy = await db.pharmacy.findUnique({ where: { id: pharmacyId } });
  if (!pharmacy) return;
  if (pharmacy.lifecycleStatus !== "suspended") return;
  if (!(await latestBillingSuspensionIsOurs(pharmacyId))) return;

  await db.pharmacy.update({
    where: { id: pharmacyId },
    data: {
      lifecycleStatus: "active",
      restrictedAt: null,
      suspendedAt: null,
      ...(pharmacy.setupCompletedAt && pharmacy.verifiedAt ? { listed: true } : {}),
    },
  });
  await recordLifecycle(pharmacyId, "activated", {
    fromStatus: "suspended",
    toStatus: "active",
    reason: "billing_recovered",
  });
}

async function settleRetryPayment(paymentId: string, reference: string, tx: PaystackTransaction) {
  const payment = await db.billingPayment.findUnique({
    where: { id: paymentId },
    include: { invoice: true },
  });
  if (!payment) return { ok: false, note: "payment_not_found" };
  if (payment.status === "succeeded") return { ok: true, note: "already_settled" };

  if (String(tx.status || "").toLowerCase() !== "success") {
    const terminal = ["failed", "abandoned", "reversed"].includes(String(tx.status || "").toLowerCase());
    if (terminal) {
      console.warn("[billing retry] terminal card result", {
        paymentId: payment.id,
        status: tx.status,
        detail: tx.gateway_response,
      });
      await db.billingPayment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          failureReason: "The card payment was not completed. Update the card or try again.",
        },
      });
    }
    return { ok: false, note: terminal ? "retry_failed" : "retry_processing" };
  }

  if (
    String(tx.currency || "").toUpperCase() !== "KES" ||
    !amountMatchesKes(Number(payment.amountKes), tx.amount) ||
    String(tx.channel || tx.authorization?.channel || "").toLowerCase() !== "card"
  ) {
    console.error("[billing retry] payment evidence mismatch", {
      paymentId: payment.id,
      expectedKes: Number(payment.amountKes),
      amount: tx.amount,
      currency: tx.currency,
      channel: tx.channel || tx.authorization?.channel,
    });
    await db.billingPayment.update({
      where: { id: payment.id },
      data: { status: "failed", failureReason: "We could not verify this card payment. No additional charge will be attempted until you try again." },
    });
    return { ok: false, note: "retry_evidence_mismatch" };
  }

  await db.billingPayment.update({
    where: { id: payment.id },
    data: {
      status: "succeeded",
      providerRef: String(tx.id || reference),
      paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
      failureReason: null,
    },
  });
  await markInvoicePaid(payment.invoiceId);
  if (payment.invoice.subscriptionId) {
    await db.subscription.updateMany({
      where: { id: payment.invoice.subscriptionId, status: { not: "cancelled" } },
      data: { status: "active" },
    });
  }
  await restorePharmacyAfterBillingRecovery(payment.pharmacyId);
  await recordAuditRequired({
    action: "billing.subscription.paystack.retry_succeeded",
    resource: "invoice",
    resourceId: payment.invoiceId,
    tenantId: payment.pharmacyId,
    details: { paymentId: payment.id, reference, transactionId: tx.id || null },
  });
  return { ok: true, note: "retry_settled" };
}

export async function processPaystackRetryReference(reference: string) {
  const payment = await db.billingPayment.findFirst({
    where: { provider: RETRY_PROVIDER, checkoutRequestId: reference },
  });
  if (!payment) return { handled: false as const, ok: false, note: "not_retry_reference" };
  if (payment.status === "succeeded") return { handled: true as const, ok: true, note: "already_settled" };

  try {
    const tx = await verifyTransaction(reference);
    const result = await settleRetryPayment(payment.id, reference, tx);
    return { handled: true as const, ...result };
  } catch (error) {
    const rejected = error instanceof PaystackRequestError && error.providerRejected;
    console.error("[billing retry] confirmation failed", {
      paymentId: payment.id,
      rejected,
      error,
    });
    if (rejected) {
      await db.billingPayment.update({
        where: { id: payment.id },
        data: { status: "failed", failureReason: "The card payment could not be completed. Update the card or try again." },
      });
    }
    return { handled: true as const, ok: false, note: rejected ? "retry_failed" : "retry_confirming" };
  }
}

async function reconcilePendingRetries(limit = 20) {
  const rows = await db.billingPayment.findMany({
    where: {
      provider: RETRY_PROVIDER,
      status: "processing",
      updatedAt: { lt: new Date(Date.now() - 5 * 60_000) },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });
  let settled = 0;
  let failed = 0;
  for (const row of rows) {
    if (!row.checkoutRequestId) continue;
    const result = await processPaystackRetryReference(row.checkoutRequestId);
    if (result.ok) settled++;
    else if (result.note === "retry_failed") failed++;
  }
  return { scanned: rows.length, settled, failed };
}

async function attemptRetry(invoiceId: string, opts: { manual: boolean; now?: Date }) {
  const now = opts.now ?? new Date();
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      subscription: true,
      pharmacy: { include: { owner: { select: { email: true } } } },
    },
  });
  if (!invoice || !invoice.subscription || invoice.status !== "open" || Number(invoice.totalKes) <= 0) {
    return { ok: false, note: "invoice_not_collectible" };
  }

  const code = externalCode(invoice.subscription.externalSubscriptionId);
  if (!code) return { ok: false, note: "payment_method_missing" };

  if (opts.manual) {
    const recent = await db.billingPayment.findFirst({
      where: {
        invoiceId: invoice.id,
        provider: RETRY_PROVIDER,
        status: { in: ["pending", "processing"] },
        updatedAt: { gte: new Date(now.getTime() - 10 * 60_000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recent) return { ok: false, note: "retry_already_processing" };
  } else {
    const day = daysLate(invoice.dueAt, now);
    if (!RETRY_DAYS.has(day)) return { ok: false, note: "not_retry_day" };
    const start = new Date(invoice.dueAt.getTime() + day * DAY_MS);
    const end = new Date(invoice.dueAt.getTime() + (day + 1) * DAY_MS);
    const attempted = await db.billingPayment.findFirst({
      where: { invoiceId: invoice.id, provider: RETRY_PROVIDER, createdAt: { gte: start, lt: end } },
    });
    if (attempted) return { ok: false, note: "retry_already_attempted" };
  }

  let provider: PaystackSubscription;
  try {
    provider = await fetchProviderSubscription(code);
  } catch (error) {
    console.error("[billing retry] could not load saved card authorization", error);
    return {
      ok: false,
      note: "payment_method_unavailable",
      message: "We couldn't access the saved payment method right now. Please try again shortly.",
    };
  }

  const authorization = provider.authorization;
  const authorizationCode = String(authorization?.authorization_code || "").trim();
  const reusable = authorization?.reusable === true;
  const email =
    typeof provider.customer === "object" && provider.customer
      ? String(provider.customer.email || "").trim().toLowerCase()
      : String(invoice.pharmacy.email || invoice.pharmacy.owner?.email || "").trim().toLowerCase();

  const payment = await db.billingPayment.create({
    data: {
      pharmacyId: invoice.pharmacyId,
      invoiceId: invoice.id,
      provider: RETRY_PROVIDER,
      status: "processing",
      amountKes: invoice.totalKes,
    },
  });
  const reference = `AETHER-RETRY-${payment.id}`;
  await db.billingPayment.update({ where: { id: payment.id }, data: { checkoutRequestId: reference } });

  if (!authorizationCode || !reusable || !email) {
    const reason = !authorizationCode || !reusable
      ? "The saved card cannot be retried automatically. Update the card in billing."
      : "Your billing email is unavailable. Add a billing email and try again.";
    await db.billingPayment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: reason } });
    await queueBillingNotice(
      invoice.pharmacyId,
      "Action needed: update your Aether payment card",
      `We could not retry invoice ${invoice.number} automatically. ${reason} Your pharmacy remains available during the 14-day grace period. Open Pricing & billing to update the card.`,
    );
    return { ok: false, note: "card_update_required", message: reason };
  }

  const origin = appOrigin();
  let charge: ChargeAuthorizationResponse;
  try {
    charge = await requestJson<ChargeAuthorizationResponse>("/transaction/charge_authorization", {
      method: "POST",
      body: JSON.stringify({
        authorization_code: authorizationCode,
        email,
        amount: String(Math.round(Number(invoice.totalKes) * 100)),
        currency: "KES",
        reference,
        queue: true,
        ...(origin ? { callback_url: `${origin}/api/payments/card/return` } : {}),
        metadata: JSON.stringify({
          kind: "subscription_dunning_retry",
          pharmacy_id: invoice.pharmacyId,
          subscription_id: invoice.subscription.id,
          invoice_id: invoice.id,
          payment_id: payment.id,
          manual: opts.manual ? "true" : "false",
        }),
      }),
    });
  } catch (error) {
    if (error instanceof PaystackRequestError && error.providerRejected) {
      await db.billingPayment.update({
        where: { id: payment.id },
        data: { status: "failed", failureReason: "The card payment could not be completed. Update the card or try again." },
      });
      return {
        ok: false,
        note: "retry_failed",
        message: "The card could not be charged. Update the payment method and try again.",
      };
    }

    console.error("[billing retry] charge status uncertain", { paymentId: payment.id, error });
    await db.billingPayment.update({
      where: { id: payment.id },
      data: { failureReason: "Payment confirmation is still pending. We will verify it before another attempt." },
    });
    return { ok: false, note: "retry_confirming", message: "Your payment is still being confirmed. Please check again shortly." };
  }

  if (charge.paused || charge.authorization_url) {
    let redirectUrl: string | undefined;
    if (charge.authorization_url) {
      try {
        const parsed = new URL(charge.authorization_url);
        if (parsed.protocol === "https:" && (parsed.hostname === "paystack.com" || parsed.hostname.endsWith(".paystack.com"))) {
          redirectUrl = parsed.toString();
        }
      } catch {
        // Unsafe/invalid provider URL is intentionally ignored.
      }
    }
    await db.billingPayment.update({
      where: { id: payment.id },
      data: {
        status: opts.manual && redirectUrl ? "processing" : "failed",
        providerRef: redirectUrl || null,
        failureReason: opts.manual && redirectUrl
          ? "Card confirmation is required to complete this payment."
          : "The card needs confirmation. Update or confirm the card in billing.",
      },
    });
    if (!opts.manual) {
      await queueBillingNotice(
        invoice.pharmacyId,
        "Your Aether card needs confirmation",
        `Your card needs confirmation for invoice ${invoice.number}. Your pharmacy remains available during the grace period. Open Pricing & billing and use Manage payment card.`,
      );
    }
    return { ok: false, note: "card_authentication_required", redirectUrl };
  }

  const chargeStatus = String(charge.status || "").toLowerCase();
  if (chargeStatus === "success") {
    const confirmed = await processPaystackRetryReference(reference);
    return { ok: confirmed.ok, note: confirmed.note };
  }
  if (["failed", "abandoned", "reversed"].includes(chargeStatus)) {
    console.warn("[billing retry] charge did not complete", {
      paymentId: payment.id,
      status: chargeStatus,
      detail: charge.gateway_response,
    });
    const reason = "The card payment was not completed. Update the card or try again.";
    await db.billingPayment.update({ where: { id: payment.id }, data: { status: "failed", failureReason: reason } });
    return { ok: false, note: "retry_failed", message: reason };
  }

  return { ok: false, note: "retry_processing", message: "Your payment is being processed. Please check again shortly." };
}

async function moveIntoBillingState(invoiceId: string, now = new Date()) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { subscription: true, pharmacy: true },
  });
  if (!invoice || !invoice.subscription || invoice.status !== "open" || invoice.dueAt > now) return null;

  const late = daysLate(invoice.dueAt, now);
  const recentProcessing = late >= SUBSCRIPTION_GRACE_DAYS
    ? await db.billingPayment.findFirst({
        where: {
          invoiceId: invoice.id,
          provider: RETRY_PROVIDER,
          status: { in: ["pending", "processing"] },
          updatedAt: { gte: new Date(now.getTime() - 36 * 60 * 60_000) },
        },
      })
    : null;

  const nextStatus = late >= SUBSCRIPTION_GRACE_DAYS && !recentProcessing
    ? "suspended"
    : late >= 3
      ? "grace"
      : "warning";
  const graceUntil = new Date(invoice.dueAt.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY_MS);
  const existing = await db.dunningCase.findFirst({
    where: { invoiceId: invoice.id, status: { notIn: ["resolved", "written_off"] } },
  });
  const changed = existing?.status !== nextStatus;

  if (existing) {
    await db.dunningCase.update({
      where: { id: existing.id },
      data: { status: nextStatus, warningAt: existing.warningAt ?? now, graceUntil },
    });
  } else {
    await db.dunningCase.create({
      data: {
        pharmacyId: invoice.pharmacyId,
        invoiceId: invoice.id,
        status: nextStatus,
        warningAt: now,
        graceUntil,
      },
    });
  }

  if (nextStatus === "suspended") {
    await db.subscription.updateMany({
      where: { id: invoice.subscription.id, status: { not: "cancelled" } },
      data: { status: "unpaid" },
    });
    if (!["regulatory_hold", "archived", "pending_deletion", "deleted"].includes(invoice.pharmacy.lifecycleStatus)) {
      if (invoice.pharmacy.lifecycleStatus !== "suspended") {
        await db.pharmacy.update({
          where: { id: invoice.pharmacyId },
          data: { lifecycleStatus: "suspended", restrictedAt: now, suspendedAt: now, listed: false },
        });
        await recordLifecycle(invoice.pharmacyId, "suspended", {
          fromStatus: invoice.pharmacy.lifecycleStatus,
          toStatus: "suspended",
          reason: "billing_nonpayment",
          meta: { invoiceId: invoice.id, graceDays: SUBSCRIPTION_GRACE_DAYS },
        });
      }
    }
    if (changed) {
      await queueBillingNotice(
        invoice.pharmacyId,
        "Aether service paused — your data is safe",
        `Invoice ${invoice.number} is still unpaid after the ${SUBSCRIPTION_GRACE_DAYS}-day grace period. Your public listing and new customer activity are paused, but your pharmacy data is preserved. Update the card if needed and retry the KES ${Number(invoice.totalKes).toLocaleString("en-KE")} payment from Pricing & billing to restore service automatically.`,
      );
    }
  } else {
    await db.subscription.updateMany({
      where: { id: invoice.subscription.id, status: { in: ["active", "past_due", "unpaid"] } },
      data: { status: "past_due" },
    });
    if (invoice.pharmacy.lifecycleStatus === "active") {
      await db.pharmacy.update({ where: { id: invoice.pharmacyId }, data: { lifecycleStatus: "past_due", restrictedAt: null } });
    } else if (invoice.pharmacy.lifecycleStatus === "restricted") {
      const latestRestriction = await db.pharmacyLifecycleEvent.findFirst({
        where: { pharmacyId: invoice.pharmacyId, toStatus: "restricted" },
        orderBy: { createdAt: "desc" },
      });
      if (latestRestriction?.reason === "invoice_overdue" || latestRestriction?.reason === "billing_nonpayment") {
        await db.pharmacy.update({
          where: { id: invoice.pharmacyId },
          data: {
            lifecycleStatus: "past_due",
            restrictedAt: null,
            ...(invoice.pharmacy.setupCompletedAt && invoice.pharmacy.verifiedAt ? { listed: true } : {}),
          },
        });
      }
    }
    if (changed) {
      const remaining = Math.max(0, Math.ceil((graceUntil.getTime() - now.getTime()) / DAY_MS));
      await queueBillingNotice(
        invoice.pharmacyId,
        nextStatus === "warning" ? "Aether payment failed — grace period started" : "Aether payment is still due",
        `We could not collect invoice ${invoice.number}. Your pharmacy remains fully available during the ${SUBSCRIPTION_GRACE_DAYS}-day grace period. ${remaining} day${remaining === 1 ? "" : "s"} remain. Aether retries the saved card automatically on days 2, 5, 9 and 13; you can update the card at any time from Pricing & billing.`,
      );
    }
  }

  return { invoiceId: invoice.id, status: nextStatus, daysLate: late, graceUntil, waitingForRetry: Boolean(recentProcessing) };
}

export async function processSubscriptionDunningInvoice(invoiceId: string, now = new Date()) {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status !== "open" || !invoice.subscriptionId || invoice.dueAt > now) return null;

  const late = daysLate(invoice.dueAt, now);
  let retry: Awaited<ReturnType<typeof attemptRetry>> | null = null;
  if (RETRY_DAYS.has(late)) retry = await attemptRetry(invoice.id, { manual: false, now });

  const state = await moveIntoBillingState(invoice.id, now);
  return { state, retry };
}

export async function processSubscriptionDunning(limit = 50) {
  const reconciliation = await reconcilePendingRetries(20);
  const invoices = await db.invoice.findMany({
    where: { status: "open", subscriptionId: { not: null }, dueAt: { lt: new Date() } },
    orderBy: { dueAt: "asc" },
    take: limit,
    select: { id: true },
  });

  let retried = 0;
  let suspended = 0;
  let grace = 0;
  for (const invoice of invoices) {
    const result = await processSubscriptionDunningInvoice(invoice.id);
    if (result?.retry && !["not_retry_day", "retry_already_attempted"].includes(result.retry.note)) retried++;
    if (result?.state?.status === "suspended") suspended++;
    else if (result?.state) grace++;
  }
  return { scanned: invoices.length, retried, suspended, grace, reconciliation };
}

export async function retryPaystackOverdueInvoice(pharmacyId: string) {
  const invoice = await db.invoice.findFirst({
    where: {
      pharmacyId,
      status: "open",
      subscriptionId: { not: null },
      totalKes: { gt: 0 },
    },
    orderBy: { dueAt: "asc" },
  });
  if (!invoice) return { ok: true, note: "nothing_due", message: "There is no outstanding monthly invoice." };
  return attemptRetry(invoice.id, { manual: true });
}

export async function restoreBillingSuspendedFromPaystackEvent(event: { event?: string; data?: any }) {
  if (event.event !== "invoice.update") return false;
  const data = event.data || {};
  const paid = data?.paid === true || String(data?.status || "").toLowerCase() === "success";
  if (!paid) return false;
  const code = String(data?.subscription?.subscription_code || data?.subscription_code || "").trim();
  if (!code) return false;

  const sub = await db.subscription.findFirst({ where: { externalSubscriptionId: `paystack:${code}` } });
  if (!sub || sub.status !== "active") return false;
  await restorePharmacyAfterBillingRecovery(sub.pharmacyId);
  return true;
}
