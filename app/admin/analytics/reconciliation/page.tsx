import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { computeReconciliation } from "@/app/lib/services/analytics/reconciliation";
import { defaultRange } from "@/app/lib/services/analytics/revenue";
import {
  AnalyticsShell,
  StatGrid,
  formatKES,
  type PeriodOption,
} from "@/app/components/admin/AnalyticsShell";
import { AdminCard, AdminPanel } from "@/app/components/admin/AdminUI";
import { Wallet, Scale, TrendingUp } from "lucide-react";

export const metadata = { title: "Reconciliation" };
const VALID: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const period = (VALID.includes(sp.period as PeriodOption) ? sp.period : "30d") as PeriodOption;
  const range = defaultRange(period);
  const report = await computeReconciliation(range);

  const differenceTone = report.difference > 1
    ? "text-amber-700 dark:text-amber-300"
    : report.difference < -1
      ? "text-rose-700 dark:text-rose-300"
      : "text-emerald-700 dark:text-emerald-300";
  const statusLabel = report.difference > 1 ? "Over-collected" : report.difference < -1 ? "Under-collected" : "Reconciled";
  const statusSurface = Math.abs(report.difference) > 1 ? "bg-[var(--admin-danger-soft)]" : "bg-[var(--admin-success-soft)]";

  return (
    <AnalyticsShell
      user={user}
      title="Payment reconciliation"
      description="Compare expected sales with collections and investigate differences."
      period={period}
      basePath="/admin/analytics/reconciliation"
    >
      <div className="reconciliation-ux mx-auto w-full max-w-7xl space-y-4 sm:space-y-6">
        <AdminPanel
          title="Reconciliation status"
          description="Collections + waivers − refunds − expected sales. A healthy result should be close to zero."
          className={statusSurface}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] admin-muted">Current difference</p>
              <p className={`mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl ${differenceTone}`}>{formatKES(report.difference)}</p>
            </div>
            <span className={`w-fit rounded-full border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-2 text-sm font-semibold ${differenceTone}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed admin-muted">
            {report.difference > 1
              ? "Collected more than expected. Verify over-collection, duplicated payment capture, or sales that were not recorded correctly."
              : report.difference < -1
                ? "Collected less than expected. Investigate missed payments, cash handling gaps, or unreconciled refunds."
                : "Collections match expected sales within tolerance. No material reconciliation exception is visible for this period."}
          </p>
        </AdminPanel>

        <StatGrid>
          <AdminCard label="Expected Sales" value={formatKES(report.expectedSales)} hint="Paid-order net sales" icon={TrendingUp} accent="accent" />
          <AdminCard label="Total Collected" value={formatKES(report.totalCollected)} hint="M-Pesa + cash + card + other" icon={Wallet} accent="info" />
          <AdminCard label="Refunds" value={formatKES(report.refundsTotal)} icon={Scale} accent="neutral" />
          <AdminCard label="Waived" value={formatKES(report.waivedAmount)} icon={Scale} accent="neutral" />
        </StatGrid>

        <AdminPanel title="Collection breakdown" description="Trace the reconciliation result back to each collection channel.">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="M-Pesa (Daraja)" value={formatKES(report.mpesaCollected)} />
            <Row label="Cash" value={formatKES(report.cashCollected)} />
            <Row label="Card" value={formatKES(report.cardCollected)} />
            <Row label="Other" value={formatKES(report.otherCollected)} />
          </div>
          <div className="my-4 border-t border-[var(--admin-border)]" />
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <Row label="Total collected" value={formatKES(report.totalCollected)} strong />
            <Row label="Waived" value={formatKES(report.waivedAmount)} />
            <Row label="Refunds" value={formatKES(report.refundsTotal)} />
            <Row label="Expected sales" value={formatKES(report.expectedSales)} strong />
          </div>
          <div className="mt-2">
            <Row label="Difference" value={formatKES(report.difference)} strong accent={differenceTone} />
          </div>
        </AdminPanel>

        <style>{`
          .reconciliation-ux .admin-stat p[class*="text-[11px]"],
          .reconciliation-ux .admin-stat p[class*="text-xs"] {
            font-size: 14px;
          }

          .reconciliation-ux .admin-panel-heading p {
            font-size: 16px;
          }

          @media (min-width: 640px) {
            .reconciliation-ux .admin-panel-heading p {
              font-size: 14px;
            }
          }
        `}</style>
      </div>
    </AnalyticsShell>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] px-3 py-3 transition-[border-color,box-shadow] duration-200 hover:border-[var(--admin-accent)] motion-reduce:transition-none sm:flex-row sm:items-center sm:justify-between">
      <span className="break-words text-sm admin-muted">{label}</span>
      <span className={`break-words text-sm ${strong ? "font-bold" : "font-semibold"} ${accent ?? "admin-text"}`}>{value}</span>
    </div>
  );
}
