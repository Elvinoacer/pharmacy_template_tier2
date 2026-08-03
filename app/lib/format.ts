/**
 * Format a number as a price string with 2 decimal places.
 * KES 1,234.50 — used in the medicines catalog.
 */
export function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a slug into a human-readable label.
 */
export function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
