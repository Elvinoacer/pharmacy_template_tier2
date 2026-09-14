import "server-only";

import { timingSafeEqual } from "node:crypto";
import { prismaUnscoped as db } from "@/app/lib/db";
import { recordAuditRequired } from "@/app/lib/platform/audit";
import { markInvoicePaid } from "@/app/lib/platform/billing";
import { MONTHLY_FEE_KES, nextBillingMonth } from "@/app/lib/platform/pricing";
import { formatMpesaPhone } from "@/app/lib/services/daraja";
import {
  cancelRatibaStandingOrder,
  createMonthlyRatibaStandingOrder,
  DARAJA_RATIBA_PENDING_PREFIX,
  DARAJA_RATIBA_PREFIX,
  ratibaAccountReference,
  ratibaConfigured,
  ratibaPendingRef,
  ratibaStandingOrderId,
} from "@/app/lib/services/daraja-ratiba";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyRatibaCallbackToken(token: string | null) {
  const expected = process.env.DARAJA_RATIBA_WEBHOOK_SECRET?.trim();
  return Boolean(expected && token && safeEqual(expected, token));
}

export async function saveMpesaBillingPhone(pharmacyId: string, rawPhone: string) {
  const phone = formatMpesaPhone(rawPhone);
  if (!/^254[17]\d{8}$/.test(phone)) throw new Error("Enter a valid Safaricom M-PESA phone number.");
  await db.billingPaymentMethod.updateMany({ where: { pharmacyId, isDefault: true }, data: { isDefault: false } });
  const existing = await db.billingPaymentMethod.findFirst({
    where: { pharmacyId, type: "mpesa" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await db.billingPaymentMethod.update({
      where: { id: existing.id },
      data: { label: "M-PESA", last4: null, mpesaPhone: phone, isDefault: true },
    });
  } else {
    await db.billingPaymentMethod.create({
      data: { pharmacyId, type: "mpesa", label: "M-PESA", mpesaPhone: phone, isDefault: true },
    });
  }
  return phone;
}

async function firstPaidRatibaDate(subscription: { id: string; pharmacyId: string; startedAt: Date; currentPeriodEnd: Date }) {
  const grant = await db.pharmacyPromotionGrant.findUnique({ where: { pharmacyId: subscription.pharmacyId } });
  let waiverEnd = new Date(subscription.startedAt);
  for (let i = 0; i < (grant?.recurringMonths ?? 0); i++) waiverEnd = nextBillingMonth(waiverEnd);
  return waiverEnd > subscription.currentPeriodEnd ? waiverEnd : subscription.currentPeriodEnd;
}

export async function createOrResumeDarajaSubscription(input: {
  pharmacyId: string;
  subscriptionId: string;
  phone: string;
  actorId?: string | null;
}) {
  const local = await db.subscription.findFirst({
    where: { id: input.subscriptionId, pharmacyId: input.pharmacyId },
    include: { plan: true },
  });
  if (!local) throw new Error("subscription_not_found");
  if (local.status === "cancelled") throw new Error("This subscription has already been cancelled.");

  const phone = await saveMpesaBillingPhone(input.pharmacyId, input.phone);
  const standingOrderId = ratibaStandingOrderId(local.externalSubscriptionId);
  if (standingOrderId) {
    return { active: true, authorising: false, standingOrderId, responseRefId: null };
  }
  const pendingRef = ratibaPendingRef(local.externalSubscriptionId);
  if (pendingRef) {
    return { active: false, authorising: true, standingOrderId: null, responseRefId: pendingRef };
  }
  if (!ratibaConfigured()) {
    throw new Error("Automatic M-PESA Ratiba billing is not enabled on the platform shortcode yet. You can still pay every invoice through M-PESA STK Push.");
  }

  const startDate = await firstPaidRatibaDate(local);
  const endDate = new Date(startDate);
  endDate.setUTCFullYear(endDate.getUTCFullYear() + 10);
  const result = await createMonthlyRatibaStandingOrder({
    subscriptionId: local.id,
    phone,
    amountKes: Number(local.plan.priceKes || MONTHLY_FEE_KES),
    startDate,
    endDate,
  });
  if (!result.ok || !result.responseRefId) {
    throw new Error(result.responseMessage || "M-PESA Ratiba could not start the standing order.");
  }

  await db.subscription.update({
    where: { id: local.id },
    data: { externalSubscriptionId: `${DARAJA_RATIBA_PENDING_PREFIX}${result.responseRefId}` },
  });
  await recordAuditRequired({
    actorId: input.actorId,
    action: "billing.subscription.daraja_ratiba.requested",
    resource: "subscription",
    resourceId: local.id,
    tenantId: input.pharmacyId,
    details: { responseRefId: result.responseRefId, startDate: startDate.toISOString(), amountKes: Number(local.plan.priceKes) },
  });
  return { active: false, authorising: true, standingOrderId: result.standingOrderId, responseRefId: result.responseRefId };
}

export async function cancelDarajaSubscriptionStandingOrder(externalSubscriptionId: string, actorId?: string | null) {
  const id = ratibaStandingOrderId(externalSubscriptionId);
  if (!id) {
    if (ratibaPendingRef(externalSubscriptionId)) {
      throw new Error("The M-PESA Ratiba authorization is still being processed. Wait for confirmation before cancelling auto-renewal.");
    }
    return { ok: true, note: "no_standing_order" } as const;
  }
  const result = await cancelRatibaStandingOrder(id);
  if (!result.ok) throw new Error(result.responseMessage || "M-PESA Ratiba could not cancel the standing order.");
  const subscription = await db.subscription.findFirst({ where: { externalSubscriptionId } });
  if (subscription) {
    await recordAuditRequired({
      actorId,
      action: "billing.subscription.daraja_ratiba.cancel_requested",
      resource: "subscription",
      resourceId: subscription.id,
      tenantId: subscription.pharmacyId,
      details: { standingOrderId: id, responseRefId: result.responseRefId },
    });
  }
  return { ok: true, note: "cancel_requested" } as const;
}

type FlatEntry = { key: string; value: unknown };

function flatten(value: unknown, out: FlatEntry[] = [], depth = 0): FlatEntry[] {
  if (depth > 8 || value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out, depth + 1);
    return out;
  }
  if (typeof value !== "object") return out;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    out.push({ key: key.toLowerCase(), value: child });
    if (child && typeof child === "object") flatten(child, out, depth + 1);
  }
  return out;
}

function firstText(entries: FlatEntry[], names: string[]) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const entry of entries) {
    if (!wanted.has(entry.key) || entry.value == null || typeof entry.value === "object") continue;
    const text = String(entry.value).trim();
    if (text) return text;
  }
  return null;
}

function firstNumber(entries: FlatEntry[], names: string[]) {
  const value = firstText(entries, names);
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export type RatibaCallbackFacts = {
  resultCode: string | null;
  resultDescription: string | null;
  responseRefId: string | null;
  standingOrderId: string | null;
  transactionId: string | null;
  accountReference: string | null;
  amount: number | null;
  phone: string | null;
};

export function parseRatibaCallback(payload: unknown): RatibaCallbackFacts {
  const entries = flatten(payload);
  return {
    resultCode: firstText(entries, ["resultcode", "responsecode", "statuscode"]),
    resultDescription: firstText(entries, ["resultdesc", "responsemessage", "responsedescription", "statusdescription"]),
    responseRefId: firstText(entries, ["responserefid", "responserefid", "originatorconversationid"]),
    standingOrderId: firstText(entries, ["standingorderid", "standing_order_id"]),
    transactionId: firstText(entries, ["transactionid", "mpesareceiptnumber", "receiptno", "receiptnumber"]),
    accountReference: firstText(entries, ["accountreference", "billrefnumber", "reference"]),
    amount: firstNumber(entries, ["amount", "transamount", "transactionamount"]),
    phone: firstText(entries, ["partya", "msisdn", "phone", "phonenumber"]),
  };
}

function acceptedResult(code: string | null) {
  return code === "0" || code === "200";
}

async function findSubscriptionForFacts(facts: RatibaCallbackFacts) {
  if (facts.standingOrderId) {
    const exact = await db.subscription.findFirst({
      where: { externalSubscriptionId: `${DARAJA_RATIBA_PREFIX}${facts.standingOrderId}` },
    });
    if (exact) return exact;
  }
  if (facts.responseRefId) {
    const pending = await db.subscription.findFirst({
      where: { externalSubscriptionId: `${DARAJA_RATIBA_PENDING_PREFIX}${facts.responseRefId}` },
    });
    if (pending) return pending;
  }
  if (facts.accountReference) {
    const candidates = await db.subscription.findMany({
      where: { externalSubscriptionId: { startsWith: "daraja_ratiba" }, status: { not: "cancelled" } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return candidates.find((sub) => ratibaAccountReference(sub.id) === facts.accountReference) ?? null;
  }
  return null;
}

export async function processRatibaCallback(payload: unknown) {
  const facts = parseRatibaCallback(payload);
  const subscription = await findSubscriptionForFacts(facts);
  if (!subscription) return { ok: true as const, note: "subscription_not_found", facts };

  if (!acceptedResult(facts.resultCode)) {
    if (ratibaPendingRef(subscription.externalSubscriptionId)) {
      await db.subscription.update({ where: { id: subscription.id }, data: { externalSubscriptionId: null } });
    }
    await recordAuditRequired({
      action: "billing.subscription.daraja_ratiba.rejected",
      resource: "subscription",
      resourceId: subscription.id,
      tenantId: subscription.pharmacyId,
      details: { resultCode: facts.resultCode, description: facts.resultDescription },
    });
    return { ok: true as const, note: "rejected", facts, pharmacyId: subscription.pharmacyId };
  }

  if (ratibaPendingRef(subscription.externalSubscriptionId)) {
    const providerId = facts.standingOrderId || facts.responseRefId;
    if (providerId) {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { externalSubscriptionId: `${DARAJA_RATIBA_PREFIX}${providerId}` },
      });
      await recordAuditRequired({
        action: "billing.subscription.daraja_ratiba.authorized",
        resource: "subscription",
        resourceId: subscription.id,
        tenantId: subscription.pharmacyId,
        details: { standingOrderId: facts.standingOrderId, responseRefId: facts.responseRefId },
      });
    }
  }

  if (!facts.transactionId || facts.amount == null) {
    return { ok: true as const, note: "authorization_confirmed", facts, pharmacyId: subscription.pharmacyId };
  }

  const invoice = await db.invoice.findFirst({
    where: {
      subscriptionId: subscription.id,
      pharmacyId: subscription.pharmacyId,
      status: "open",
      totalKes: facts.amount,
    },
    orderBy: { periodStart: "asc" },
  });
  if (!invoice) return { ok: true as const, note: "no_matching_open_invoice", facts, pharmacyId: subscription.pharmacyId };

  const duplicate = await db.billingPayment.findFirst({
    where: { provider: "daraja_ratiba", providerRef: facts.transactionId },
  });
  if (!duplicate) {
    await db.billingPayment.create({
      data: {
        pharmacyId: subscription.pharmacyId,
        invoiceId: invoice.id,
        provider: "daraja_ratiba",
        status: "succeeded",
        amountKes: facts.amount,
        providerRef: facts.transactionId,
        paidAt: new Date(),
        phone: facts.phone ? formatMpesaPhone(facts.phone) : null,
      },
    });
  }
  await markInvoicePaid(invoice.id);
  await recordAuditRequired({
    action: "billing.invoice.daraja_ratiba.paid",
    resource: "invoice",
    resourceId: invoice.id,
    tenantId: subscription.pharmacyId,
    details: { transactionId: facts.transactionId, amountKes: facts.amount },
  });
  return { ok: true as const, note: duplicate ? "already_settled" : "settled", facts, pharmacyId: subscription.pharmacyId };
}
