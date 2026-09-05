import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeCustomerAnalytics } from "@/app/lib/services/analytics/customers";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  formatNumber,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { Users, TrendingUp, Wallet, AlertTriangle } from "lucide-react";

export const metadata = { title: "Customer Analytics" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function CustomersAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const data = await computeCustomerAnalytics(range, { limit: 50 });

  return (
    <AnalyticsShell user={user}
      title="Patient activity report"
      description="Review repeat visits, patient spending, and outstanding balances."
      period={period}
      basePath="/admin/analytics/customers"
    >
      <StatGrid>
        <AdminCard label="Total Customers" value={formatNumber(data.totalCustomers)} icon={Users} accent="info" />
        <AdminCard label="New Customers" value={formatNumber(data.newCustomers)} hint="In this period" icon={Users} accent="info" />
        <AdminCard label="Returning" value={formatNumber(data.returningCustomers)} hint="2+ orders all-time" icon={TrendingUp} accent="accent" />
        <AdminCard label="Avg Lifetime Value" value={formatKES(data.averageLifetimeValue)} icon={Wallet} accent="accent" />
      </StatGrid>

      <AdminPanel title="Top Customers by Spend" description="Lifetime spend, outstanding balance, fills, refills.">
        <div tabIndex={0} role="region" aria-label="Scrollable records" className="admin-table-region overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left admin-muted border-b border-[var(--admin-border)]">
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4 text-right">Orders</th>
                <th className="py-2 pr-4 text-right">Lifetime spend</th>
                <th className="py-2 pr-4 text-right">Outstanding</th>
                <th className="py-2 pr-4 text-right">Refunded</th>
                <th className="py-2 pr-4 text-right">Fills</th>
                <th className="py-2 pr-4 text-right">Refills</th>
                <th className="py-2 pr-4 text-right">Avg order</th>
                <th className="py-2 pr-4 text-right">Last purchase</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.map((c) => (
                <tr key={c.customerId} className="border-b border-[var(--admin-border)]">
                  <td className="py-2 pr-4">
                    <Link href={`/admin/customers/${c.customerId}`} className="admin-text font-medium hover:text-[var(--admin-accent)]">
                      {c.fullName}
                    </Link>
                    <div className="text-xs admin-muted">{c.email}</div>
                  </td>
                  <td className="py-2 pr-4 text-right admin-muted">{c.totalOrders}</td>
                  <td className="py-2 pr-4 text-right admin-text font-semibold">{formatKES(c.lifetimeSpend)}</td>
                  <td className="py-2 pr-4 text-right">
                    {c.outstandingBalance > 0 ? (
                      <span className="text-amber-600 font-semibold">{formatKES(c.outstandingBalance)}</span>
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(c.refundedTotal)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{c.prescriptionFills}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{c.refills}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(c.averageOrderValue)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{c.lastPurchaseAt ? c.lastPurchaseAt.toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {data.topCustomers.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center admin-muted">No customer purchases in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}
