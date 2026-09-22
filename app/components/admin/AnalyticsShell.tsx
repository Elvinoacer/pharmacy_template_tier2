import Link from "next/link";
import { AdminShell } from "@/app/components/admin/AdminShell";
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
    <div className="-mx-1 flex w-[calc(100%+0.5rem)] snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {options.map((p) => (
        <Link
          key={p}
          href={`${basePath}?period=${p}`}
          scroll={false}
          aria-current={current === p ? "date" : undefined}
          className={`inline-flex min-h-11 shrink-0 snap-start items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 ${
            current === p
              ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
              : "border-[var(--admin-border)] bg-[var(--admin-card)] admin-muted hover:border-[var(--admin-accent)] hover:bg-[var(--admin-hover)]"
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
    <AdminShell
      user={user}
      title={title}
      subtitle={description}
      actions={<PeriodSelector current={period} basePath={basePath} />}
    >
      <div className="min-w-0 space-y-4 sm:space-y-6">
        {children}
      </div>
    </AdminShell>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
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
