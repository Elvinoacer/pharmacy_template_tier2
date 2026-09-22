"use client";

/**
 * Reusable pagination control.
 *
 * Used by every admin/portal list page to handle massive datasets without
 * rendering thousands of rows. Pass it total count + current page + page size,
 * and it renders a clean pager that updates the URL `?page=N` query string.
 */

import Link from "next/link";
import { tenantHref, useTenantSlug } from "./TenantLink";

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
  /** Visual surface the pager is rendered on. */
  variant?: "admin" | "portal" | "platform";
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
  const tenantSlug = useTenantSlug();
  const base = tenantHref(tenantSlug, basePath);
  if (total <= pageSize) return null;

  const current = Math.min(Math.max(1, page), totalPages);

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (v && k !== pageParam) params.set(k, v);
    }
    params.set(pageParam, String(p));
    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };

  const windowSize = 2;
  const start = Math.max(1, current - windowSize);
  const end = Math.min(totalPages, current + windowSize);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const btnBase =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-sm font-semibold transition active:scale-[0.98] focus:outline-none focus-visible:ring-2";

  const btnIdle =
    variant === "admin"
      ? "bg-[var(--admin-inset)] admin-muted hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)] focus-visible:ring-[var(--admin-accent)]"
      : variant === "platform"
        ? "border border-[#dce7e1] bg-white text-[#53645c] hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus-visible:ring-teal-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-teal-100/75 dark:hover:border-teal-300/25 dark:hover:bg-teal-300/10 dark:hover:text-white dark:focus-visible:ring-teal-300"
        : "bg-[#f4f7f4] text-[#5a6b62] hover:bg-[#e6f4ef] hover:text-[#0d6e5a] focus-visible:ring-[#0d6e5a]";

  const btnActive =
    variant === "admin"
      ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] focus-visible:ring-[var(--admin-accent)]"
      : variant === "platform"
        ? "bg-teal-700 text-white shadow-sm focus-visible:ring-teal-500 dark:bg-teal-200 dark:text-[#06110f] dark:focus-visible:ring-teal-200"
        : "bg-[#0d6e5a] text-white focus-visible:ring-[#0d6e5a]";

  const btnDisabled =
    variant === "admin"
      ? "cursor-not-allowed bg-[var(--admin-inset)] opacity-40 admin-muted"
      : variant === "platform"
        ? "cursor-not-allowed border border-[#e5ece8] bg-[#f6f8f7] text-[#98a29d] opacity-70 dark:border-white/[0.06] dark:bg-white/[0.025] dark:text-teal-100/30"
        : "cursor-not-allowed bg-[#f4f7f4] text-[#5a6b62] opacity-40";

  const borderClass =
    variant === "admin"
      ? "border-[var(--admin-border)]"
      : variant === "platform"
        ? "border-[#dce7e1] dark:border-teal-200/15"
        : "border-[#e3ebe6]";

  const mutedClass =
    variant === "admin"
      ? "admin-muted"
      : variant === "platform"
        ? "text-[#6a7972] dark:text-teal-100/60"
        : "text-[#5a6b62]";

  return (
    <nav
      aria-label="Pagination"
      className={`mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between ${borderClass}`}
    >
      <p className={`text-sm ${mutedClass}`}>
        Showing <strong>{(current - 1) * pageSize + 1}</strong>–
        <strong>{Math.min(current * pageSize, total)}</strong> of <strong>{total}</strong>
      </p>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max items-center gap-1">
          {current > 1 ? (
            <Link href={buildUrl(current - 1)} className={`${btnBase} ${btnIdle}`}>
              ← Prev
            </Link>
          ) : (
            <span className={`${btnBase} ${btnDisabled}`}>← Prev</span>
          )}

          {start > 1 && (
            <>
              <Link href={buildUrl(1)} className={`${btnBase} ${btnIdle}`}>
                1
              </Link>
              {start > 2 && <span className="px-1 text-sm opacity-50">…</span>}
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
              {end < totalPages - 1 && <span className="px-1 text-sm opacity-50">…</span>}
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
      </div>
    </nav>
  );
}

export { parsePageParam } from "@/app/lib/pagination";
