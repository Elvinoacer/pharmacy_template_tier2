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
import { AdminCard } from "@/app/components/admin/AdminUI";
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
    <AnalyticsShell user={user}
      title="Inventory Analytics"
      description="Stock levels, reserved units, inventory value, expiring value, write-offs, reorder suggestions."
      period={period}
      basePath="/admin/analytics/inventory"
    >
      <StatGrid>
        <AdminCard label="Active Items" value={formatNumber(metrics.totalActive)} icon={Package} accent="neutral" />
        <AdminCard label="Inventory Value" value={formatKES(metrics.inventoryValue)} hint="At cost price" icon={Package} accent="info" />
        <AdminCard label="Reserved Value" value={formatKES(metrics.reservedValue)} hint={`${metrics.reservedUnits} units held`} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Expiring Value" value={formatKES(metrics.expiringValue)} hint="Within 60 days" icon={AlertTriangle} accent="danger" />
      </StatGrid>
      <StatGrid>
        <AdminCard label="Low Stock" value={formatNumber(metrics.lowStock)} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Out of Stock" value={formatNumber(metrics.outOfStock)} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Expiring Soon" value={formatNumber(metrics.expiringSoon)} icon={AlertTriangle} accent="danger" />
        <AdminCard label="Expired" value={formatNumber(metrics.expired)} icon={AlertTriangle} accent="danger" />
      </StatGrid>
      <StatGrid>
        <AdminCard label="Reorder" value={formatNumber(metrics.reorder)} icon={Package} accent="neutral" />
        <AdminCard label="COGS (30d)" value={formatKES(metrics.cogsLast30d)} icon={TrendingUp} accent="accent" />
      </StatGrid>
    </AnalyticsShell>
  );
}
