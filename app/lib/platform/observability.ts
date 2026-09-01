import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { boundTenant } from "@/app/lib/tenant-context";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type StructuredLog = {
  timestamp: string;
  level: LogLevel;
  message: string;
  pharmacyId?: string | null;
  correlationId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

export function logEvent(
  level: LogLevel,
  message: string,
  opts?: {
    correlationId?: string;
    context?: Record<string, unknown>;
    error?: unknown;
  },
) {
  const tenant = boundTenant();
  const entry: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    pharmacyId: tenant?.pharmacyId ?? null,
    correlationId: opts?.correlationId,
    context: opts?.context,
  };

  if (opts?.error instanceof Error) {
    entry.error = {
      name: opts.error.name,
      message: opts.error.message,
      stack: process.env.NODE_ENV === "development" ? opts.error.stack : undefined,
    };
  }

  const json = JSON.stringify(entry);
  if (level === "error") {
    console.error(json);
  } else if (level === "warn") {
    console.warn(json);
  } else {
    console.log(json);
  }
}

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
    timestamp: new Date().toISOString(),
    jobs: { queued: jobsQueued, running: jobsRunning, failed: jobsFailed, deadLetter: jobsDead },
    outbox: { pending: outboxPending, failed: outboxFailed, deadLetter: outboxDead },
    webhooks: { pending: hooksPending, retrying: hooksRetrying, deadLetter: hooksDead },
    notifications: { queued: notifQueued, retrying: notifRetrying, deadLetter: notifDead },
    billing: { openInvoices, dunning, failedCollections: billingFailed },
    pos: { openConflicts: posConflicts, failedSyncJobs: posFailed },
  };
}

export async function platformHealthCheck(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: boolean;
    rlsRuntimeRole: boolean;
    queueBacklog: number;
    deadLetters: number;
  };
}> {
  let database = false;
  let rlsRuntimeRole = false;

  try {
    const res = await prismaUnscoped.$queryRaw<Array<{ db_ok: number; role_name: string }>>`
      SELECT 1 AS db_ok, current_user AS role_name
    `;
    database = Boolean(res[0]?.db_ok === 1);
    rlsRuntimeRole = true;
  } catch {
    database = false;
  }

  const snapshot = await platformOpsSnapshot().catch(() => null);
  const queueBacklog = (snapshot?.jobs.queued ?? 0) + (snapshot?.outbox.pending ?? 0);
  const deadLetters =
    (snapshot?.jobs.deadLetter ?? 0) +
    (snapshot?.webhooks.deadLetter ?? 0) +
    (snapshot?.notifications.deadLetter ?? 0);

  let status: "healthy" | "degraded" | "unhealthy" = "healthy";
  if (!database) {
    status = "unhealthy";
  } else if (deadLetters > 50 || queueBacklog > 500) {
    status = "degraded";
  }

  return {
    status,
    checks: {
      database,
      rlsRuntimeRole,
      queueBacklog,
      deadLetters,
    },
  };
}
