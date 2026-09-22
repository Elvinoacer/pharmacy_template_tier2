import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeSalesMetrics, computeReservationFunnel } from "@/app/lib/services/analytics/sales";
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
import { ShoppingCart, Package, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

export const metadata = { title: "Sales Analytics" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function SalesAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const [metrics, funnel] = await Promise.all([computeSalesMetrics(range), computeReservationFunnel(range)]);

  return (
    <AnalyticsShell
      user={user}
      title="Sales report"
      description="Review sales performance, order quality, and reservation conversion."
      period={period}
      basePath="/admin/analytics/sales"
    >
      <div className="space-y-4 sm:space-y-6 [&_.admin-stat_p:first-child]:!text-sm [&_.admin-stat_p:nth-child(3)]:!text-sm">
      <StatGrid>
        <AdminCard label="Net Sales" value={formatKES(metrics.netSales)} hint="After discounts and adjustments" icon={TrendingUp} accent="accent" />
        <AdminCard label="Orders" value={formatNumber(metrics.totalOrders)} hint={`${formatNumber(metrics.cancelledOrders)} cancelled`} icon={ShoppingCart} accent="info" />
        <AdminCard label="Avg Order Value" value={formatKES(metrics.averageOrderValue)} hint="Value per completed order" icon={DollarSign} accent="accent" />
        <AdminCard label="Units Sold" value={formatNumber(metrics.unitsSold)} hint={`${metrics.averageBasketSize.toFixed(1)} units / basket`} icon={Package} accent="info" />
      </StatGrid>

      <StatGrid>
        <AdminCard label="Gross Sales" value={formatKES(metrics.grossSales)} icon={DollarSign} accent="accent" />
        <AdminCard label="Cancelled Value" value={formatKES(metrics.cancelledValue)} hint="Revenue at risk" icon={AlertTriangle} accent="danger" />
      </StatGrid>

      <AdminPanel title="Reservation funnel" description="Website and portal reservations from creation through conversion or drop-off.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelStat label="Created" value={funnel.reservationsCreated} />
          <FunnelStat label="Converted" value={funnel.reservationsConverted} accent="success" />
          <FunnelStat label="Expired" value={funnel.reservationsExpired} accent="warning" />
          <FunnelStat label="Cancelled" value={funnel.reservationsCancelled} accent="danger" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <RateStat label="Conversion" value={formatPct(funnel.conversionRate)} emphasis />
          <RateStat label="Expired" value={formatPct(funnel.expiredRate)} />
          <RateStat label="Cancelled" value={formatPct(funnel.cancelledRate)} />
        </div>
      </AdminPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminPanel title="By source" description="Which channels are producing orders and revenue.">
          {Object.keys(metrics.bySource).length === 0 ? (
            <p className="text-sm admin-muted">No orders in this period.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {Object.entries(metrics.bySource).map(([src, v]) => (
                <BreakdownRow key={src} label={src} orders={v.orders} units={v.units} revenue={v.revenue} />
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="By type" description="Compare demand across order types.">
          {Object.keys(metrics.byType).length === 0 ? (
            <p className="text-sm admin-muted">No orders in this period.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {Object.entries(metrics.byType).map(([type, v]) => (
                <BreakdownRow key={type} label={type} orders={v.orders} units={v.units} revenue={v.revenue} />
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
      </div>
    </AnalyticsShell>
  );
}

function FunnelStat({ label, value, accent }: { label: string; value: number; accent?: "success" | "warning" | "danger" }) {
  const tone = accent === "success"
    ? "text-emerald-700 dark:text-emerald-300"
    : accent === "warning"
      ? "text-amber-700 dark:text-amber-300"
      : accent === "danger"
        ? "text-rose-700 dark:text-rose-300"
        : "admin-text";
  const surface = accent === "danger" ? "bg-[var(--admin-danger-soft)]" : accent === "success" ? "bg-[var(--admin-success-soft)]" : "bg-[var(--admin-card)]";

  return (
    <div className={`min-w-0 rounded-xl border border-[var(--admin-border)] p-3 sm:p-4 ${surface}`}>
      <p className="text-sm font-semibold uppercase tracking-wider admin-muted">{label}</p>
      <p className={`mt-1 break-words text-2xl font-bold sm:text-3xl ${tone}`}>{formatNumber(value)}</p>
    </div>
  );
}

function RateStat({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-3 sm:block">
      <p className="text-sm font-medium uppercase tracking-wide admin-muted">{label}</p>
      <p className={`break-words text-base font-bold sm:mt-1 sm:text-lg ${emphasis ? "text-emerald-700 dark:text-emerald-300" : "admin-text"}`}>{value}</p>
    </div>
  );
}

function BreakdownRow({ label, orders, units, revenue }: { label: string; orders: number; units: number; revenue: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3 transition-[border-color,box-shadow] duration-200 hover:border-[var(--admin-accent)] motion-reduce:transition-none">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span className="min-w-0 break-words font-semibold admin-text">{label}</span>
        <strong className="shrink-0 text-sm admin-text">{formatKES(revenue)}</strong>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 admin-muted">
        <span>{formatNumber(orders)} orders</span>
        <span>{formatNumber(units)} units</span>
      </div>
    </div>
  );
}
