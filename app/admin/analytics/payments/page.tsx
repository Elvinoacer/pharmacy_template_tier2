import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computePaymentMetrics, computeOutstandingAging } from "@/app/lib/services/analytics/payments";
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
import { Wallet, Activity, AlertTriangle, RefreshCw, Scale } from "lucide-react";

export const metadata = { title: "Payment Analytics" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function PaymentsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const [metrics, aging] = await Promise.all([computePaymentMetrics(range), computeOutstandingAging()]);

  return (
    <AnalyticsShell
      user={user}
      title="Payments & balances"
      description="Review payment results, collections, and outstanding balances."
      period={period}
      basePath="/admin/analytics/payments"
    >
      <StatGrid>
        <AdminCard label="Total Attempts" value={formatNumber(metrics.totalAttempts)} icon={Activity} accent="neutral" />
        <AdminCard label="Successful" value={formatNumber(metrics.successful)} hint={`Success rate ${formatPct(metrics.successRate)}`} icon={Wallet} accent="info" />
        <AdminCard label="Failed" value={formatNumber(metrics.failed)} hint={`Failure rate ${formatPct(metrics.failureRate)}`} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Pending" value={formatNumber(metrics.pending)} icon={RefreshCw} accent="neutral" />
      </StatGrid>

      <StatGrid>
        <AdminCard label="Outstanding" value={formatKES(metrics.outstanding)} hint="Open order balances" icon={AlertTriangle} accent="danger" />
        <AdminCard label="Refunds" value={formatKES(metrics.refundsTotal)} icon={Scale} accent="neutral" />
        <AdminCard label="Avg Attempts / Order" value={metrics.averageAttemptsPerOrder.toFixed(1)} icon={Activity} accent="neutral" />
      </StatGrid>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <AdminPanel title="Collected by Provider" description="Completed collections grouped by payment channel.">
          <div className="space-y-2 text-sm">
            {Object.entries(metrics.collectedByProvider).map(([prov, amt]) => (
              <MetricRow key={prov} label={prov.toUpperCase()} value={formatKES(amt)} />
            ))}
            {Object.keys(metrics.collectedByProvider).length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-6 text-center admin-muted">
                No completed payments in this period.
              </p>
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="Outstanding Aging" description="Open balances grouped by how long they have remained unpaid.">
          <div className="mb-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] admin-muted">Total outstanding</p>
            <p className="mt-1 break-words text-2xl font-bold tracking-tight admin-text sm:text-3xl">{formatKES(aging.total)}</p>
          </div>
          <div className="space-y-2 text-sm">
            {aging.buckets.map((b) => (
              <MetricRow key={b.label} label={b.label} value={formatKES(b.amount)} meta={`${b.count} orders`} />
            ))}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        title="Top Outstanding Customers"
        description="Prioritize follow-up by balance size and age."
      >
        <div className="space-y-2 md:hidden">
          {aging.topCustomers.map((c) => (
            <article
              key={c.customerId}
              className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] hover:shadow-sm motion-reduce:transition-none"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold admin-text">{c.customerName}</p>
                  <p className="mt-1 text-sm admin-muted">Oldest balance · {c.oldestDays} days</p>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-1.5 text-sm font-semibold admin-muted">
                  Due
                </span>
              </div>
              <p className="mt-4 break-words text-xl font-bold tracking-tight admin-text">{formatKES(c.amount)}</p>
            </article>
          ))}
          {aging.topCustomers.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--admin-border)] px-4 py-8 text-center text-sm admin-muted">
              No outstanding balances.
            </p>
          )}
        </div>

        <div tabIndex={0} role="region" aria-label="Outstanding customer records" className="admin-table-region hidden overflow-x-auto md:block">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-left admin-muted">
                <th>Customer</th>
                <th className="text-right">Outstanding</th>
                <th className="text-right">Oldest (days)</th>
              </tr>
            </thead>
            <tbody>
              {aging.topCustomers.map((c) => (
                <tr key={c.customerId} className="border-b border-[var(--admin-border)] transition-colors duration-150 hover:bg-[var(--admin-hover)] motion-reduce:transition-none">
                  <td className="admin-text">{c.customerName}</td>
                  <td className="text-right font-semibold admin-text">{formatKES(c.amount)}</td>
                  <td className="text-right admin-muted">{c.oldestDays}</td>
                </tr>
              ))}
              {aging.topCustomers.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center admin-muted">No outstanding balances.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}

function MetricRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-3 transition-[border-color,background-color] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="break-words font-medium admin-muted">{label}</span>
      <span className="min-w-0 sm:text-right">
        <strong className="block break-words text-sm admin-text">{value}</strong>
        {meta && <small className="mt-0.5 block text-sm admin-muted">{meta}</small>}
      </span>
    </div>
  );
}
