import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { decryptSecret } from "@/app/lib/platform/secrets";
import { signHmacSha256, verifyHmacSha256 } from "@/app/lib/platform/totp";

export function signWebhookBody(secret: string, body: string): string {
  return signHmacSha256(secret, body);
}

export function verifyWebhookSignature(secret: string, body: string, header: string | null): boolean {
  return verifyHmacSha256(secret, body, header);
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
  const row = await prismaUnscoped.webhookDelivery.findUnique({ where: { id } });
  if (!row || row.status === "delivered" || row.status === "dead_letter") return;
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

export async function processWebhookDeliveryBatch(limit = 40) {
  const due = await prismaUnscoped.webhookDelivery.findMany({
    where: { status: { in: ["pending", "retrying"] }, nextAttemptAt: { lte: new Date() } },
    take: limit,
    orderBy: { nextAttemptAt: "asc" },
  });
  for (const row of due) {
    const claimed = await prismaUnscoped.webhookDelivery.updateMany({
      where: { id: row.id, status: { in: ["pending", "retrying"] } },
      data: { status: "pending" },
    });
    if (claimed.count === 0) continue;
    await attemptWebhookDelivery(row.id);
  }
  return { scanned: due.length };
}
