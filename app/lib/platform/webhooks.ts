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
    const existing = await prismaUnscoped.webhookEvent.findUnique({
      where: { provider_providerEventId: { provider: input.provider, providerEventId: input.providerEventId } },
    }).catch(() => null);
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
    const secret = decryptSecret(ep.secretEnc) || "";
    const body = JSON.stringify({ eventType, payload, pharmacyId });
    const sig = signWebhookBody(secret, body);
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Aether-Signature": `sha256=${sig}`,
          "X-Aether-Event": eventType,
        },
        body,
      });
      await prismaUnscoped.webhookEndpoint.update({
        where: { id: ep.id },
        data: res.ok
          ? { lastDeliveryAt: new Date(), lastError: null }
          : { lastError: `HTTP ${res.status}` },
      });
    } catch (err) {
      await prismaUnscoped.webhookEndpoint.update({
        where: { id: ep.id },
        data: { lastError: err instanceof Error ? err.message.slice(0, 300) : "dispatch_failed" },
      });
    }
  }
}
