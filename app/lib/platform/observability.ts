import "server-only";

import { prismaUnscoped } from "@/app/lib/db";

export async function platformOpsSnapshot() {
  const [
    jobsQueued,
    jobsRunning,
    jobsFailed,
    jobsDead,
    outboxPending,
    outboxFailed,
    outboxDead,
    hooksPending,
    hooksRetrying,
    hooksDead,
    notifQueued,
    notifRetrying,
    notifDead,
    openInvoices,
    dunning,
    posConflicts,
    posFailed,
    billingFailed,
  ] = await Promise.all([
    prismaUnscoped.job.count({ where: { status: "queued" } }),
    prismaUnscoped.job.count({ where: { status: "running" } }),
    prismaUnscoped.job.count({ where: { status: "failed" } }),
    prismaUnscoped.job.count({ where: { status: "dead_letter" } }),
    prismaUnscoped.outboxEvent.count({ where: { status: "pending" } }),
    prismaUnscoped.outboxEvent.count({ where: { status: "failed" } }),
    prismaUnscoped.outboxEvent.count({ where: { status: "dead_letter" } }),
    prismaUnscoped.webhookDelivery.count({ where: { status: "pending" } }),
    prismaUnscoped.webhookDelivery.count({ where: { status: "retrying" } }),
    prismaUnscoped.webhookDelivery.count({ where: { status: "dead_letter" } }),
    prismaUnscoped.notificationDelivery.count({ where: { status: "queued" } }),
    prismaUnscoped.notificationDelivery.count({ where: { status: "retrying" } }),
    prismaUnscoped.notificationDelivery.count({ where: { status: "dead_letter" } }),
    prismaUnscoped.invoice.count({ where: { status: "open" } }),
    prismaUnscoped.dunningCase.count({ where: { status: { notIn: ["resolved", "written_off"] } } }),
    prismaUnscoped.inventorySyncConflict.count({ where: { status: "open" } }),
    prismaUnscoped.job.count({ where: { type: "pos.sync", status: { in: ["failed", "dead_letter"] } } }),
    prismaUnscoped.billingPayment.count({ where: { status: "failed" } }),
  ]);

  return {
    jobs: { queued: jobsQueued, running: jobsRunning, failed: jobsFailed, deadLetter: jobsDead },
    outbox: { pending: outboxPending, failed: outboxFailed, deadLetter: outboxDead },
    webhooks: { pending: hooksPending, retrying: hooksRetrying, deadLetter: hooksDead },
    notifications: { queued: notifQueued, retrying: notifRetrying, deadLetter: notifDead },
    billing: { openInvoices, dunning, failedCollections: billingFailed },
    pos: { openConflicts: posConflicts, failedSyncJobs: posFailed },
  };
}
