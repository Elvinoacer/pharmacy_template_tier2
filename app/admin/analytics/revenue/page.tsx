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

  return (
    <AnalyticsShell user={user}
      title="Revenue Analytics"
      description="Revenue, collections, COGS, gross profit and gross margin for the selected period."
      period={period}
      basePath="/admin/analytics/revenue"
    >
      <StatGrid>
        <AdminCard label="Gross Sales" value={formatKES(metrics.grossSales)} hint="Before discounts" icon={DollarSign} accent="accent" />
        <AdminCard label="Net Sales" value={formatKES(metrics.netSales)} hint={`After ${formatKES(metrics.discounts)} discounts`} icon={TrendingUp} accent="accent" />
        <AdminCard label="Collected" value={formatKES(metrics.collected)} hint="Payments − refunds" icon={Wallet} accent="info" />
        <AdminCard label="Outstanding" value={formatKES(metrics.outstanding)} hint="Sum of amountDue" icon={AlertTriangle} accent="danger" />
      </StatGrid>
      <StatGrid>
        <AdminCard label="COGS" value={formatKES(metrics.cogs)} hint="Snapshot at sale time" icon={Package} accent="neutral" />
        <AdminCard label="Gross Profit" value={formatKES(metrics.grossProfit)} hint="Net sales − COGS" icon={TrendingUp} accent="accent" />
        <AdminCard label="Gross Margin" value={formatPct(metrics.grossMarginPct)} icon={TrendingUp} accent="accent" />
        <AdminCard label="Refunds" value={formatKES(metrics.refunds)} icon={Scale} accent="neutral" />
      </StatGrid>

      <AdminPanel title="Daily trend" description="Gross sales, net sales, and collected per day.">
        {daily.length === 0 ? (
          <p className="text-xs admin-muted">No transactions in this period.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-end gap-1 h-48">
              {daily.map((d) => {
                const grossH = (d.grossSales / maxDaily) * 100;
                const netH = (d.netSales / maxDaily) * 100;
                const colH = (d.collected / maxDaily) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full h-full flex items-end justify-center gap-0.5">
                      <div
                        className="w-1.5 bg-amber-400 rounded-t group-hover:bg-amber-500 transition"
                        style={{ height: `${grossH}%` }}
                        title={`Gross: ${formatKES(d.grossSales)}`}
                      />
                      <div
                        className="w-1.5 bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition"
                        style={{ height: `${netH}%` }}
                        title={`Net: ${formatKES(d.netSales)}`}
                      />
                      <div
                        className="w-1.5 bg-sky-500 rounded-t group-hover:bg-sky-600 transition"
                        style={{ height: `${colH}%` }}
                        title={`Collected: ${formatKES(d.collected)}`}
                      />
                    </div>
                    <span className="text-[9px] admin-muted rotate-45 origin-left whitespace-nowrap">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-xs admin-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-amber-400 rounded" /> Gross sales</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-emerald-500 rounded" /> Net sales</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-sky-500 rounded" /> Collected</span>
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="Daily breakdown" description="Exact numbers per day.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left admin-muted border-b border-[var(--admin-border)]">
                <th className="py-2 pr-4">Date</th>
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
                <tr key={d.date} className="border-b border-[var(--admin-border)]">
                  <td className="py-2 pr-4 admin-text">{d.date}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.grossSales)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.netSales)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.collected)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.refunds)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(d.cogs)}</td>
                  <td className="py-2 pr-4 text-right admin-text font-semibold">{formatKES(d.grossProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}
