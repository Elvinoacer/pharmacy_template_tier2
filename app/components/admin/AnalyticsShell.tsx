import Link from "next/link";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminPanel } from "@/app/components/admin/AdminUI";
import { BarChart3 } from "lucide-react";
import type { SessionUser } from "@/app/lib/types";

export type PeriodOption = "today" | "7d" | "30d" | "quarter" | "year";

export const PERIOD_LABELS: Record<PeriodOption, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  quarter: "Last quarter",
  year: "Last year",
};

export function PeriodSelector({
  current,
  basePath = "/admin/analytics/overview",
}: {
  current: PeriodOption;
  basePath?: string;
}) {
  const options: PeriodOption[] = ["today", "7d", "30d", "quarter", "year"];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((p) => (
        <Link
          key={p}
          href={`${basePath}?period=${p}`}
          scroll={false}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            current === p
              ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]"
              : "border-[var(--admin-border)] admin-muted hover:border-[var(--admin-accent)]"
          }`}
        >
          {PERIOD_LABELS[p]}
        </Link>
      ))}
    </div>
  );
}

export function AnalyticsShell({
  user,
  title,
  description,
  period,
  basePath,
  children,
}: {
  user: SessionUser;
  title: string;
  description?: string;
  period: PeriodOption;
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <AdminShell user={user}>
      <div className="space-y-6">
        <AdminPanel
          title={title}
          description={description}
          action={<PeriodSelector current={period} basePath={basePath} />}
        >
          <div className="flex items-center gap-2 text-xs admin-muted">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>
              Period: <strong>{PERIOD_LABELS[period]}</strong>
            </span>
          </div>
        </AdminPanel>
        {children}
      </div>
    </AdminShell>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function formatKES(n: number): string {
  return `KES ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function formatPct(n: number): string {
  return `${Number(n || 0).toFixed(1)}%`;
}

export function formatNumber(n: number): string {
  return Number(n || 0).toLocaleString("en-KE");
}
