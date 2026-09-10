import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeRefillMetrics } from "@/app/lib/services/analytics/refills";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  formatNumber,
  formatPct,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { RefreshCw, AlertTriangle, Wallet, Activity, CheckCircle2, Clock3 } from "lucide-react";

export const metadata = { title: "Refill Analytics" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function RefillsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const metrics = await computeRefillMetrics(range);

  return (
    <AnalyticsShell
      user={user}
      title="Refill report"
      description="Follow refill progress, turnaround time, payment health, and revenue."
      period={period}
      basePath="/admin/analytics/refills"
    >
      <StatGrid>
        <AdminCard label="Total Requests" value={formatNumber(metrics.totalRequests)} hint="Requests received" icon={RefreshCw} accent="info" />
        <AdminCard label="Collected" value={formatNumber(metrics.collected)} hint={`Conversion ${formatPct(metrics.conversionRate)}`} icon={CheckCircle2} accent="accent" />
        <AdminCard label="Revenue" value={formatKES(metrics.revenue)} hint="Collected refill revenue" icon={Wallet} accent="accent" />
        <AdminCard label="Avg Turnaround" value={`${(metrics.averageTurnaroundMinutes / 60).toFixed(1)}h`} hint="Request to completion" icon={Activity} accent="neutral" />
      </StatGrid>

      <AdminPanel title="Refill pipeline" description="Operational status of refill requests in the selected period.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <PipelineStat label="Approved" value={metrics.approved} icon={CheckCircle2} />
          <PipelineStat label="Preparing" value={metrics.preparing} icon={Clock3} />
          <PipelineStat label="Ready" value={metrics.ready} icon={RefreshCw} />
          <PipelineStat label="Cancelled" value={metrics.cancelled} icon={AlertTriangle} danger />
        </div>
      </AdminPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminPanel title="Payment health" description="Spot refill requests that may need collection follow-up.">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Paid" value={formatNumber(metrics.paid)} />
            <MiniStat label="Unpaid" value={formatNumber(metrics.unpaid)} danger={metrics.unpaid > 0} />
          </div>
        </AdminPanel>

        <AdminPanel title="By source" description="Where refill demand is entering the pharmacy.">
          {Object.keys(metrics.bySource).length === 0 ? (
            <p className="text-xs admin-muted">No refill requests in this period.</p>
          ) : (
            <div className="grid gap-2 min-[420px]:grid-cols-2">
              {Object.entries(metrics.bySource).map(([src, n]) => (
                <div key={src} className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 transition-[border-color,box-shadow] duration-200 hover:border-[var(--admin-accent)] motion-reduce:transition-none">
                  <p className="truncate text-xs font-medium admin-muted" title={src}>{src}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight admin-text">{formatNumber(n)}</p>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
    </AnalyticsShell>
  );
}

function PipelineStat({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-[var(--admin-border)] p-3 ${danger ? "bg-[var(--admin-danger-soft)]" : "bg-[var(--admin-card)]"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide admin-muted sm:text-xs">{label}</p>
        <Icon className={`h-4 w-4 shrink-0 ${danger ? "text-rose-600 dark:text-rose-300" : "admin-soft"}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${danger ? "text-rose-700 dark:text-rose-300" : "admin-text"}`}>{formatNumber(value)}</p>
    </div>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-xl border border-[var(--admin-border)] p-3 ${danger ? "bg-[var(--admin-danger-soft)]" : "bg-[var(--admin-card)]"}`}>
      <p className="text-xs font-medium admin-muted">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold ${danger ? "text-rose-700 dark:text-rose-300" : "admin-text"}`}>{value}</p>
    </div>
  );
}
