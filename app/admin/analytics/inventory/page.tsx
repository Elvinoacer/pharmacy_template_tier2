import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeInventoryMetrics } from "@/app/lib/services/analytics/inventory";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  formatNumber,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { Package, AlertTriangle, TrendingUp } from "lucide-react";

export const metadata = { title: "Inventory Analytics" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function InventoryAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const metrics = await computeInventoryMetrics(range);

  return (
    <AnalyticsShell
      user={user}
      title="Stock report"
      description="Spot stock risks first, then review inventory value, reservations, and cost movement."
      period={period}
      basePath="/admin/analytics/inventory"
    >
      <AdminPanel
        title="Stock attention"
        description="Operational signals that may require replenishment, expiry handling, or stock correction."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <InventorySignal label="Out of stock" value={metrics.outOfStock} />
          <InventorySignal label="Low stock" value={metrics.lowStock} />
          <InventorySignal label="Expiring soon" value={metrics.expiringSoon} />
          <InventorySignal label="Expired" value={metrics.expired} />
          <InventorySignal label="Reorder" value={metrics.reorder} />
        </div>
      </AdminPanel>

      <StatGrid>
        <AdminCard label="Active Items" value={formatNumber(metrics.totalActive)} hint="Currently tracked" icon={Package} accent="neutral" />
        <AdminCard label="Inventory Value" value={formatKES(metrics.inventoryValue)} hint="At cost price" icon={Package} accent="info" />
        <AdminCard label="Reserved Value" value={formatKES(metrics.reservedValue)} hint={`${formatNumber(metrics.reservedUnits)} units held`} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Expiring Value" value={formatKES(metrics.expiringValue)} hint="Within 60 days" icon={AlertTriangle} accent="danger" />
      </StatGrid>

      <AdminPanel
        title="Cost movement"
        description="Cost of goods sold over the recent 30-day operating window."
      >
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] hover:shadow-sm motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] admin-accent-text">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.1em] admin-muted">COGS · last 30 days</p>
              <p className="mt-1 text-sm admin-soft">Useful for comparing current stock value with recent cost consumption.</p>
            </div>
          </div>
          <strong className="break-words text-2xl font-bold tracking-tight admin-text sm:text-right sm:text-3xl">{formatKES(metrics.cogsLast30d)}</strong>
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}

function InventorySignal({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-4 transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--admin-border-2)] hover:bg-[var(--admin-hover)] hover:shadow-sm motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold uppercase leading-relaxed tracking-[0.1em] admin-muted">{label}</p>
        <AlertTriangle className="h-4 w-4 shrink-0 admin-accent-text" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight admin-text sm:text-3xl">{formatNumber(value)}</p>
    </div>
  );
}
