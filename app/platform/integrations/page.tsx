import Link from "next/link";
import { prismaUnscoped } from "@/app/lib/db";
import {
  PlatformPage,
  PlatformSection,
  PlatformStat,
  PlatformTable,
} from "@/app/platform/_components/PlatformPage";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

type HealthTone = "healthy" | "idle" | "missing" | "error";

function HealthState({ label, tone, detail }: { label: string; tone: HealthTone; detail?: string | null }) {
  const classes: Record<HealthTone, string> = {
    healthy: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20",
    idle: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
    missing: "bg-[var(--admin-inset-2)] text-[var(--admin-text-muted)] ring-[var(--admin-border)]",
    error: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
  };

  return (
    <div className="min-w-0">
      <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-inset ${classes[tone]}`}>
        {label}
      </span>
      {detail ? (
        <p className="mt-1.5 max-w-64 break-words text-[11px] leading-4 text-[var(--admin-text-muted)]" title={detail}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export default async function IntegrationsPage() {
  const [rows, openConflicts] = await Promise.all([
    prismaUnscoped.pharmacyIntegration
      .findMany({
        include: { pharmacy: { select: { name: true, slug: true } } },
        orderBy: { updatedAt: "desc" },
        take: 100,
      })
      .catch(() => []),
    prismaUnscoped.inventorySyncConflict.count({ where: { status: "open" } }).catch(() => 0),
  ]);

  const withErrors = rows.filter((row) => row.darajaLastError || row.commsLastError || row.posLastError).length;
  const fullyHealthy = rows.filter(
    (row) =>
      row.darajaShortcode &&
      !row.darajaLastError &&
      !row.commsLastError &&
      !row.posLastError &&
      Boolean(row.commsLastSuccessAt || row.posLastSyncAt),
  ).length;

  return (
    <PlatformPage
      eyebrow="Connectivity"
      title="Integration health"
      description="Monitor tenant payment, communication and POS connections. Prioritize failures and unresolved inventory sync conflicts first."
      actions={
        <Link
          href="/platform/integrations/conflicts"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-3.5 text-sm font-semibold text-[var(--admin-text)] shadow-[var(--admin-shadow)] transition hover:bg-[var(--admin-hover)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
        >
          Review conflicts{openConflicts ? ` · ${openConflicts}` : ""}
        </Link>
      }
    >
      <div className="mb-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <PlatformStat label="Tenant connections" value={rows.length} detail="Most recently updated" />
        <PlatformStat label="Healthy" value={fullyHealthy} detail="No active errors" tone="success" />
        <PlatformStat label="Needs attention" value={withErrors} detail="Integration errors" tone={withErrors ? "danger" : "default"} />
        <PlatformStat label="POS conflicts" value={openConflicts} detail="Open stock decisions" tone={openConflicts ? "warning" : "default"} />
      </div>

      {withErrors > 0 || openConflicts > 0 ? (
        <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--admin-text)]">Operational attention required</p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--admin-text-muted)]">
              {withErrors} tenant connection{withErrors === 1 ? "" : "s"} reporting errors and {openConflicts} unresolved POS conflict{openConflicts === 1 ? "" : "s"}.
            </p>
          </div>
          {openConflicts > 0 ? (
            <Link href="/platform/integrations/conflicts" className="shrink-0 text-xs font-semibold text-amber-700 underline-offset-4 hover:underline">
              Resolve POS conflicts →
            </Link>
          ) : null}
        </div>
      ) : null}

      <PlatformSection
        title="Tenant connectivity"
        description="Errors include the latest provider message; idle means the integration has not reported a recent successful operation."
      >
        <PlatformTable
          headers={["Pharmacy", "M-Pesa / Daraja", "Communications", "POS sync"]}
          empty="No tenant integration records are available yet."
          rows={rows.map((row) => [
            <div key={`${row.id}-pharmacy`} className="min-w-0">
              <p className="truncate font-semibold text-[var(--admin-text)]">{row.pharmacy.name}</p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--admin-text-soft)]">{row.pharmacy.slug}</p>
            </div>,
            row.darajaShortcode ? (
              row.darajaLastError ? (
                <HealthState key={`${row.id}-daraja`} label="Error" tone="error" detail={row.darajaLastError} />
              ) : (
                <HealthState key={`${row.id}-daraja`} label="Configured" tone="healthy" />
              )
            ) : (
              <HealthState key={`${row.id}-daraja`} label="Missing" tone="missing" />
            ),
            row.commsLastError ? (
              <HealthState key={`${row.id}-comms`} label="Error" tone="error" detail={row.commsLastError} />
            ) : row.commsLastSuccessAt ? (
              <HealthState key={`${row.id}-comms`} label="Healthy" tone="healthy" />
            ) : (
              <HealthState key={`${row.id}-comms`} label="Idle" tone="idle" />
            ),
            row.posLastError ? (
              <HealthState key={`${row.id}-pos`} label="Error" tone="error" detail={row.posLastError} />
            ) : row.posLastSyncAt ? (
              <HealthState key={`${row.id}-pos`} label="Synced" tone="healthy" />
            ) : (
              <HealthState key={`${row.id}-pos`} label="Idle" tone="idle" />
            ),
          ])}
        />
      </PlatformSection>
    </PlatformPage>
  );
}
