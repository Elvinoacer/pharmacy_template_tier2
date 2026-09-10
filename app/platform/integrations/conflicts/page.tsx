import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
  PlatformTable,
} from "@/app/platform/_components/PlatformPage";
import { resolvePosConflictAction } from "@/app/actions/platform";

export const metadata = { title: "POS conflicts" };
export const dynamic = "force-dynamic";

function JobStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const problem = normalized.includes("fail") || normalized.includes("dead") || normalized.includes("error");
  const active = normalized.includes("run") || normalized.includes("process");
  const success = normalized.includes("complete") || normalized.includes("success") || normalized.includes("done");

  const className = problem
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
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium text-[var(--admin-text-muted)]">
        <span>{safe}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--admin-inset-2)]">
        <div className="h-full rounded-full bg-[var(--admin-accent)] transition-[width] duration-300" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export default async function PosConflictsPage() {
  const [jobs, conflicts] = await Promise.all([
    prismaUnscoped.job
      .findMany({
        where: { type: "pos.sync" },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { pharmacy: { select: { name: true } } },
      })
      .catch(() => []),
    prismaUnscoped.inventorySyncConflict
      .findMany({
        where: { status: "open" },
        orderBy: { createdAt: "desc" },
        take: 80,
        include: { pharmacy: { select: { name: true } } },
      })
      .catch(() => []),
  ]);

  const failedJobs = jobs.filter((job) => {
    const status = job.status.toLowerCase();
    return status.includes("fail") || status.includes("dead") || Boolean(job.lastError);
  }).length;
  const activeJobs = jobs.filter((job) => {
    const status = job.status.toLowerCase();
    return status.includes("run") || status.includes("queue") || status.includes("process");
  }).length;
  const stockDelta = conflicts.reduce((sum, conflict) => sum + Math.abs(conflict.platformStock - conflict.posStock), 0);

  return (
    <PlatformPage
      eyebrow="Inventory reconciliation"
      title="POS sync conflicts"
      description="Resolve stock mismatches deliberately. Compare platform and POS quantities first, then choose the system that should become authoritative."
    >
      <div className="mb-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <PlatformStat label="Open conflicts" value={conflicts.length} detail="Awaiting a decision" tone={conflicts.length ? "warning" : "success"} />
        <PlatformStat label="Stock variance" value={stockDelta} detail="Absolute units disputed" tone={stockDelta ? "warning" : "default"} />
        <PlatformStat label="Active sync jobs" value={activeJobs} detail="Queued or processing" />
        <PlatformStat label="Failed jobs" value={failedJobs} detail="Recent POS sync failures" tone={failedJobs ? "danger" : "default"} />
      </div>

      <PlatformSection
        title="Open conflicts"
        description="Resolve the inventory decision first; destructive-looking actions remain visually distinct and touch targets stay large on mobile."
      >
        <PlatformTable
          headers={["Pharmacy", "SKU", "Platform stock", "POS stock", "Decision"]}
          empty="No open POS conflicts. Inventory is reconciled."
          rows={conflicts.map((conflict) => [
            <span key={`${conflict.id}-pharmacy`} className="font-semibold text-[var(--admin-text)]">{conflict.pharmacy.name}</span>,
            <span key={`${conflict.id}-sku`} className="font-mono text-xs">{conflict.sku || conflict.inventoryId.slice(0, 8)}</span>,
            <span key={`${conflict.id}-platform`} className="font-semibold tabular-nums">{conflict.platformStock}</span>,
            <span key={`${conflict.id}-pos`} className="font-semibold tabular-nums">{conflict.posStock}</span>,
            <form
              key={`${conflict.id}-actions`}
              action={resolvePosConflictAction}
              className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:flex-wrap"
            >
              <input type="hidden" name="conflictId" value={conflict.id} />
              <button
                name="action"
                value="accept_pos"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--admin-accent)] px-3 text-[11px] font-semibold text-[var(--admin-btn-fg)] shadow-sm transition hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-card)]"
              >
                Use POS stock
              </button>
              <button
                name="action"
                value="accept_platform"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-card-2)] px-3 text-[11px] font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
              >
                Keep platform
              </button>
              <button
                name="action"
                value="ignore"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-500/12 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
              >
                Ignore mismatch
              </button>
            </form>,
          ])}
        />
      </PlatformSection>

      <PlatformSection
        title="Recent POS sync jobs"
        description="Use job progress and the latest error to diagnose why conflicts were created."
        className="mt-8"
      >
        <PlatformTable
          headers={["Pharmacy", "Status", "Progress", "Attempts", "Latest error"]}
          empty="No POS sync jobs have run yet."
          rows={jobs.map((job) => [
            <span key={`${job.id}-pharmacy`} className="font-semibold text-[var(--admin-text)]">{job.pharmacy?.name || "Platform"}</span>,
            <JobStatus key={`${job.id}-status`} status={job.status} />,
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
    </PlatformPage>
  );
}
