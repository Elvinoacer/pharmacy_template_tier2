import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPharmacy, withPlatformBypass } from "@/app/lib/tenant-context";

export async function enqueueJob(input: {
  type: string;
  pharmacyId?: string | null;
  payload?: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}) {
  return prismaUnscoped.job.create({
    data: {
      type: input.type,
      pharmacyId: input.pharmacyId ?? null,
      payload: (input.payload ?? {}) as object,
      runAt: input.runAt ?? new Date(),
      maxAttempts: input.maxAttempts ?? 8,
      status: "queued",
    },
  });
}

function backoff(attempts: number) {
  return Math.min(60 * 60 * 1000, 1500 * 2 ** Math.min(attempts, 10));
}

const STALE_MS = 15 * 60 * 1000;

export async function recoverStaleJobs() {
  const cutoff = new Date(Date.now() - STALE_MS);
  const res = await prismaUnscoped.job.updateMany({
    where: { status: "running", lockedAt: { lt: cutoff } },
    data: {
      status: "failed",
      lastError: "stale_lock_recovered",
      lockedAt: null,
      lockedBy: null,
      runAt: new Date(),
    },
  });
  return res.count;
}

export async function processJobBatch(limit = 25, workerId = `w-${process.pid}`) {
  await recoverStaleJobs();
  const due = await prismaUnscoped.job.findMany({
    where: {
      status: { in: ["queued", "failed"] },
      runAt: { lte: new Date() },
    },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  let ok = 0;
  let failed = 0;
  for (const job of due) {
    const locked = await prismaUnscoped.job.updateMany({
      where: { id: job.id, status: { in: ["queued", "failed"] } },
      data: { status: "running", lockedAt: new Date(), lockedBy: workerId, startedAt: new Date() },
    });
    if (locked.count === 0) continue;

    const attemptNo = job.attempts + 1;
    await prismaUnscoped.jobAttempt.create({
      data: { jobId: job.id, attempt: attemptNo },
    });

    try {
      const run = async () => {
        await executeJob(job.type, (job.payload as Record<string, unknown>) ?? {}, job.pharmacyId);
      };
      if (job.pharmacyId) await withPharmacy(job.pharmacyId, run);
      else await withPlatformBypass(run);

      await prismaUnscoped.job.update({
        where: { id: job.id },
        data: { status: "succeeded", completedAt: new Date(), lastError: null, attempts: attemptNo },
      });
      ok++;
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 500) : "job_failed";
      const dead = attemptNo >= job.maxAttempts;
      await prismaUnscoped.job.update({
        where: { id: job.id },
        data: {
          status: dead ? "dead_letter" : "failed",
          attempts: attemptNo,
          lastError: message,
          runAt: new Date(Date.now() + backoff(attemptNo)),
          lockedAt: null,
          lockedBy: null,
        },
      });
      failed++;
    }
  }
  return { scanned: due.length, ok, failed };
}

async function executeJob(type: string, payload: Record<string, unknown>, pharmacyId: string | null) {
  if (type === "webhook.dispatch") {
    const { dispatchTenantWebhooks } = await import("@/app/lib/platform/webhooks");
    if (pharmacyId) await dispatchTenantWebhooks(pharmacyId, String(payload.eventType || "event"), payload);
    return;
  }
  if (type === "notification.deliver") {
    const { processQueuedDeliveries } = await import("@/app/lib/platform/notifications");
    await processQueuedDeliveries(pharmacyId, 20);
    return;
  }
  if (type === "billing.dunning") {
    const { applyDunning } = await import("@/app/lib/platform/billing");
    if (payload.invoiceId) await applyDunning(String(payload.invoiceId));
    return;
  }
  if (type === "meter.record") {
    const { recordUsage } = await import("@/app/lib/platform/metering");
    if (pharmacyId) {
      await recordUsage(pharmacyId, String(payload.metric || "unknown"), Number(payload.quantity || 1), {
        eventId: payload.eventId ? String(payload.eventId) : undefined,
      });
    }
    return;
  }
  if (type === "pos.sync" && pharmacyId) {
    const { runPosSync } = await import("@/app/lib/platform/pos-sync");
    await runPosSync(pharmacyId, (payload.medications as never) ?? [], payload.branchId ? String(payload.branchId) : null);
    return;
  }
  if (type === "data.export" && pharmacyId) {
    const { runDataExport } = await import("@/app/lib/platform/data-lifecycle");
    await runDataExport(pharmacyId, String(payload.requestId || ""));
    return;
  }
  if (type === "data.delete" && pharmacyId) {
    const { runDataDeletion } = await import("@/app/lib/platform/data-lifecycle");
    await runDataDeletion(pharmacyId, String(payload.requestId || ""));
    return;
  }
  if (type === "billing.cycle") {
    const { processSubscriptionCycle } = await import("@/app/lib/platform/billing");
    await processSubscriptionCycle();
    return;
  }
  console.warn("[jobs] unknown type", type);
}
