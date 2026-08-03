"use client";

/**
 * Reusable pagination control.
 *
 * Used by every admin/portal list page to handle massive datasets without
 * rendering thousands of rows. Pass it total count + current page + page size,
 * and it renders a clean pager that updates the URL `?page=N` query string.
 */

import Link from "next/link";

export type PaginationProps = {
  /** 1-indexed current page. */
  page: number;
  /** Total number of items across all pages. */
  total: number;
  /** Items per page. */
  pageSize: number;
  /** Base URL (without query string) for the links. */
  basePath: string;
  /** Existing query params to preserve (e.g. `?q=foo&status=active`). */
  queryParams?: Record<string, string | undefined>;
  /** Dark admin theme vs light portal theme. */
  variant?: "admin" | "portal";
  /** Query string key for the page number (default `page`). Use e.g. `cpage` when two pagers share a page. */
  pageParam?: string;
};

export function Pagination({
  page,
  total,
  pageSize,
  basePath,
  queryParams = {},
  variant = "admin",
  pageParam = "page",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null; // no pager needed for single-page results

  const current = Math.min(Math.max(1, page), totalPages);

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (v && k !== pageParam) params.set(k, v);
    }
    params.set(pageParam, String(p));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  // Show a window of pages around the current one.
  const windowSize = 2;
  const start = Math.max(1, current - windowSize);
  const end = Math.min(totalPages, current + windowSize);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const btnBase =
    variant === "admin"
      ? "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition"
      : "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-xs font-semibold transition";
  const btnIdle =
    variant === "admin"
      ? "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
      : "bg-[#f4f7f4] text-[#5a6b62] hover:bg-[#e6f4ef] hover:text-[#0d6e5a]";
  const btnActive =
    variant === "admin"
      ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)]"
      : "bg-[#0d6e5a] text-white";
  const btnDisabled =
    variant === "admin"
      ? "opacity-40 cursor-not-allowed bg-[var(--admin-inset)] admin-muted"
      : "opacity-40 cursor-not-allowed bg-[#f4f7f4] text-[#5a6b62]";

  return (
    <nav
      aria-label="Pagination"
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${
        variant === "admin" ? "border-[var(--admin-border)]" : "border-[#e3ebe6]"
      }`}
    >
      <p
        className={`text-xs ${variant === "admin" ? "admin-muted" : "text-[#5a6b62]"}`}
      >
        Showing{" "}
        <strong>{(current - 1) * pageSize + 1}</strong>–
        <strong>{Math.min(current * pageSize, total)}</strong> of{" "}
        <strong>{total}</strong>
      </p>
      <div className="flex items-center gap-1">
        {current > 1 ? (
          <Link href={buildUrl(current - 1)} className={`${btnBase} ${btnIdle}`}>
            ← Prev
          </Link>
        ) : (
          <span className={`${btnBase} ${btnDisabled}`}>← Prev</span>
        )}
        {start > 1 && (
          <>
            <Link href={buildUrl(1)} className={`${btnBase} ${btnIdle}`}>1</Link>
            {start > 2 && <span className="px-1 text-xs opacity-50">…</span>}
          </>
        )}
        {pages.map((p) => (
          <Link
            key={p}
            href={buildUrl(p)}
            className={`${btnBase} ${p === current ? btnActive : btnIdle}`}
            aria-current={p === current ? "page" : undefined}
          >
            {p}
          </Link>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-xs opacity-50">…</span>}
            <Link href={buildUrl(totalPages)} className={`${btnBase} ${btnIdle}`}>
              {totalPages}
            </Link>
          </>
        )}
        {current < totalPages ? (
          <Link href={buildUrl(current + 1)} className={`${btnBase} ${btnIdle}`}>
            Next →
          </Link>
        ) : (
          <span className={`${btnBase} ${btnDisabled}`}>Next →</span>
        )}
      </div>
    </nav>
  );
}

// Re-export for convenience; prefer importing from `@/app/lib/pagination`
// in Server Components so they do not pull this "use client" module just
// for a pure helper.
export { parsePageParam } from "@/app/lib/pagination";
