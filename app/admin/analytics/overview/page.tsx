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
    <AnalyticsShell
      user={user}
      title="Performance overview"
      description="Start with cash and sales health, then drill into fulfilment, prescriptions, stock, and receivables."
      period={period as PeriodOption}
      basePath="/admin/analytics/overview"
    >
      <div className="space-y-4 sm:space-y-6 [&_.admin-stat_p:first-child]:!text-sm [&_.admin-stat_p:nth-child(3)]:!text-sm">
      <StatGrid>
        <AdminCard label="Gross Sales" value={formatKES(data.financial.grossSales)} hint="Before discounts" icon={DollarSign} accent="accent" />
        <AdminCard
          label="Net Sales"
          value={formatKES(data.financial.netSales)}
          hint={`After ${formatKES(data.financial.discounts)} discounts & ${formatKES(data.financial.refunds)} refunds`}
          icon={TrendingUp}
          accent="accent"
        />
        <AdminCard label="Collected" value={formatKES(data.financial.collected)} hint="Completed payments − refunds" icon={Wallet} accent="info" />
        <AdminCard label="Outstanding" value={formatKES(data.financial.outstanding)} hint="Open order balances" icon={AlertTriangle} accent="danger" />
      </StatGrid>

      <StatGrid>
        <AdminCard label="COGS" value={formatKES(data.financial.cogs)} hint="Cost snapshot at sale time" icon={Package} accent="neutral" />
        <AdminCard label="Gross Profit" value={formatKES(data.financial.grossProfit)} hint="Net sales − COGS" icon={TrendingUp} accent="accent" />
        <AdminCard label="Gross Margin" value={formatPct(data.financial.grossMarginPct)} hint="Gross profit ÷ net sales" icon={Activity} accent="accent" />
        <AdminCard label="Waived Amount" value={formatKES(data.financial.waivedAmount)} hint="Admin waivers · not revenue" icon={Scale} accent="neutral" />
      </StatGrid>

      <StatGrid>
        <AdminCard
          label="Orders"
          value={formatNumber(data.sales.orders)}
          hint={`${formatNumber(data.sales.cancelledOrders)} cancelled · ${formatKES(data.sales.cancelledValue)}`}
          icon={ShoppingCart}
          accent="info"
        />
        <AdminCard label="Units Sold" value={formatNumber(data.sales.units)} icon={Package} accent="info" />
        <AdminCard label="Avg Order Value" value={formatKES(data.sales.averageOrderValue)} icon={DollarSign} accent="accent" />
        <AdminCard label="Avg Basket Size" value={`${data.sales.averageBasketSize.toFixed(1)} units`} icon={ShoppingCart} accent="info" />
      </StatGrid>

      <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold admin-text">Reservation funnel</h2>
          <p className="mt-1 text-sm leading-relaxed admin-muted">Website and portal reservations from creation through conversion, expiry, or cancellation.</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelStat label="Created" value={data.fulfillment.reservationsCreated} />
          <FunnelStat label="Converted" value={data.fulfillment.reservationsConverted} />
          <FunnelStat label="Expired" value={data.fulfillment.reservationsExpired} />
          <FunnelStat label="Cancelled" value={data.fulfillment.reservationsCancelled} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RateStat label="Conversion" value={formatPct(data.fulfillment.conversionRate)} />
          <RateStat label="Expired" value={formatPct(data.fulfillment.expiredRate)} />
          <RateStat label="Cancelled" value={formatPct(data.fulfillment.cancelledRate)} />
        </div>
      </section>

      <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold admin-text">Payments</h2>
          <p className="mt-1 text-sm leading-relaxed admin-muted">Attempt health, channel collections, refunds, and retry pressure.</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminCard label="Total Attempts" value={formatNumber(data.payments.totalAttempts)} icon={Activity} accent="neutral" />
          <AdminCard label="Successful" value={formatNumber(data.payments.successful)} hint={`${formatPct(data.payments.successRate)} success`} icon={Wallet} accent="info" />
          <AdminCard label="Failed" value={formatNumber(data.payments.failed)} hint={`${formatPct(data.payments.failureRate)} failure`} icon={AlertTriangle} accent="danger" />
          <AdminCard label="Pending" value={formatNumber(data.payments.pending)} icon={RefreshCw} accent="neutral" />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {Object.entries(data.payments.collectedByProvider).map(([prov, amt]) => (
            <MetricListRow key={prov} label={prov} value={formatKES(amt)} />
          ))}
          <MetricListRow label="Refunds (total)" value={formatKES(data.payments.refundsTotal)} />
          <MetricListRow label="Avg attempts / order" value={data.payments.averageAttemptsPerOrder.toFixed(1)} />
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="text-sm font-semibold admin-text">Prescriptions</h2>
          <p className="mt-1 text-sm admin-muted">Workload, collections, and prescription economics.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <RowKV label="Total prescriptions" value={formatNumber(data.prescriptions.totalPrescriptions)} />
            <RowKV label="Active" value={formatNumber(data.prescriptions.active)} />
            <RowKV label="Fills (period)" value={formatNumber(data.prescriptions.fillsTotal)} />
            <RowKV label="Dispatched" value={formatNumber(data.prescriptions.fillsDispatched)} />
            <RowKV label="Collected fills" value={formatNumber(data.prescriptions.fillsCollected)} />
            <RowKV label="Pending" value={formatNumber(data.prescriptions.fillsPending)} />
            <RowKV label="Total billed" value={formatKES(data.prescriptions.totalBilled)} />
            <RowKV label="Collected" value={formatKES(data.prescriptions.totalCollected)} />
            <RowKV label="Outstanding" value={formatKES(data.prescriptions.totalOutstanding)} />
            <RowKV label="Refunded" value={formatKES(data.prescriptions.totalRefunded)} />
            <RowKV label="COGS" value={formatKES(data.prescriptions.cogsTotal)} />
            <RowKV label="Gross profit" value={formatKES(data.prescriptions.grossProfit)} />
          </div>
        </section>

        <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="text-sm font-semibold admin-text">Refills</h2>
          <p className="mt-1 text-sm admin-muted">Request progression, payment conversion, and turnaround.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <RowKV label="Requests" value={formatNumber(data.refills.totalRequests)} />
            <RowKV label="Approved" value={formatNumber(data.refills.approved)} />
            <RowKV label="Preparing" value={formatNumber(data.refills.preparing)} />
            <RowKV label="Ready" value={formatNumber(data.refills.ready)} />
            <RowKV label="Collected" value={formatNumber(data.refills.collected)} />
            <RowKV label="Cancelled" value={formatNumber(data.refills.cancelled)} />
            <RowKV label="Paid" value={formatNumber(data.refills.paid)} />
            <RowKV label="Unpaid" value={formatNumber(data.refills.unpaid)} />
            <RowKV label="Revenue" value={formatKES(data.refills.revenue)} />
            <RowKV label="Avg turnaround" value={`${(data.refills.averageTurnaroundMinutes / 60).toFixed(1)}h`} />
            <RowKV label="Conversion" value={formatPct(data.refills.conversionRate)} />
          </div>
        </section>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="text-sm font-semibold admin-text">Inventory</h2>
          <p className="mt-1 text-sm admin-muted">Availability risk and value tied up in stock.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <RowKV label="Active items" value={formatNumber(data.inventory.totalActive)} />
            <RowKV label="Low stock" value={formatNumber(data.inventory.lowStock)} />
            <RowKV label="Out of stock" value={formatNumber(data.inventory.outOfStock)} />
            <RowKV label="Expiring soon" value={formatNumber(data.inventory.expiringSoon)} />
            <RowKV label="Expired" value={formatNumber(data.inventory.expired)} />
            <RowKV label="Reorder" value={formatNumber(data.inventory.reorder)} />
            <RowKV label="Reserved units" value={formatNumber(data.inventory.reservedUnits)} />
            <RowKV label="Reserved value" value={formatKES(data.inventory.reservedValue)} />
            <RowKV label="Inventory value" value={formatKES(data.inventory.inventoryValue)} />
            <RowKV label="Expiring value" value={formatKES(data.inventory.expiringValue)} />
            <RowKV label="COGS (30d)" value={formatKES(data.inventory.cogsLast30d)} />
          </div>
        </section>

        <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="text-sm font-semibold admin-text">Outstanding receivables</h2>
          <p className="mt-1 text-sm admin-muted">Open balances grouped by order age.</p>
          <div className="mt-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] admin-muted">Total outstanding</p>
            <p className="mt-1 break-words text-2xl font-bold tracking-tight admin-text">{formatKES(data.outstandingAging.total)}</p>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {data.outstandingAging.buckets.map((b) => (
              <MetricListRow key={b.label} label={b.label} value={formatKES(b.amount)} meta={`${b.count} orders`} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="text-sm font-semibold admin-text">Sales by source</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(data.sales.bySource).map(([src, v]) => (
              <MetricListRow key={src} label={src} value={formatKES(v.revenue)} meta={`${v.orders} orders · ${v.units} units`} />
            ))}
            {Object.keys(data.sales.bySource).length === 0 && <EmptyInline>No orders in this period.</EmptyInline>}
          </div>
        </section>

        <section className="admin-card min-w-0 overflow-hidden p-4 sm:p-5">
          <h2 className="text-sm font-semibold admin-text">Sales by type</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(data.sales.byType).map(([type, v]) => (
              <MetricListRow key={type} label={type} value={formatKES(v.revenue)} meta={`${v.orders} orders · ${v.units} units`} />
            ))}
            {Object.keys(data.sales.byType).length === 0 && <EmptyInline>No orders in this period.</EmptyInline>}
          </div>
        </section>
      </div>
      </div>
    </AnalyticsShell>
  );
}

function FunnelStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] hover:shadow-sm motion-reduce:transition-none sm:p-4">
      <p className="text-sm font-semibold uppercase tracking-[0.1em] admin-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight admin-text sm:text-3xl">{formatNumber(value)}</p>
    </div>
  );
}

function RateStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-2.5 py-2.5 text-center sm:px-3">
      <p className="break-words text-sm font-semibold uppercase tracking-wide admin-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-bold admin-text sm:text-base">{value}</p>
    </div>
  );
}

function RowKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-3 py-2.5 transition-[border-color,background-color] duration-150 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] motion-reduce:transition-none">
      <p className="text-sm font-semibold uppercase leading-relaxed tracking-[0.08em] admin-muted">{label}</p>
      <p className="mt-1 break-words font-semibold leading-snug admin-text">{value}</p>
    </div>
  );
}

function MetricListRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3.5 py-3 transition-[border-color,background-color] duration-150 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="break-words font-medium capitalize admin-muted">{label}</span>
      <span className="min-w-0 sm:text-right">
        <strong className="block break-words text-sm admin-text">{value}</strong>
        {meta && <small className="mt-0.5 block text-sm admin-muted">{meta}</small>}
      </span>
    </div>
  );
}

function EmptyInline({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-inset)] px-4 py-6 text-center admin-muted">
      {children}
    </p>
  );
}
