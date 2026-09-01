import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { prismaUnscoped } from "@/app/lib/db";
import { decryptSecret } from "@/app/lib/platform/secrets";
import { signHmacSha256, verifyHmacSha256 } from "@/app/lib/platform/totp";

export function signWebhookBody(secret: string, body: string): string {
  return signHmacSha256(secret, body);
}

export function verifyWebhookSignature(secret: string, body: string, header: string | null): boolean {
  return verifyHmacSha256(secret, body, header);
}

export type InboundProvider =
  | "daraja"
  | "twilio"
  | "whatsapp"
  | "resend"
  | "delivery"
  | "pos"
  | "generic";

function timingEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Provider-specific inbound auth. Generic HMAC is not used as a universal verifier. */
export function verifyInboundProvider(input: {
  provider: InboundProvider | string;
  rawBody: string;
  headers: Headers | { get(name: string): string | null };
  secret?: string | null;
}): boolean {
  const secret = input.secret?.trim() || "";
  const h = input.headers;
  const get = (name: string) => h.get(name);

  switch (input.provider) {
    case "daraja":
      // Daraja authenticates by CheckoutRequestID correlation, not HMAC.
      return true;
    case "twilio": {
      const sig = get("x-twilio-signature");
      if (!secret || !sig) return false;
      return timingEqual(createHmac("sha1", secret).update(input.rawBody).digest("base64"), sig);
    }
    case "whatsapp": {
      const sig = get("x-hub-signature-256");
      if (!secret || !sig) return false;
      return verifyHmacSha256(secret, input.rawBody, sig);
    }
    case "resend": {
      const sig = get("svix-signature") || get("webhook-signature");
      if (!secret || !sig) return false;
      const part = sig.split(" ").find((p) => p.startsWith("v1,"))?.slice(3) || sig;
      return verifyHmacSha256(secret, input.rawBody, part);
    }
    case "delivery": {
      const header = get("x-webhook-signature") || get("x-aether-signature");
      if (secret && header) return verifyHmacSha256(secret, input.rawBody, header);
      if (!secret) return process.env.NODE_ENV !== "production";
      return get("authorization") === `Bearer ${secret}`;
    }
    case "pos":
      return Boolean(get("authorization")?.startsWith("Bearer "));
    default:
      if (!secret) return process.env.NODE_ENV !== "production";
      return verifyHmacSha256(secret, input.rawBody, get("x-aether-signature") || get("x-webhook-signature"));
  }
}

export async function recordInboundWebhook(input: {
  pharmacyId: string;
  provider: string;
  providerEventId?: string | null;
  eventType: string;
  payload: unknown;
}) {
  if (input.providerEventId) {
    const existing = await prismaUnscoped.webhookEvent.findFirst({
      where: {
        pharmacyId: input.pharmacyId,
        provider: input.provider,
        providerEventId: input.providerEventId,
      },
    });
    if (existing) return { event: existing, duplicate: true };
  }
  const event = await prismaUnscoped.webhookEvent.create({
    data: {
      pharmacyId: input.pharmacyId,
      provider: input.provider,
      providerEventId: input.providerEventId ?? null,
      eventType: input.eventType,
      payload: input.payload as object,
      status: "pending",
    },
  });
  return { event, duplicate: false };
}

export async function markWebhookProcessed(id: string, error?: string | null) {
  await prismaUnscoped.webhookEvent.update({
    where: { id },
    data: error
      ? { status: "failed", lastError: error, attempts: { increment: 1 } }
      : { status: "delivered", processedAt: new Date(), lastError: null, attempts: { increment: 1 } },
  });
}

async function postOnce(url: string, secret: string, eventType: string, pharmacyId: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({ eventType, payload, pharmacyId });
  const sig = signWebhookBody(secret, body);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Aether-Signature": `sha256=${sig}`,
      "X-Aether-Event": eventType,
    },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function dispatchTenantWebhooks(
  pharmacyId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const endpoints = await prismaUnscoped.webhookEndpoint.findMany({
    where: { pharmacyId, active: true },
  });
  for (const ep of endpoints) {
    if (ep.events.length > 0 && !ep.events.includes(eventType) && !ep.events.includes("*")) continue;
    const row = await prismaUnscoped.webhookDelivery.create({
      data: {
        pharmacyId,
        endpointId: ep.id,
        eventType,
        payload: payload as object,
        status: "pending",
      },
    });
    await attemptWebhookDelivery(row.id);
  }
}

export async function attemptWebhookDelivery(id: string) {
  const claimed = await prismaUnscoped.webhookDelivery.updateMany({
    where: { id, status: { in: ["pending", "retrying"] } },
    data: { status: "processing" },
  });
  if (claimed.count === 0) return;

  const row = await prismaUnscoped.webhookDelivery.findUnique({ where: { id } });
  if (!row) return;
  const ep = await prismaUnscoped.webhookEndpoint.findUnique({ where: { id: row.endpointId } });
  if (!ep) {
    await prismaUnscoped.webhookDelivery.update({ where: { id }, data: { status: "dead_letter", lastError: "endpoint_missing" } });
    return;
  }
  const secret = decryptSecret(ep.secretEnc) || "";
  try {
    await postOnce(ep.url, secret, row.eventType, row.pharmacyId, (row.payload as Record<string, unknown>) ?? {});
    await prismaUnscoped.webhookDelivery.update({
      where: { id },
      data: { status: "delivered", deliveredAt: new Date(), lastError: null, attempts: { increment: 1 } },
    });
    await prismaUnscoped.webhookEndpoint.update({
      where: { id: ep.id },
      data: { lastDeliveryAt: new Date(), lastError: null },
    });
  } catch (err) {
    const attempts = row.attempts + 1;
    const dead = attempts >= 8;
    const message = err instanceof Error ? err.message.slice(0, 300) : "dispatch_failed";
    await prismaUnscoped.webhookDelivery.update({
      where: { id },
      data: {
        status: dead ? "dead_letter" : "retrying",
        attempts,
        lastError: message,
        nextAttemptAt: new Date(Date.now() + Math.min(60 * 60 * 1000, 1500 * 2 ** attempts)),
      },
    });
    await prismaUnscoped.webhookEndpoint.update({
      where: { id: ep.id },
      data: { lastError: message },
    });
  }
}

const STALE_WEBHOOK_DELIVERY_MS = 10 * 60 * 1000;

export async function recoverStaleWebhookDeliveries() {
  const cutoff = new Date(Date.now() - STALE_WEBHOOK_DELIVERY_MS);
  const res = await prismaUnscoped.webhookDelivery.updateMany({
    where: {
      status: "processing",
      OR: [
        { nextAttemptAt: { lt: cutoff } },
        { createdAt: { lt: cutoff } },
      ],
    },
    data: {
      status: "retrying",
      lastError: "stale_lock_recovered",
      nextAttemptAt: new Date(),
    },
  });
  return res.count;
}

export async function processWebhookDeliveryBatch(limit = 40) {
  await recoverStaleWebhookDeliveries();
  const due = await prismaUnscoped.webhookDelivery.findMany({
    where: { status: { in: ["pending", "retrying"] }, nextAttemptAt: { lte: new Date() } },
    take: limit,
    orderBy: { nextAttemptAt: "asc" },
  });
  let processed = 0;
  for (const row of due) {
    await attemptWebhookDelivery(row.id);
    processed++;
  }
  return { scanned: due.length, processed };
}
