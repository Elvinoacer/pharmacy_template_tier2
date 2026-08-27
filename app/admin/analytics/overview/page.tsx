import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { getAnalyticsOverview, type OverviewPeriod } from "@/app/lib/services/analytics/overview";
import { AdminCard } from "@/app/components/admin/AdminUI";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  formatPct,
  formatNumber,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Package,
  Pill,
  RefreshCw,
  AlertTriangle,
  ShoppingCart,
  Activity,
  Scale,
} from "lucide-react";

export const metadata = { title: "Analytics Overview" };

const VALID_PERIODS: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function AnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID_PERIODS.includes(sp.period as PeriodOption) ? sp.period : "30d") as OverviewPeriod;

  const data = await getAnalyticsOverview(period);

  return (
    <AnalyticsShell user={user}
      title="Analytics Overview"
      description="Top-line numbers across the pharmacy for the selected period."
      period={period as PeriodOption}
      basePath="/admin/analytics/overview"
    >
      {/* Financial */}
      <StatGrid>
        <AdminCard
          label="Gross Sales"
          value={formatKES(data.financial.grossSales)}
          hint="Before discounts"
          icon={DollarSign}
          accent="accent"
        />
        <AdminCard
          label="Net Sales"
          value={formatKES(data.financial.netSales)}
          hint={`After ${formatKES(data.financial.discounts)} discounts & ${formatKES(data.financial.refunds)} refunds`}
          icon={TrendingUp}
          accent="accent"
        />
        <AdminCard
          label="Collected"
          value={formatKES(data.financial.collected)}
          hint="Completed payments − refunds"
          icon={Wallet}
          accent="info"
        />
        <AdminCard
          label="Outstanding"
          value={formatKES(data.financial.outstanding)}
          hint="Sum of amountDue on open orders"
          icon={AlertTriangle}
          accent="danger"
        />
      </StatGrid>

      <StatGrid>
        <AdminCard
          label="COGS"
          value={formatKES(data.financial.cogs)}
          hint="Cost of goods sold (snapshot at sale time)"
          icon={Package}
          accent="neutral"
        />
        <AdminCard
          label="Gross Profit"
          value={formatKES(data.financial.grossProfit)}
          hint="Net sales − COGS"
          icon={TrendingUp}
          accent="accent"
        />
        <AdminCard
          label="Gross Margin"
          value={formatPct(data.financial.grossMarginPct)}
          hint="Gross profit ÷ net sales"
          icon={Activity}
          accent="accent"
        />
        <AdminCard
          label="Waived Amount"
          value={formatKES(data.financial.waivedAmount)}
          hint="Not revenue — admin waivers"
          icon={Scale}
          accent="neutral"
        />
      </StatGrid>

      {/* Sales */}
      <StatGrid>
        <AdminCard
          label="Orders"
          value={formatNumber(data.sales.orders)}
          hint={`${formatNumber(data.sales.cancelledOrders)} cancelled (${formatKES(data.sales.cancelledValue)})`}
          icon={ShoppingCart}
          accent="info"
        />
        <AdminCard
          label="Units Sold"
          value={formatNumber(data.sales.units)}
          icon={Package}
          accent="info"
        />
        <AdminCard
          label="Avg Order Value"
          value={formatKES(data.sales.averageOrderValue)}
          icon={DollarSign}
          accent="accent"
        />
        <AdminCard
          label="Avg Basket Size"
          value={`${data.sales.averageBasketSize.toFixed(1)} units`}
          icon={ShoppingCart}
          accent="info"
        />
      </StatGrid>

      {/* Fulfillment funnel */}
      <section className="admin-card p-5">
        <h2 className="text-sm font-semibold admin-text">Reservation Funnel</h2>
        <p className="mt-0.5 text-xs admin-muted">Website / portal reservations: created → converted → expired / cancelled.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelStat label="Created" value={data.fulfillment.reservationsCreated} />
          <FunnelStat label="Converted" value={data.fulfillment.reservationsConverted} accent="text-emerald-600" />
          <FunnelStat label="Expired" value={data.fulfillment.reservationsExpired} accent="text-amber-600" />
          <FunnelStat label="Cancelled" value={data.fulfillment.reservationsCancelled} accent="text-rose-600" />
        </div>
        <div className="mt-3 text-xs admin-muted">
          Conversion rate: <strong>{formatPct(data.fulfillment.conversionRate)}</strong>
          {" · "}
          Expired rate: <strong>{formatPct(data.fulfillment.expiredRate)}</strong>
          {" · "}
          Cancelled rate: <strong>{formatPct(data.fulfillment.cancelledRate)}</strong>
        </div>
      </section>

      {/* Payments */}
      <section className="admin-card p-5">
        <h2 className="text-sm font-semibold admin-text">Payments</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminCard label="Total Attempts" value={formatNumber(data.payments.totalAttempts)} icon={Activity} accent="neutral" />
          <AdminCard label="Successful" value={formatNumber(data.payments.successful)} hint={`Success rate ${formatPct(data.payments.successRate)}`} icon={Wallet} accent="info" />
          <AdminCard label="Failed" value={formatNumber(data.payments.failed)} hint={`Failure rate ${formatPct(data.payments.failureRate)}`} icon={AlertTriangle} accent="danger" />
          <AdminCard label="Pending" value={formatNumber(data.payments.pending)} icon={RefreshCw} accent="neutral" />
        </div>
        <div className="mt-4 space-y-1.5 text-xs">
          {Object.entries(data.payments.collectedByProvider).map(([prov, amt]) => (
            <div key={prov} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
              <span className="admin-muted">{prov}</span>
              <strong className="admin-text">{formatKES(amt)}</strong>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
            <span className="admin-muted">Refunds (total)</span>
            <strong className="admin-text">{formatKES(data.payments.refundsTotal)}</strong>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
            <span className="admin-muted">Avg attempts / order</span>
            <strong className="admin-text">{data.payments.averageAttemptsPerOrder.toFixed(1)}</strong>
          </div>
        </div>
      </section>

      {/* Prescriptions + Refills side-by-side */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="admin-card p-5">
          <h2 className="text-sm font-semibold admin-text">Prescriptions</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <RowKV label="Total prescriptions" value={formatNumber(data.prescriptions.totalPrescriptions)} />
            <RowKV label="Active" value={formatNumber(data.prescriptions.active)} />
            <RowKV label="Fills (period)" value={formatNumber(data.prescriptions.fillsTotal)} />
            <RowKV label="Dispatched" value={formatNumber(data.prescriptions.fillsDispatched)} />
            <RowKV label="Collected" value={formatNumber(data.prescriptions.fillsCollected)} />
            <RowKV label="Pending" value={formatNumber(data.prescriptions.fillsPending)} />
            <RowKV label="Total billed" value={formatKES(data.prescriptions.totalBilled)} />
            <RowKV label="Collected" value={formatKES(data.prescriptions.totalCollected)} />
            <RowKV label="Outstanding" value={formatKES(data.prescriptions.totalOutstanding)} accent="text-amber-600" />
            <RowKV label="Refunded" value={formatKES(data.prescriptions.totalRefunded)} />
            <RowKV label="COGS" value={formatKES(data.prescriptions.cogsTotal)} />
            <RowKV label="Gross profit" value={formatKES(data.prescriptions.grossProfit)} accent="text-emerald-600" />
          </div>
        </section>
        <section className="admin-card p-5">
          <h2 className="text-sm font-semibold admin-text">Refills</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <RowKV label="Requests (period)" value={formatNumber(data.refills.totalRequests)} />
            <RowKV label="Approved" value={formatNumber(data.refills.approved)} />
            <RowKV label="Preparing" value={formatNumber(data.refills.preparing)} />
            <RowKV label="Ready" value={formatNumber(data.refills.ready)} />
            <RowKV label="Collected" value={formatNumber(data.refills.collected)} />
            <RowKV label="Cancelled" value={formatNumber(data.refills.cancelled)} />
            <RowKV label="Paid" value={formatNumber(data.refills.paid)} />
            <RowKV label="Unpaid" value={formatNumber(data.refills.unpaid)} accent="text-amber-600" />
            <RowKV label="Revenue" value={formatKES(data.refills.revenue)} accent="text-emerald-600" />
            <RowKV label="Avg turnaround" value={`${(data.refills.averageTurnaroundMinutes / 60).toFixed(1)}h`} />
            <RowKV label="Conversion" value={formatPct(data.refills.conversionRate)} />
          </div>
        </section>
      </div>

      {/* Inventory + Outstanding aging */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="admin-card p-5">
          <h2 className="text-sm font-semibold admin-text">Inventory</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <RowKV label="Active items" value={formatNumber(data.inventory.totalActive)} />
            <RowKV label="Low stock" value={formatNumber(data.inventory.lowStock)} accent="text-amber-600" />
            <RowKV label="Out of stock" value={formatNumber(data.inventory.outOfStock)} accent="text-rose-600" />
            <RowKV label="Expiring soon" value={formatNumber(data.inventory.expiringSoon)} accent="text-amber-600" />
            <RowKV label="Expired" value={formatNumber(data.inventory.expired)} accent="text-rose-600" />
            <RowKV label="Reorder" value={formatNumber(data.inventory.reorder)} />
            <RowKV label="Reserved units" value={formatNumber(data.inventory.reservedUnits)} />
            <RowKV label="Reserved value" value={formatKES(data.inventory.reservedValue)} />
            <RowKV label="Inventory value" value={formatKES(data.inventory.inventoryValue)} />
            <RowKV label="Expiring value" value={formatKES(data.inventory.expiringValue)} accent="text-amber-600" />
            <RowKV label="COGS (30d)" value={formatKES(data.inventory.cogsLast30d)} />
          </div>
        </section>
        <section className="admin-card p-5">
          <h2 className="text-sm font-semibold admin-text">Outstanding Receivables</h2>
          <p className="mt-1 text-2xl font-bold admin-text">{formatKES(data.outstandingAging.total)}</p>
          <div className="mt-4 space-y-2 text-xs">
            {data.outstandingAging.buckets.map((b) => (
              <div key={b.label} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
                <span className="admin-muted">{b.label}</span>
                <span className="admin-text">
                  <strong>{formatKES(b.amount)}</strong> · {b.count} orders
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* By source / type */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="admin-card p-5">
          <h2 className="text-sm font-semibold admin-text">Sales by Source</h2>
          <div className="mt-3 space-y-1.5 text-xs">
            {Object.entries(data.sales.bySource).map(([src, v]) => (
              <div key={src} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
                <span className="admin-muted">{src}</span>
                <span className="admin-text">
                  {v.orders} orders · {v.units} units · <strong>{formatKES(v.revenue)}</strong>
                </span>
              </div>
            ))}
            {Object.keys(data.sales.bySource).length === 0 && (
              <p className="admin-muted">No orders in this period.</p>
            )}
          </div>
        </section>
        <section className="admin-card p-5">
          <h2 className="text-sm font-semibold admin-text">Sales by Type</h2>
          <div className="mt-3 space-y-1.5 text-xs">
            {Object.entries(data.sales.byType).map(([t, v]) => (
              <div key={t} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
                <span className="admin-muted">{t}</span>
                <span className="admin-text">
                  {v.orders} orders · {v.units} units · <strong>{formatKES(v.revenue)}</strong>
                </span>
              </div>
            ))}
            {Object.keys(data.sales.byType).length === 0 && (
              <p className="admin-muted">No orders in this period.</p>
            )}
          </div>
        </section>
      </div>
    </AnalyticsShell>
  );
}

function FunnelStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider admin-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "admin-text"}`}>{value}</p>
    </div>
  );
}

function RowKV({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider admin-muted">{label}</p>
      <p className={`mt-0.5 font-semibold ${accent ?? "admin-text"}`}>{value}</p>
    </div>
  );
}
