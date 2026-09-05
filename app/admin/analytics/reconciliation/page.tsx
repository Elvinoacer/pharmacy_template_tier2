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
import { Wallet, Scale, AlertTriangle, TrendingUp } from "lucide-react";

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

  const differenceTone = report.difference > 1 ? "text-amber-600" : report.difference < -1 ? "text-rose-600" : "text-emerald-600";

  return (
    <AnalyticsShell user={user}
      title="Payment reconciliation"
      description="Compare expected sales with collections and investigate differences."
      period={period}
      basePath="/admin/analytics/reconciliation"
    >
      <StatGrid>
        <AdminCard label="Expected Sales" value={formatKES(report.expectedSales)} hint="Sum of net sales (paid orders)" icon={TrendingUp} accent="accent" />
        <AdminCard label="Total Collected" value={formatKES(report.totalCollected)} hint="M-Pesa + cash + card + other" icon={Wallet} accent="info" />
        <AdminCard label="Refunds" value={formatKES(report.refundsTotal)} icon={Scale} accent="neutral" />
        <AdminCard label="Waived" value={formatKES(report.waivedAmount)} icon={Scale} accent="neutral" />
      </StatGrid>

      <AdminPanel title="Difference" description="Total collected + waivers − refunds − expected sales. Should be ~0.">
        <p className={`text-3xl font-bold ${differenceTone}`}>{formatKES(report.difference)}</p>
        <p className="mt-2 text-xs admin-muted">
          {report.difference > 1
            ? "Collected more than expected — verify over-collection or unrecorded sales."
            : report.difference < -1
              ? "Collected less than expected — investigate under-collection, missed payments, or unreconciled refunds."
              : "Reconciled — collections match expected sales within tolerance."}
        </p>
      </AdminPanel>

      <AdminPanel title="Breakdown by Provider">
        <div className="space-y-1.5 text-xs">
          <Row label="M-Pesa (Daraja)" value={formatKES(report.mpesaCollected)} />
          <Row label="Cash" value={formatKES(report.cashCollected)} />
          <Row label="Card" value={formatKES(report.cardCollected)} />
          <Row label="Other" value={formatKES(report.otherCollected)} />
          <div className="border-t border-[var(--admin-border)] my-2" />
          <Row label="Total collected" value={formatKES(report.totalCollected)} strong />
          <Row label="Waived" value={formatKES(report.waivedAmount)} />
          <Row label="Refunds" value={formatKES(report.refundsTotal)} />
          <div className="border-t border-[var(--admin-border)] my-2" />
          <Row label="Expected sales" value={formatKES(report.expectedSales)} strong />
          <Row label="Difference" value={formatKES(report.difference)} strong accent={differenceTone} />
        </div>
      </AdminPanel>
    </AnalyticsShell>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2">
      <span className="admin-muted">{label}</span>
      <span className={`${strong ? "font-bold" : ""} ${accent ?? "admin-text"}`}>{value}</span>
    </div>
  );
}
