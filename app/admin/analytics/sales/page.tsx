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
    <AnalyticsShell user={user}
      title="Sales report"
      description="Review orders, units sold, and reservation progress."
      period={period}
      basePath="/admin/analytics/sales"
    >
      <StatGrid>
        <AdminCard label="Orders" value={formatNumber(metrics.totalOrders)} hint={`${metrics.cancelledOrders} cancelled`} icon={ShoppingCart} accent="info" />
        <AdminCard label="Units Sold" value={formatNumber(metrics.unitsSold)} icon={Package} accent="info" />
        <AdminCard label="Avg Order Value" value={formatKES(metrics.averageOrderValue)} icon={DollarSign} accent="accent" />
        <AdminCard label="Avg Basket Size" value={`${metrics.averageBasketSize.toFixed(1)} units`} icon={ShoppingCart} accent="info" />
      </StatGrid>
      <StatGrid>
        <AdminCard label="Gross Sales" value={formatKES(metrics.grossSales)} icon={DollarSign} accent="accent" />
        <AdminCard label="Net Sales" value={formatKES(metrics.netSales)} icon={TrendingUp} accent="accent" />
        <AdminCard label="Cancelled Value" value={formatKES(metrics.cancelledValue)} icon={AlertTriangle} accent="danger" />
      </StatGrid>

      <AdminPanel title="Reservation Funnel" description="Website / portal reservations: created → converted → expired / cancelled.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FunnelStat label="Created" value={funnel.reservationsCreated} />
          <FunnelStat label="Converted" value={funnel.reservationsConverted} accent="text-emerald-600" />
          <FunnelStat label="Expired" value={funnel.reservationsExpired} accent="text-amber-600" />
          <FunnelStat label="Cancelled" value={funnel.reservationsCancelled} accent="text-rose-600" />
        </div>
        <div className="mt-3 text-xs admin-muted">
          Conversion rate: <strong>{formatPct(funnel.conversionRate)}</strong>
          {" · "}Expired rate: <strong>{formatPct(funnel.expiredRate)}</strong>
          {" · "}Cancelled rate: <strong>{formatPct(funnel.cancelledRate)}</strong>
        </div>
      </AdminPanel>

      <div className="grid gap-3 lg:grid-cols-2">
        <AdminPanel title="By Source">
          <div className="space-y-1.5 text-xs">
            {Object.entries(metrics.bySource).map(([src, v]) => (
              <div key={src} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
                <span className="admin-muted">{src}</span>
                <span className="admin-text">{v.orders} orders · {v.units} units · <strong>{formatKES(v.revenue)}</strong></span>
              </div>
            ))}
            {Object.keys(metrics.bySource).length === 0 && <p className="admin-muted">No orders in this period.</p>}
          </div>
        </AdminPanel>
        <AdminPanel title="By Type">
          <div className="space-y-1.5 text-xs">
            {Object.entries(metrics.byType).map(([t, v]) => (
              <div key={t} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
                <span className="admin-muted">{t}</span>
                <span className="admin-text">{v.orders} orders · {v.units} units · <strong>{formatKES(v.revenue)}</strong></span>
              </div>
            ))}
            {Object.keys(metrics.byType).length === 0 && <p className="admin-muted">No orders in this period.</p>}
          </div>
        </AdminPanel>
      </div>
    </AnalyticsShell>
  );
}

function FunnelStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] p-3">
      <p className="text-xs font-semibold uppercase tracking-wider admin-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? "admin-text"}`}>{value}</p>
    </div>
  );
}
