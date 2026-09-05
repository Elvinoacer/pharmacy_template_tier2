import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computePrescriptionSummary } from "@/app/lib/services/analytics/prescriptions";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  formatNumber,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { Pill, Package, TrendingUp, AlertTriangle, Wallet } from "lucide-react";

export const metadata = { title: "Prescription Analytics" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function PrescriptionsAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const metrics = await computePrescriptionSummary(range);

  return (
    <AnalyticsShell user={user}
      title="Prescription report"
      description="Review prescription fills, billing, and outstanding balances."
      period={period}
      basePath="/admin/analytics/prescriptions"
    >
      <StatGrid>
        <AdminCard label="Total Prescriptions" value={formatNumber(metrics.totalPrescriptions)} hint={`${metrics.active} active`} icon={Pill} accent="neutral" />
        <AdminCard label="Fills (period)" value={formatNumber(metrics.fillsTotal)} hint={`${metrics.fillsDispatched} dispatched · ${metrics.fillsCollected} collected`} icon={Package} accent="info" />
        <AdminCard label="Total Billed" value={formatKES(metrics.totalBilled)} icon={Wallet} accent="accent" />
        <AdminCard label="Collected" value={formatKES(metrics.totalCollected)} icon={Wallet} accent="info" />
      </StatGrid>
      <StatGrid>
        <AdminCard label="Outstanding" value={formatKES(metrics.totalOutstanding)} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Refunded" value={formatKES(metrics.totalRefunded)} icon={AlertTriangle} accent="neutral" />
        <AdminCard label="COGS" value={formatKES(metrics.cogsTotal)} icon={Package} accent="neutral" />
        <AdminCard label="Gross Profit" value={formatKES(metrics.grossProfit)} icon={TrendingUp} accent="accent" />
      </StatGrid>

      <AdminPanel title="Fill status breakdown">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <Stat label="Pending" value={metrics.fillsPending} />
          <Stat label="Dispatched" value={metrics.fillsDispatched} />
          <Stat label="Collected" value={metrics.fillsCollected} />
          <Stat label="Avg fill value" value={formatKES(metrics.averageFillValue)} />
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
      <p className="text-xs uppercase tracking-wider admin-muted">{label}</p>
      <p className="mt-0.5 font-semibold admin-text">{value}</p>
    </div>
  );
}
