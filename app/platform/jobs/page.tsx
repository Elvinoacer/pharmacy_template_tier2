import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
  PlatformTable,
} from "@/app/platform/_components/PlatformPage";
import { platformOpsSnapshot } from "@/app/lib/platform/observability";

export const metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const danger = normalized.includes("dead") || normalized.includes("fail") || normalized.includes("error");
  const success = normalized.includes("complete") || normalized.includes("sent") || normalized.includes("success") || normalized.includes("done");
  const active = normalized.includes("run") || normalized.includes("process") || normalized.includes("retry");
  const className = danger
    ? "bg-rose-500/10 text-rose-700 ring-rose-500/20"
    : success
      ? "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20"
      : active
        ? "bg-sky-500/10 text-sky-700 ring-sky-500/20"
        : "bg-[var(--admin-inset-2)] text-[var(--admin-text-muted)] ring-[var(--admin-border)]";

  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${className}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function Progress({ value }: { value: number }) {
  const safe = Math.min(Math.max(value, 0), 100);
  return (
    <div className="min-w-28">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-[var(--admin-text-muted)]">
        <span>{safe}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-inset-2)]">
        <div className="h-full rounded-full bg-[var(--admin-accent)] transition-[width] duration-300" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export default async function JobsPage() {
  const [jobs, outbox, ops] = await Promise.all([
    prismaUnscoped.job.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    prismaUnscoped.outboxEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    platformOpsSnapshot().catch(() => null),
  ]);

  const recentFailures = jobs.filter((job) => {
    const status = job.status.toLowerCase();
    return status.includes("dead") || status.includes("fail") || Boolean(job.lastError);
  }).length;
  const outboxProblems = outbox.filter((event) => {
    const status = event.status.toLowerCase();
    return status.includes("dead") || status.includes("fail");
  }).length;

  return (
    <PlatformPage
      eyebrow="Async operations"
      title="Jobs & outbox"
      description="See network background work, retries and dead letters in one operational queue. Failures and stalled work are prioritized visually."
    >
      {ops ? (
        <PlatformSection
          title="Operational pulse"
          description="Current workload across the network. Each value reads as active / retry-or-problem / dead-letter where applicable."
        >
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
            <PlatformStat label="Jobs · queued / running / dead" value={`${ops.jobs.queued} / ${ops.jobs.running} / ${ops.jobs.deadLetter}`} detail="Background workers" tone={ops.jobs.deadLetter ? "danger" : "default"} />
            <PlatformStat label="Outbox · pending / failed / dead" value={`${ops.outbox.pending} / ${ops.outbox.failed} / ${ops.outbox.deadLetter}`} detail="Domain delivery" tone={ops.outbox.failed || ops.outbox.deadLetter ? "danger" : "default"} />
            <PlatformStat label="Webhooks · pending / retry / dead" value={`${ops.webhooks.pending} / ${ops.webhooks.retrying} / ${ops.webhooks.deadLetter}`} detail="External callbacks" tone={ops.webhooks.deadLetter ? "danger" : "default"} />
            <PlatformStat label="Messages · queued / retry / dead" value={`${ops.notifications.queued} / ${ops.notifications.retrying} / ${ops.notifications.deadLetter}`} detail="Notification delivery" tone={ops.notifications.deadLetter ? "danger" : "default"} />
            <PlatformStat label="Billing · open / dunning" value={`${ops.billing.openInvoices} / ${ops.billing.dunning}`} detail="Invoice recovery" tone={ops.billing.dunning ? "warning" : "default"} />
            <PlatformStat label="POS · conflicts / failed" value={`${ops.pos.openConflicts} / ${ops.pos.failedSyncJobs}`} detail="Inventory synchronization" tone={ops.pos.openConflicts || ops.pos.failedSyncJobs ? "warning" : "default"} />
          </div>
        </PlatformSection>
      ) : (
        <div className="mb-7 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 text-sm text-[var(--admin-text-muted)] shadow-[var(--admin-shadow)]">
          Live operational counters are temporarily unavailable. Recent jobs and outbox events are still shown below.
        </div>
      )}

      {(recentFailures > 0 || outboxProblems > 0) ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/8 p-3.5 sm:p-4">
          <p className="text-sm font-semibold text-[var(--admin-text)]">Recent failures need review</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--admin-text-muted)]">
            {recentFailures} job{recentFailures === 1 ? "" : "s"} and {outboxProblems} outbox event{outboxProblems === 1 ? "" : "s"} in the current view report failure states.
          </p>
        </div>
      ) : null}

      <PlatformSection
        title="Recent jobs"
        description="Progress, retry count and the latest worker error are kept together for faster diagnosis."
        className={ops ? "mt-8" : "mt-6"}
      >
        <PlatformTable
          headers={["Job type", "Tenant", "Status", "Progress", "Attempts", "Latest error"]}
          empty="No background jobs are queued."
          rows={jobs.map((job) => [
            <span key={`${job.id}-type`} className="font-mono text-xs font-semibold text-[var(--admin-text)]">{job.type}</span>,
            <span key={`${job.id}-tenant`} className="font-mono text-xs text-[var(--admin-text-muted)]">{job.pharmacyId?.slice(0, 8) || "platform"}</span>,
            <StatusPill key={`${job.id}-status`} status={job.status} />,
            <Progress key={`${job.id}-progress`} value={job.progress ?? 0} />,
            <span key={`${job.id}-attempts`} className="tabular-nums">{job.attempts}</span>,
            job.lastError ? (
              <span key={`${job.id}-error`} className="block max-w-80 break-words text-xs text-rose-700" title={job.lastError}>{job.lastError}</span>
            ) : (
              <span key={`${job.id}-error`} className="text-[var(--admin-text-soft)]">None</span>
            ),
          ])}
        />
      </PlatformSection>

      <PlatformSection
        title="Outbox delivery"
        description="Domain events waiting for downstream delivery or retry."
        className="mt-8"
      >
        <PlatformTable
          headers={["Event", "Aggregate", "Status", "Attempts"]}
          empty="The outbox is empty."
          rows={outbox.map((event) => [
            <span key={`${event.id}-event`} className="font-mono text-xs font-semibold text-[var(--admin-text)]">{event.eventType}</span>,
            <span key={`${event.id}-aggregate`} className="font-mono text-xs text-[var(--admin-text-muted)]">{event.aggregateType}:{event.aggregateId.slice(0, 8)}</span>,
            <StatusPill key={`${event.id}-status`} status={event.status} />,
            <span key={`${event.id}-attempts`} className="tabular-nums">{event.attempts}</span>,
          ])}
        />
      </PlatformSection>
    </PlatformPage>
  );
}
