import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeStaffMetrics } from "@/app/lib/services/analytics/staff";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  formatKES,
  formatNumber,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminPanel } from "@/app/components/admin/AdminUI";

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

  return (
    <AnalyticsShell user={user}
      title="Staff Analytics"
      description="Sales by staff, orders, dispatches, prescription fills, cash collected, refunds approved, adjustments."
      period={period}
      basePath="/admin/analytics/staff"
    >
      <AdminPanel title="Per-staff breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left admin-muted border-b border-[var(--admin-border)]">
                <th className="py-2 pr-4">Staff</th>
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
              {staff.map((s) => (
                <tr key={s.userId} className="border-b border-[var(--admin-border)]">
                  <td className="py-2 pr-4 admin-text font-medium">{s.email}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatNumber(s.ordersCreated)}</td>
                  <td className="py-2 pr-4 text-right admin-text font-semibold">{formatKES(s.salesValue)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(s.cashCollected)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatKES(s.mpesaCollected)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatNumber(s.dispatches)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatNumber(s.prescriptionFills)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatNumber(s.refundsApproved)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatNumber(s.adjustments)}</td>
                  <td className="py-2 pr-4 text-right admin-muted">{formatNumber(s.writeOffs)}</td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={10} className="py-6 text-center admin-muted">No staff activity in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}
