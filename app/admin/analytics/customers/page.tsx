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
import { Users, TrendingUp, Wallet, AlertTriangle, ArrowRight, ShoppingBag } from "lucide-react";

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
    <AnalyticsShell
      user={user}
      title="Patient activity report"
      description="Review repeat visits, patient spending, and balances that need follow-up."
      period={period}
      basePath="/admin/analytics/customers"
    >
      <StatGrid>
        <AdminCard label="Total customers" value={formatNumber(data.totalCustomers)} icon={Users} accent="info" />
        <AdminCard label="New customers" value={formatNumber(data.newCustomers)} hint="In this period" icon={Users} accent="info" />
        <AdminCard label="Returning" value={formatNumber(data.returningCustomers)} hint="2+ orders all-time" icon={TrendingUp} accent="accent" />
        <AdminCard label="Avg lifetime value" value={formatKES(data.averageLifetimeValue)} icon={Wallet} accent="accent" />
      </StatGrid>

      <AdminPanel
        title="Top customers by spend"
        description="Prioritize high-value patients and accounts with outstanding balances."
      >
        {data.topCustomers.length === 0 ? (
          <div className="py-8 text-center text-sm admin-muted">No customer purchases in this period.</div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {data.topCustomers.map((c, index) => (
                <article key={c.customerId} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-sm font-bold admin-accent-text">#{index + 1}</span>
                        <div className="min-w-0">
                          <Link href={`/admin/customers/${c.customerId}`} className="inline-flex min-h-11 items-center break-words text-base font-semibold admin-text hover:text-[var(--admin-accent)]">{c.fullName}</Link>
                          <p className="break-all text-sm admin-muted">{c.email || "No email"}</p>
                        </div>
                      </div>
                    </div>
                    <Link href={`/admin/customers/${c.customerId}`} aria-label={`Open ${c.fullName}`} className="flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] admin-accent-text"><ArrowRight className="h-4 w-4" /></Link>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[var(--admin-card)] p-3"><p className="text-sm font-semibold uppercase tracking-wide admin-muted">Lifetime spend</p><p className="mt-1 break-words text-base font-bold admin-text">{formatKES(c.lifetimeSpend)}</p></div>
                    <div className="rounded-xl bg-[var(--admin-card)] p-3"><p className="text-sm font-semibold uppercase tracking-wide admin-muted">Orders</p><p className="mt-1 text-base font-bold admin-text">{c.totalOrders}</p></div>
                    <div className="rounded-xl bg-[var(--admin-card)] p-3"><p className="text-sm font-semibold uppercase tracking-wide admin-muted">Avg order</p><p className="mt-1 break-words text-base font-semibold admin-text">{formatKES(c.averageOrderValue)}</p></div>
                    <div className={`rounded-xl p-3 ${c.outstandingBalance > 0 ? "bg-amber-500/10" : "bg-[var(--admin-card)]"}`}><p className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide admin-muted">{c.outstandingBalance > 0 && <AlertTriangle className="h-3 w-3 text-amber-500" />} Outstanding</p><p className={`mt-1 break-words text-base font-semibold ${c.outstandingBalance > 0 ? "text-amber-600" : "admin-text"}`}>{c.outstandingBalance > 0 ? formatKES(c.outstandingBalance) : "Clear"}</p></div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--admin-border)] pt-3 text-sm admin-muted">
                    <span className="inline-flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> {c.prescriptionFills} fills</span>
                    <span>{c.refills} refills</span>
                    <span>{c.lastPurchaseAt ? `Last purchase ${c.lastPurchaseAt.toLocaleDateString()}` : "No recent purchase"}</span>
                  </div>
                </article>
              ))}
            </div>

            <div tabIndex={0} role="region" aria-label="Scrollable customer analytics records" className="admin-table-region hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] text-left admin-muted">
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
                    <tr key={c.customerId} className="border-b border-[var(--admin-border)] transition-colors hover:bg-[var(--admin-inset)]">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/customers/${c.customerId}`} className="admin-text font-medium hover:text-[var(--admin-accent)]">{c.fullName}</Link>
                        <div className="max-w-64 break-all text-sm admin-muted">{c.email}</div>
                      </td>
                      <td className="py-3 pr-4 text-right admin-muted">{c.totalOrders}</td>
                      <td className="py-3 pr-4 text-right font-semibold admin-text">{formatKES(c.lifetimeSpend)}</td>
                      <td className="py-3 pr-4 text-right">{c.outstandingBalance > 0 ? <span className="font-semibold text-amber-600">{formatKES(c.outstandingBalance)}</span> : <span className="admin-muted">—</span>}</td>
                      <td className="py-3 pr-4 text-right admin-muted">{formatKES(c.refundedTotal)}</td>
                      <td className="py-3 pr-4 text-right admin-muted">{c.prescriptionFills}</td>
                      <td className="py-3 pr-4 text-right admin-muted">{c.refills}</td>
                      <td className="py-3 pr-4 text-right admin-muted">{formatKES(c.averageOrderValue)}</td>
                      <td className="py-3 pr-4 text-right admin-muted">{c.lastPurchaseAt ? c.lastPurchaseAt.toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminPanel>
    </AnalyticsShell>
  );
}
