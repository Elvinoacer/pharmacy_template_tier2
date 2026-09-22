import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeProductProfitability } from "@/app/lib/services/analytics/products";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  formatKES,
  formatNumber,
  formatPct,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminPanel } from "@/app/components/admin/AdminUI";

export const metadata = { title: "Product Profitability" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function ProductsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const products = await computeProductProfitability(range, { limit: 100 });

  return (
    <AnalyticsShell
      user={user}
      title="Medicine profitability"
      description="Compare medicine sales, costs, discounts, margins, and refunds."
      period={period}
      basePath="/admin/analytics/products"
    >
      <AdminPanel
        title="Top products by net sales"
        description={`${products.length} products with sales in this period. Highest-value products appear first.`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {products.map((p, index) => (
            <article
              key={p.inventoryId}
              className="min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] hover:shadow-sm motion-reduce:transition-none"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] admin-muted">#{index + 1} by net sales</p>
                  <h3 className="mt-1 break-words text-base font-semibold leading-snug admin-text">{p.name}</h3>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-2 text-sm font-semibold admin-text">
                  {formatPct(p.marginPct)} margin
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3">
                <p className="text-sm font-semibold uppercase tracking-wide admin-muted">Net sales</p>
                <p className="mt-1 break-words text-xl font-bold tracking-tight admin-text">{formatKES(p.netSales)}</p>
                <p className="mt-1 text-sm admin-muted">Gross profit {formatKES(p.grossProfit)}</p>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2">
                <ProductMetric label="Units" value={formatNumber(p.unitsSold)} />
                <ProductMetric label="Orders" value={formatNumber(p.ordersCount)} />
                <ProductMetric label="Gross sales" value={formatKES(p.grossSales)} />
                <ProductMetric label="Discounts" value={formatKES(p.discounts)} />
                <ProductMetric label="COGS" value={formatKES(p.cogs)} />
                <ProductMetric label="Refunds" value={formatKES(p.refunds)} />
              </dl>
            </article>
          ))}
          {products.length === 0 && (
            <p className="sm:col-span-2 rounded-xl border border-dashed border-[var(--admin-border)] px-4 py-10 text-center text-sm admin-muted">
              No product sales in this period.
            </p>
          )}
        </div>

        <div tabIndex={0} role="region" aria-label="Product profitability records" className="admin-table-region hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-left admin-muted">
                <th>Medicine</th>
                <th className="text-right">Units</th>
                <th className="text-right">Gross sales</th>
                <th className="text-right">Discounts</th>
                <th className="text-right">Net sales</th>
                <th className="text-right">COGS</th>
                <th className="text-right">Gross profit</th>
                <th className="text-right">Margin %</th>
                <th className="text-right">Refunds</th>
                <th className="text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.inventoryId} className="border-b border-[var(--admin-border)] transition-colors duration-150 hover:bg-[var(--admin-hover)] motion-reduce:transition-none">
                  <td className="max-w-[260px] break-words font-medium admin-text">{p.name}</td>
                  <td className="text-right admin-muted">{formatNumber(p.unitsSold)}</td>
                  <td className="text-right admin-muted">{formatKES(p.grossSales)}</td>
                  <td className="text-right admin-muted">{formatKES(p.discounts)}</td>
                  <td className="text-right font-medium admin-text">{formatKES(p.netSales)}</td>
                  <td className="text-right admin-muted">{formatKES(p.cogs)}</td>
                  <td className="text-right font-semibold admin-text">{formatKES(p.grossProfit)}</td>
                  <td className="text-right admin-muted">{formatPct(p.marginPct)}</td>
                  <td className="text-right admin-muted">{formatKES(p.refunds)}</td>
                  <td className="text-right admin-muted">{p.ordersCount}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center admin-muted">No product sales in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}

function ProductMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3">
      <dt className="text-sm font-semibold uppercase tracking-wide admin-muted">{label}</dt>
      <dd className="mt-1 break-words font-semibold admin-text">{value}</dd>
    </div>
  );
}
