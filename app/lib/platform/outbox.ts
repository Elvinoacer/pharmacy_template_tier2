import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy } from "@/app/lib/tenant-context";
import { enqueueJob } from "@/app/lib/platform/jobs";

export async function enqueueOutbox(input: {
  pharmacyId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}) {
  return prismaUnscoped.outboxEvent.create({
    data: {
      pharmacyId: input.pharmacyId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as object,
      status: "pending",
      nextAttemptAt: new Date(),
    },
  });
}

function backoff(attempts: number) {
  return Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 10));
}

export async function processOutboxBatch(limit = 50) {
  const due = await prismaUnscoped.outboxEvent.findMany({
    where: { status: { in: ["pending", "failed"] }, nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const event of due) {
    const claimed = await prismaUnscoped.outboxEvent.updateMany({
      where: { id: event.id, status: { in: ["pending", "failed"] } },
      data: { status: "processing", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;
    try {
      await withPharmacy(event.pharmacyId, async () => {
        await dispatchOutbox(event);
      });
      await prismaUnscoped.outboxEvent.update({
        where: { id: event.id },
        data: { status: "processed", processedAt: new Date(), lastError: null },
      });
      processed++;
    } catch (err) {
      const attempts = event.attempts + 1;
      const dead = attempts >= 8;
      await prismaUnscoped.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: dead ? "dead_letter" : "failed",
          lastError: err instanceof Error ? err.message.slice(0, 500) : "outbox_failed",
          nextAttemptAt: new Date(Date.now() + backoff(attempts)),
        },
      });
    }
  }
  return { scanned: due.length, processed };
}

async function dispatchOutbox(event: {
  id: string;
  pharmacyId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
}) {
  await enqueueJob({
    type: "webhook.dispatch",
    pharmacyId: event.pharmacyId,
    payload: { outboxId: event.id, eventType: event.eventType, payload: event.payload },
  });
  if (event.eventType.startsWith("notification.") || event.eventType.endsWith(".notify")) {
    await enqueueJob({
      type: "notification.deliver",
      pharmacyId: event.pharmacyId,
      payload: { outboxId: event.id, payload: event.payload },
    });
  }
}
