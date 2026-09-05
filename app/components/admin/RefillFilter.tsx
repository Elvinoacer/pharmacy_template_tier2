"use client";

/**
 * Refill search + status filter bar.
 *
 * Adds:
 *   - A visible Search button next to the input (previously the form relied
 *     on Enter to submit, which was not discoverable).
 *   - A Clear button when a query is active.
 */

import Link from "next/link";
import { Search, X } from "lucide-react";
import { REFILL_STATUSES } from "@/app/lib/types";
import { Pill, Clock, ListChecks, CheckCircle2, PackageCheck, XCircle } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  submitted: Clock,
  under_review: ListChecks,
  approved: CheckCircle2,
  preparing: Pill,
  ready_for_pickup: PackageCheck,
  collected: CheckCircle2,
  cancelled: XCircle,
};

export function RefillFilter({
  counts,
  active,
  search,
}: {
  counts: Record<string, number>;
  active: string;
  search?: string;
}) {
  const searchParam = search ? `&q=${encodeURIComponent(search)}` : "";
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mb-4 space-y-3">
      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={`/admin/refills${search ? `?q=${encodeURIComponent(search)}` : ""}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            active === "all"
              ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]"
              : "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
          }`}
        >
          All <span className="rounded-full bg-black/15 px-1.5 text-xs">{total}</span>
        </Link>
        {REFILL_STATUSES.map((s) => {
          const Icon = ICONS[s.value] || Pill;
          const isActive = active === s.value;
          const count = counts[s.value] || 0;
          return (
            <Link
              key={s.value}
              href={`/admin/refills?status=${s.value}${searchParam}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]"
                  : "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
              }`}
            >
              <Icon className="h-3 w-3" />
              {s.label}
              <span className="rounded-full bg-black/15 px-1.5 text-xs">{count}</span>
            </Link>
          );
        })}
      </div>

      {/* Search bar with explicit submit + clear buttons */}
      <form className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="q"
            defaultValue={search || ""}
            placeholder="Search medicine, Rx ref, customer name…"
            className="input-admin pl-9"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-110"
        >
          <Search className="h-3.5 w-3.5" /> Search
        </button>
        {search && (
          <Link
            href={active !== "all" ? `/admin/refills?status=${active}` : "/admin/refills"}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-inset-2)] px-3 py-1.5 text-xs font-semibold admin-muted transition hover:bg-[var(--admin-inset)] hover:text-[var(--admin-text)]"
          >
            <X className="h-3 w-3" /> Clear
          </Link>
        )}
      </form>
    </div>
  );
}
