import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { sendDelivery, type DeliveryPayload } from "@/app/lib/services/delivery";
import { recordUsage, usageTotalMessages } from "@/app/lib/platform/metering";
import { assertWithinLimit } from "@/app/lib/platform/entitlements";
import {
  asPayload,
  fallbackChain,
  remainingChannels,
  CHANNEL_FALLBACK,
  type StoredDeliveryPayload,
} from "@/app/lib/platform/notification-fallback";

export { asPayload, fallbackChain, remainingChannels, CHANNEL_FALLBACK };
export type { StoredDeliveryPayload };

const BILLABLE_CHANNELS = new Set(["sms", "whatsapp", "email"]);

export async function queueNotificationDelivery(input: {
  pharmacyId: string;
  notificationId?: string | null;
  channel: "email" | "sms" | "whatsapp" | "push" | "in_app";
  payload: DeliveryPayload;
  preferred?: string;
}) {
  const chain = fallbackChain(input.preferred || input.channel);
  const delivery = await prismaUnscoped.notificationDelivery.create({
    data: {
      pharmacyId: input.pharmacyId,
      notificationId: input.notificationId ?? null,
      channel: input.channel,
      status: "queued",
      scheduledAt: new Date(),
      payload: {
        channel: input.payload.channel,
        body: input.payload.body,
        subject: input.payload.subject ?? null,
        purpose: input.payload.purpose ?? "transactional",
        recipient: input.payload.recipient ?? {},
        fallback: chain,
        attempted: [],
      } as object,
    },
  });
  return { delivery, chain, payload: input.payload };
}

const STALE_NOTIFICATION_DELIVERY_MS = 10 * 60 * 1000;

export async function recoverStaleNotificationDeliveries() {
  const cutoff = new Date(Date.now() - STALE_NOTIFICATION_DELIVERY_MS);
  const res = await prismaUnscoped.notificationDelivery.updateMany({
    where: {
      status: "processing",
      OR: [
        { sentAt: { lt: cutoff } },
        { sentAt: null, createdAt: { lt: cutoff } },
      ],
    },
    data: {
      status: "retrying",
      error: "stale_lock_recovered",
      scheduledAt: new Date(),
    },
  });
  return res.count;
}

export async function processQueuedDeliveries(pharmacyId: string | null, limit = 25) {
  await recoverStaleNotificationDeliveries();
  const due = await prismaUnscoped.notificationDelivery.findMany({
    where: {
      status: { in: ["queued", "retrying"] },
      scheduledAt: { lte: new Date() },
      ...(pharmacyId ? { pharmacyId } : {}),
    },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  for (const row of due) {
    const claimed = await prismaUnscoped.notificationDelivery.updateMany({
      where: { id: row.id, status: { in: ["queued", "retrying"] } },
      data: { status: "processing", attempt: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    const stored = asPayload(row.payload);
    if (!stored) {
      await prismaUnscoped.notificationDelivery.update({
        where: { id: row.id },
        data: { status: "dead_letter", error: "missing_payload" },
      });
      continue;
    }

    const chain = fallbackChain(stored.channel, stored.fallback);
    const attempted = stored.attempted ?? [];
    const toTry = remainingChannels(chain, attempted);
    if (toTry.length === 0) {
      await prismaUnscoped.notificationDelivery.update({
        where: { id: row.id },
        data: { status: "dead_letter", error: "fallback_exhausted", payload: { ...stored, fallback: chain, attempted } as object },
      });
      continue;
    }

    try {
      await assertWithinLimit(row.pharmacyId, "messages", await usageTotalMessages(row.pharmacyId));

      let lastError: string | null = null;
      let succeeded = false;
      let lastProvider: string | null = null;
      let lastProviderMessageId: string | null = null;
      let lastChannel = stored.channel;
      const newlyAttempted = [...attempted];

      for (const channel of toTry) {
        const started = Date.now();
        const payload: DeliveryPayload = {
          channel: channel as DeliveryPayload["channel"],
          body: stored.body,
          subject: stored.subject,
          recipient: (stored.recipient ?? {}) as DeliveryPayload["recipient"],
          purpose: stored.purpose,
        };
        const result = await withPharmacy(row.pharmacyId, async () =>
          sendDelivery(payload, { persist: false }),
        );
        newlyAttempted.push(channel);
        await prismaUnscoped.notificationAttempt.create({
          data: {
            deliveryId: row.id,
            attempt: newlyAttempted.length,
            status: result.status,
            error: result.error ?? null,
            latencyMs: Date.now() - started,
          },
        });

        if (result.status === "sent" || result.status === "delivered" || result.status === "pending") {
          succeeded = true;
          lastChannel = channel as DeliveryPayload["channel"];
          lastProvider = result.provider ?? null;
          lastProviderMessageId = result.providerMessageId ?? null;
          lastError = result.error ?? null;
          if (BILLABLE_CHANNELS.has(channel)) {
            await recordUsage(row.pharmacyId, "messages", 1, {
              eventId: `delivery:${row.id}:${channel}`,
              meta: { channel },
            });
          }
          break;
        }
        lastError = result.error ?? "deliver_failed";
      }

      const workerAttempt = row.attempt + 1;
      if (succeeded) {
        await prismaUnscoped.notificationDelivery.update({
          where: { id: row.id },
          data: {
            status: lastError && lastProvider == null ? "sent" : "sent",
            channel: lastChannel === "in_app" || lastChannel === "portal" ? "in_app" : (lastChannel as "email" | "sms" | "whatsapp" | "push" | "in_app"),
            provider: lastProvider,
            providerMessageId: lastProviderMessageId,
            error: lastError,
            sentAt: new Date(),
            payload: { ...stored, fallback: chain, attempted: newlyAttempted } as object,
          },
        });
      } else {
        const exhausted = remainingChannels(chain, newlyAttempted).length === 0;
        const dead = exhausted || workerAttempt >= 5;
        await prismaUnscoped.notificationDelivery.update({
          where: { id: row.id },
          data: {
            status: dead ? "dead_letter" : "retrying",
            error: lastError,
            scheduledAt: dead ? undefined : new Date(Date.now() + 2 ** Math.min(workerAttempt, 10) * 1000),
            payload: { ...stored, fallback: chain, attempted: newlyAttempted } as object,
          },
        });
      }
    } catch (err) {
      await prismaUnscoped.notificationDelivery.update({
        where: { id: row.id },
        data: {
          status: row.attempt + 1 >= 5 ? "dead_letter" : "retrying",
          error: err instanceof Error ? err.message.slice(0, 400) : "deliver_failed",
          scheduledAt: new Date(Date.now() + 2 ** Math.min(row.attempt, 10) * 1000),
        },
      });
    }
  }
  return { scanned: due.length };
}
