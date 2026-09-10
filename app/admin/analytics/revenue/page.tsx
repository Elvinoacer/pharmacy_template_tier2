import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeRevenueMetrics, defaultRange, revenueByDay } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  formatPct,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { DollarSign, TrendingUp, Wallet, AlertTriangle, Package, Scale } from "lucide-react";

export const metadata = { title: "Revenue Analytics" };

const VALID_PERIODS: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function RevenueAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID_PERIODS.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const [metrics, daily] = await Promise.all([computeRevenueMetrics(range), revenueByDay(range)]);

  const maxDaily = Math.max(...daily.map((d) => Math.max(d.grossSales, d.netSales, d.collected)), 1);
  const chartMinWidth = Math.max(640, daily.length * 24);
  const labelEvery = daily.length > 120 ? 30 : daily.length > 60 ? 14 : daily.length > 30 ? 7 : daily.length > 14 ? 3 : 1;

  return (
    <AnalyticsShell
      user={user}
      title="Revenue & margin"
      description="Compare sales, collections, costs, and profit for the selected period."
      period={period}
      basePath="/admin/analytics/revenue"
    >
      <StatGrid>
        <AdminCard label="Net Sales" value={formatKES(metrics.netSales)} hint={`After ${formatKES(metrics.discounts)} discounts`} icon={TrendingUp} accent="accent" />
        <AdminCard label="Collected" value={formatKES(metrics.collected)} hint="Payments − refunds" icon={Wallet} accent="info" />
        <AdminCard label="Gross Profit" value={formatKES(metrics.grossProfit)} hint={`Margin ${formatPct(metrics.grossMarginPct)}`} icon={TrendingUp} accent="accent" />
        <AdminCard label="Outstanding" value={formatKES(metrics.outstanding)} hint="Amount still due" icon={AlertTriangle} accent="danger" />
      </StatGrid>

      <StatGrid>
        <AdminCard label="Gross Sales" value={formatKES(metrics.grossSales)} hint="Before discounts" icon={DollarSign} accent="accent" />
        <AdminCard label="COGS" value={formatKES(metrics.cogs)} hint="Snapshot at sale time" icon={Package} accent="neutral" />
        <AdminCard label="Gross Margin" value={formatPct(metrics.grossMarginPct)} icon={TrendingUp} accent="accent" />
        <AdminCard label="Refunds" value={formatKES(metrics.refunds)} icon={Scale} accent="neutral" />
      </StatGrid>

      <AdminPanel title="Daily trend" description="Gross sales, net sales, and collections. Swipe horizontally on smaller screens to inspect longer periods.">
        {daily.length === 0 ? (
          <p className="text-xs admin-muted">No transactions in this period.</p>
        ) : (
          <div className="space-y-3">
            <div tabIndex={0} role="region" aria-label="Scrollable daily revenue chart" className="overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
              <div className="h-56" style={{ minWidth: `${chartMinWidth}px` }}>
                <div className="flex h-48 items-end gap-1">
                  {daily.map((d, index) => {
                    const grossH = (d.grossSales / maxDaily) * 100;
                    const netH = (d.netSales / maxDaily) * 100;
                    const colH = (d.collected / maxDaily) * 100;
                    const showLabel = index % labelEvery === 0 || index === daily.length - 1;
                    return (
                      <div key={d.date} className="group flex h-full min-w-[18px] flex-1 flex-col items-center gap-1">
                        <div className="relative flex h-full w-full items-end justify-center gap-0.5 rounded-t-md transition-colors duration-200 group-hover:bg-[var(--admin-success-soft)] motion-reduce:transition-none">
                          <div
                            className="w-1.5 rounded-t bg-amber-400 transition-colors group-hover:bg-amber-500 motion-reduce:transition-none"
                            style={{ height: `${grossH}%` }}
                            title={`${d.date} gross: ${formatKES(d.grossSales)}`}
                          />
                          <div
                            className="w-1.5 rounded-t bg-emerald-500 transition-colors group-hover:bg-emerald-600 motion-reduce:transition-none"
                            style={{ height: `${netH}%` }}
                            title={`${d.date} net: ${formatKES(d.netSales)}`}
                          />
                          <div
                            className="w-1.5 rounded-t bg-sky-500 transition-colors group-hover:bg-sky-600 motion-reduce:transition-none"
                            style={{ height: `${colH}%` }}
                            title={`${d.date} collected: ${formatKES(d.collected)}`}
                          />
                        </div>
                        <span className="h-4 whitespace-nowrap text-[10px] admin-muted">
                          {showLabel ? d.date.slice(5) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs admin-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-amber-400" /> Gross sales</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-emerald-500" /> Net sales</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-sky-500" /> Collected</span>
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="Daily breakdown" description="Exact numbers per day. The date stays visible while you scroll across columns.">
        <div tabIndex={0} role="region" aria-label="Scrollable revenue records" className="admin-table-region overflow-x-auto overscroll-x-contain">
          <table className="min-w-[760px] w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-left admin-muted">
                <th className="sticky left-0 z-10 bg-[var(--admin-card)] py-2 pr-4">Date</th>
                <th className="py-2 pr-4 text-right">Gross</th>
                <th className="py-2 pr-4 text-right">Net</th>
                <th className="py-2 pr-4 text-right">Collected</th>
                <th className="py-2 pr-4 text-right">Refunds</th>
                <th className="py-2 pr-4 text-right">COGS</th>
                <th className="py-2 pr-4 text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {daily.slice().reverse().map((d) => (
                <tr key={d.date} className="border-b border-[var(--admin-border)] transition-colors hover:bg-[var(--admin-success-soft)] motion-reduce:transition-none">
                  <td className="sticky left-0 z-10 bg-[var(--admin-card)] py-2 pr-4 font-medium admin-text">{d.date}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.grossSales)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.netSales)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.collected)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.refunds)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.cogs)}</td>
                  <td className="py-2 pr-4 text-right font-semibold admin-text">{formatKES(d.grossProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}
