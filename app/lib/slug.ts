/** URL-safe pharmacy slug: lowercase, hyphens, 2–48 chars. */
export function slugifyPharmacyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidPharmacySlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,47}$/.test(slug) && !slug.includes("--");
}
