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
    <AnalyticsShell user={user}
      title="Product Profitability"
      description="Per-medicine: units sold, revenue, COGS, gross profit, margin %, discounts, refunds."
      period={period}
      basePath="/admin/analytics/products"
    >
      <AdminPanel title="Top products by net sales" description={`${products.length} products with sales in this period.`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left admin-muted border-b border-[var(--admin-border)]">
                <th className="py-2 pr-4">Medicine</th>
                <th className="py-2 pr-4 text-right">Units</th>
                <th className="py-2 pr-4 text-right">Gross sales</th>
                <th className="py-2 pr-4 text-right">Discounts</th>
                <th className="py-2 pr-4 text-right">Net sales</th>
                <th className="py-2 pr-4 text-right">COGS</th>
                <th className="py-2 pr-4 text-right">Gross profit</th>
                <th className="py-2 pr-4 text-right">Margin %</th>
                <th className="py-2 pr-4 text-right">Refunds</th>
                <th className="py-2 pr-4 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.inventoryId} className="border-b border-[var(--admin-border)]">
                  <td className="py-2 pr-4 admin-text font-medium">{p.name}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatNumber(p.unitsSold)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(p.grossSales)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(p.discounts)}</td>
                  <td className="py-2 pr-4 text-right admin-text">{formatKES(p.netSales)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(p.cogs)}</td>
                  <td className="py-2 pr-4 text-right admin-text font-semibold">{formatKES(p.grossProfit)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatPct(p.marginPct)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(p.refunds)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{p.ordersCount}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={10} className="py-6 text-center admin-muted">No product sales in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}
