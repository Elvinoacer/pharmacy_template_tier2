import { prismaUnscoped } from "@/app/lib/db";
import { PlatformPage, PlatformTable } from "@/app/platform/_components/PlatformPage";
import { platformOpsSnapshot } from "@/app/lib/platform/observability";

export const metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const [jobs, outbox, ops] = await Promise.all([
    prismaUnscoped.job.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    prismaUnscoped.outboxEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    platformOpsSnapshot().catch(() => null),
  ]);

  return (
    <PlatformPage title="Jobs & outbox" description="Background work, retries and dead letters across the network.">
      {ops ? (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Jobs queued / running / dead", `${ops.jobs.queued} / ${ops.jobs.running} / ${ops.jobs.deadLetter}`],
            ["Outbox pending / failed / dead", `${ops.outbox.pending} / ${ops.outbox.failed} / ${ops.outbox.deadLetter}`],
            ["Webhooks pending / retry / dead", `${ops.webhooks.pending} / ${ops.webhooks.retrying} / ${ops.webhooks.deadLetter}`],
            ["Notifications queued / retry / dead", `${ops.notifications.queued} / ${ops.notifications.retrying} / ${ops.notifications.deadLetter}`],
            ["Open invoices / dunning", `${ops.billing.openInvoices} / ${ops.billing.dunning}`],
            ["POS conflicts / failed syncs", `${ops.pos.openConflicts} / ${ops.pos.failedSyncJobs}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-teal-100/60">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold">Jobs</h2>
      <PlatformTable
        headers={["Type", "Tenant", "Status", "Progress", "Attempts", "Error"]}
        empty="No jobs queued."
        rows={jobs.map((j) => [
          j.type,
          j.pharmacyId?.slice(0, 8) || "platform",
          j.status,
          `${j.progress ?? 0}%`,
          String(j.attempts),
          j.lastError || "—",
        ])}
      />
      <h2 className="mb-3 mt-8 text-lg font-semibold">Outbox</h2>
      <PlatformTable
        headers={["Event", "Aggregate", "Status", "Attempts"]}
        empty="Outbox is empty."
        rows={outbox.map((e) => [
          e.eventType,
          `${e.aggregateType}:${e.aggregateId.slice(0, 8)}`,
          e.status,
          String(e.attempts),
        ])}
      />
    </PlatformPage>
  );
}
