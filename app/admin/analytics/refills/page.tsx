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
import { RefreshCw, AlertTriangle, Wallet, Activity } from "lucide-react";

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
    <AnalyticsShell user={user}
      title="Refill report"
      description="Follow refill progress, turnaround time, and revenue."
      period={period}
      basePath="/admin/analytics/refills"
    >
      <StatGrid>
        <AdminCard label="Total Requests" value={formatNumber(metrics.totalRequests)} icon={RefreshCw} accent="info" />
        <AdminCard label="Collected" value={formatNumber(metrics.collected)} hint={`Conversion ${formatPct(metrics.conversionRate)}`} icon={RefreshCw} accent="info" />
        <AdminCard label="Revenue" value={formatKES(metrics.revenue)} icon={Wallet} accent="accent" />
        <AdminCard label="Avg Turnaround" value={`${(metrics.averageTurnaroundMinutes / 60).toFixed(1)}h`} icon={Activity} accent="neutral" />
      </StatGrid>
      <StatGrid>
        <AdminCard label="Approved" value={formatNumber(metrics.approved)} icon={RefreshCw} accent="neutral" />
        <AdminCard label="Preparing" value={formatNumber(metrics.preparing)} icon={RefreshCw} accent="neutral" />
        <AdminCard label="Ready" value={formatNumber(metrics.ready)} icon={RefreshCw} accent="neutral" />
        <AdminCard label="Cancelled" value={formatNumber(metrics.cancelled)} icon={AlertTriangle} accent="danger" />
      </StatGrid>
      <StatGrid>
        <AdminCard label="Paid" value={formatNumber(metrics.paid)} icon={Wallet} accent="info" />
        <AdminCard label="Unpaid" value={formatNumber(metrics.unpaid)} icon={AlertTriangle} accent="danger" />
      </StatGrid>

      <AdminPanel title="By Source">
        <div className="space-y-1.5 text-xs">
          {Object.entries(metrics.bySource).map(([src, n]) => (
            <div key={src} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
              <span className="admin-muted">{src}</span>
              <strong className="admin-text">{n}</strong>
            </div>
          ))}
          {Object.keys(metrics.bySource).length === 0 && <p className="admin-muted">No refill requests in this period.</p>}
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}
