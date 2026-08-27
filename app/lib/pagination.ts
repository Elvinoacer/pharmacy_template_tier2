/**
 * Server-safe pagination helpers.
 * Kept out of the "use client" Pagination component so Server Components
 * can import parsePageParam without pulling client-only module boundaries.
 */

export function parsePageParam(
  value: string | undefined,
  total: number,
  pageSize: number,
): number {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), totalPages);
}
