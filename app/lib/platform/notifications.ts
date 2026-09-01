import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { sendDelivery, type DeliveryPayload } from "@/app/lib/services/delivery";
import { recordUsage } from "@/app/lib/platform/metering";

const CHANNEL_FALLBACK: Record<string, string[]> = {
  whatsapp: ["whatsapp", "sms", "email"],
  sms: ["sms", "whatsapp", "email"],
  email: ["email", "sms"],
  push: ["push", "sms", "email"],
  critical: ["push", "sms", "whatsapp", "email"],
};

export async function queueNotificationDelivery(input: {
  pharmacyId: string;
  notificationId?: string | null;
  channel: "email" | "sms" | "whatsapp" | "push" | "in_app";
  payload: DeliveryPayload;
  preferred?: string;
}) {
  const chain = CHANNEL_FALLBACK[input.preferred || input.channel] ?? [input.channel];
  const delivery = await prismaUnscoped.notificationDelivery.create({
    data: {
      pharmacyId: input.pharmacyId,
      notificationId: input.notificationId ?? null,
      channel: input.channel,
      status: "queued",
      scheduledAt: new Date(),
    },
  });
  return { delivery, chain, payload: input.payload };
}

export async function processQueuedDeliveries(pharmacyId: string | null, limit = 25) {
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
    await prismaUnscoped.notificationDelivery.update({
      where: { id: row.id },
      data: { status: "processing", attempt: { increment: 1 } },
    });
    const started = Date.now();
    try {
      const result = await withPharmacy(row.pharmacyId, async () => {
        return sendDelivery({
          channel: row.channel === "in_app" ? "in_app" : row.channel,
          body: "",
          recipient: {},
          purpose: "transactional",
        });
      });
      const terminal = result.status === "sent" || result.status === "delivered" || result.status === "pending";
      await prismaUnscoped.notificationAttempt.create({
        data: {
          deliveryId: row.id,
          attempt: row.attempt + 1,
          status: result.status,
          error: result.error ?? null,
          latencyMs: Date.now() - started,
        },
      });
      await prismaUnscoped.notificationDelivery.update({
        where: { id: row.id },
        data: {
          status: result.status === "failed" ? (row.attempt + 1 >= 5 ? "dead_letter" : "retrying") : result.status === "pending" ? "sent" : result.status === "delivered" ? "delivered" : "sent",
          provider: result.provider ?? null,
          providerMessageId: result.providerMessageId ?? null,
          error: result.error ?? null,
          sentAt: terminal ? new Date() : undefined,
          scheduledAt: result.status === "failed" ? new Date(Date.now() + 2 ** row.attempt * 1000) : undefined,
        },
      });
      if (result.status === "sent" || result.status === "delivered") {
        const metric = row.channel === "sms" ? "sms" : row.channel === "whatsapp" ? "whatsapp" : row.channel === "email" ? "email" : "messages";
        await recordUsage(row.pharmacyId, metric, 1);
      }
    } catch (err) {
      await prismaUnscoped.notificationDelivery.update({
        where: { id: row.id },
        data: {
          status: row.attempt + 1 >= 5 ? "dead_letter" : "retrying",
          error: err instanceof Error ? err.message.slice(0, 400) : "deliver_failed",
          scheduledAt: new Date(Date.now() + 2 ** row.attempt * 1000),
        },
      });
    }
  }
  return { scanned: due.length };
}
