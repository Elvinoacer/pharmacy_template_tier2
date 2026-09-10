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
    <div className="-mx-1 max-w-[calc(100vw-2rem)] overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:max-w-none sm:overflow-visible sm:px-0 sm:pb-0">
      <div className="flex min-w-max items-center gap-1.5">
        {options.map((p) => (
          <Link
            key={p}
            href={`${basePath}?period=${p}`}
            scroll={false}
            aria-current={current === p ? "date" : undefined}
            className={`inline-flex min-h-9 items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)] motion-reduce:transition-none ${
              current === p
                ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] shadow-sm"
                : "border-[var(--admin-border)] admin-muted hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)]"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>
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
    <AdminShell user={user} title={title} subtitle={description} actions={<PeriodSelector current={period} basePath={basePath} />}>
      <div className="space-y-4 sm:space-y-6">
        {children}
      </div>
    </AdminShell>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-0 grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-3 lg:grid-cols-4 [&_.admin-stat]:min-w-0 [&_.admin-stat]:overflow-hidden [&_.admin-stat]:p-4 sm:[&_.admin-stat]:p-5 [&_.admin-stat_.admin-text]:break-words">{children}</div>;
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
