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
    <AnalyticsShell
      user={user}
      title="Prescription report"
      description="Track prescription workload, fill progress, collections, and profitability."
      period={period}
      basePath="/admin/analytics/prescriptions"
    >
      <div className="space-y-4 sm:space-y-6 [&_.admin-stat_p:first-child]:!text-sm [&_.admin-stat_p:nth-child(3)]:!text-sm">
      <StatGrid>
        <AdminCard label="Total Prescriptions" value={formatNumber(metrics.totalPrescriptions)} hint={`${formatNumber(metrics.active)} active`} icon={Pill} accent="neutral" />
        <AdminCard label="Fills (period)" value={formatNumber(metrics.fillsTotal)} hint={`${formatNumber(metrics.fillsPending)} pending`} icon={Package} accent="info" />
        <AdminCard label="Collected" value={formatKES(metrics.totalCollected)} hint={`${formatNumber(metrics.fillsCollected)} fills collected`} icon={Wallet} accent="info" />
        <AdminCard label="Outstanding" value={formatKES(metrics.totalOutstanding)} hint="Open prescription balances" icon={AlertTriangle} accent="danger" />
      </StatGrid>

      <AdminPanel
        title="Fill flow"
        description="See where prescription fills are sitting in the fulfilment journey."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FillStage label="Pending" value={formatNumber(metrics.fillsPending)} />
          <FillStage label="Dispatched" value={formatNumber(metrics.fillsDispatched)} />
          <FillStage label="Collected" value={formatNumber(metrics.fillsCollected)} />
          <FillStage label="Avg fill value" value={formatKES(metrics.averageFillValue)} />
        </div>
      </AdminPanel>

      <StatGrid>
        <AdminCard label="Total Billed" value={formatKES(metrics.totalBilled)} icon={Wallet} accent="accent" />
        <AdminCard label="Refunded" value={formatKES(metrics.totalRefunded)} icon={AlertTriangle} accent="neutral" />
        <AdminCard label="COGS" value={formatKES(metrics.cogsTotal)} icon={Package} accent="neutral" />
        <AdminCard label="Gross Profit" value={formatKES(metrics.grossProfit)} icon={TrendingUp} accent="accent" />
      </StatGrid>
      </div>
    </AnalyticsShell>
  );
}

function FillStage({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3.5 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] hover:shadow-sm motion-reduce:transition-none sm:p-4">
      <p className="text-sm font-semibold uppercase tracking-[0.1em] admin-muted">{label}</p>
      <p className="mt-2 break-words text-xl font-bold tracking-tight admin-text sm:text-2xl">{value}</p>
    </div>
  );
}
