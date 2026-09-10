import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeStaffMetrics } from "@/app/lib/services/analytics/staff";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  formatNumber,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { Users, ShoppingCart, Wallet, TrendingUp } from "lucide-react";

export const metadata = { title: "Staff Analytics" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function StaffAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const staff = await computeStaffMetrics(range);
  const totals = staff.reduce(
    (acc, member) => ({
      orders: acc.orders + member.ordersCreated,
      sales: acc.sales + member.salesValue,
      collected: acc.collected + member.cashCollected + member.mpesaCollected,
    }),
    { orders: 0, sales: 0, collected: 0 },
  );

  return (
    <AnalyticsShell
      user={user}
      title="Staff activity report"
      description="Review sales, collections, dispensing, and exception activity by staff member."
      period={period}
      basePath="/admin/analytics/staff"
    >
      <StatGrid>
        <AdminCard label="Active Staff" value={formatNumber(staff.length)} hint="Staff with activity" icon={Users} accent="info" />
        <AdminCard label="Sales Value" value={formatKES(totals.sales)} hint="Orders attributed to staff" icon={TrendingUp} accent="accent" />
        <AdminCard label="Orders Created" value={formatNumber(totals.orders)} icon={ShoppingCart} accent="info" />
        <AdminCard label="Tracked Collections" value={formatKES(totals.collected)} hint="Cash + M-Pesa" icon={Wallet} accent="accent" />
      </StatGrid>

      <AdminPanel title="Per-staff breakdown" description="Mobile cards prioritize sales and collections; the desktop table retains the full operational detail.">
        {staff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] p-6 text-center text-sm admin-muted">
            No staff activity in this period.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {staff.map((member) => (
                <StaffCard key={member.userId} member={member} />
              ))}
            </div>

            <div tabIndex={0} role="region" aria-label="Scrollable staff records" className="admin-table-region hidden overflow-x-auto overscroll-x-contain md:block">
              <table className="min-w-[1120px] w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] text-left admin-muted">
                    <th className="sticky left-0 z-10 bg-[var(--admin-card)] py-2 pr-4">Staff</th>
                    <th className="py-2 pr-4 text-right">Orders</th>
                    <th className="py-2 pr-4 text-right">Sales value</th>
                    <th className="py-2 pr-4 text-right">Cash</th>
                    <th className="py-2 pr-4 text-right">M-Pesa</th>
                    <th className="py-2 pr-4 text-right">Dispatches</th>
                    <th className="py-2 pr-4 text-right">Rx fills</th>
                    <th className="py-2 pr-4 text-right">Refunds approved</th>
                    <th className="py-2 pr-4 text-right">Adjustments</th>
                    <th className="py-2 pr-4 text-right">Write-offs</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.userId} className="border-b border-[var(--admin-border)] transition-colors hover:bg-[var(--admin-success-soft)] motion-reduce:transition-none">
                      <td className="sticky left-0 z-10 max-w-[240px] truncate bg-[var(--admin-card)] py-2 pr-4 font-medium admin-text" title={member.email}>{member.email}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatNumber(member.ordersCreated)}</td>
                      <td className="py-2 pr-4 text-right font-semibold admin-text">{formatKES(member.salesValue)}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatKES(member.cashCollected)}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatKES(member.mpesaCollected)}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatNumber(member.dispatches)}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatNumber(member.prescriptionFills)}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatNumber(member.refundsApproved)}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatNumber(member.adjustments)}</td>
                      <td className="py-2 pr-4 text-right admin-muted">{formatNumber(member.writeOffs)}</td>
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

type StaffMetric = Awaited<ReturnType<typeof computeStaffMetrics>>[number];

function StaffCard({ member }: { member: StaffMetric }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold admin-text" title={member.email}>{member.email}</p>
          <p className="mt-0.5 text-xs admin-muted">{formatNumber(member.ordersCreated)} orders created</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide admin-muted">Sales</p>
          <p className="mt-0.5 text-sm font-bold admin-text">{formatKES(member.salesValue)}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Cash" value={formatKES(member.cashCollected)} />
        <Metric label="M-Pesa" value={formatKES(member.mpesaCollected)} />
        <Metric label="Dispatches" value={formatNumber(member.dispatches)} />
        <Metric label="Rx fills" value={formatNumber(member.prescriptionFills)} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--admin-border)] pt-3">
        <Metric label="Refunds" value={formatNumber(member.refundsApproved)} compact />
        <Metric label="Adjustments" value={formatNumber(member.adjustments)} compact />
        <Metric label="Write-offs" value={formatNumber(member.writeOffs)} compact />
      </div>
    </article>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--admin-success-soft)] px-2.5 py-2">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide admin-muted" title={label}>{label}</p>
      <p className={`mt-0.5 break-words font-semibold admin-text ${compact ? "text-xs" : "text-sm"}`}>{value}</p>
    </div>
  );
}
