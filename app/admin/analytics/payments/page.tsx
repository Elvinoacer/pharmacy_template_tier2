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
    <AnalyticsShell user={user}
      title="Payment Analytics"
      description="Payment attempts, success/failure rates, collected by provider, and outstanding receivables with aging."
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
        <AdminCard label="Outstanding" value={formatKES(metrics.outstanding)} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Refunds" value={formatKES(metrics.refundsTotal)} icon={Scale} accent="neutral" />
        <AdminCard label="Avg Attempts / Order" value={metrics.averageAttemptsPerOrder.toFixed(1)} icon={Activity} accent="neutral" />
      </StatGrid>

      <AdminPanel title="Collected by Provider">
        <div className="space-y-1.5 text-xs">
          {Object.entries(metrics.collectedByProvider).map(([prov, amt]) => (
            <div key={prov} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
              <span className="admin-muted uppercase">{prov}</span>
              <strong className="admin-text">{formatKES(amt)}</strong>
            </div>
          ))}
          {Object.keys(metrics.collectedByProvider).length === 0 && <p className="admin-muted">No completed payments in this period.</p>}
        </div>
      </AdminPanel>

      <AdminPanel title="Outstanding Aging" description="Who owes the pharmacy money, broken down by order age.">
        <p className="text-2xl font-bold admin-text">{formatKES(aging.total)}</p>
        <div className="mt-4 space-y-2 text-xs">
          {aging.buckets.map((b) => (
            <div key={b.label} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
              <span className="admin-muted">{b.label}</span>
              <span className="admin-text"><strong>{formatKES(b.amount)}</strong> · {b.count} orders</span>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="Top Outstanding Customers">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left admin-muted border-b border-[var(--admin-border)]">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4 text-right">Outstanding</th>
                <th className="py-2 pr-4 text-right">Oldest (days)</th>
              </tr>
            </thead>
            <tbody>
              {aging.topCustomers.map((c) => (
                <tr key={c.customerId} className="border-b border-[var(--admin-border)]">
                  <td className="py-2 pr-4 admin-text">{c.customerName}</td>
                  <td className="py-2 pr-4 text-right admin-text font-semibold">{formatKES(c.amount)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{c.oldestDays}</td>
                </tr>
              ))}
              {aging.topCustomers.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center admin-muted">No outstanding balances.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}
