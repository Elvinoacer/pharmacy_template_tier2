/** Overview, catalogue, and visit pages rendered by the /p/{slug} catch-all. */
export const PUBLIC_STOREFRONT_SECTIONS = [
  "home",
  "about",
  "gallery",
  "medicines",
  "services",
  "location",
  "contact",
  "order",
  "refill",
  "careers",
  "delivery",
  "faq",
  "vaccinations",
  "screenings",
  "preventive",
  "how-do-you-feel",
] as const;

/**
 * Pages that exist both as Afyvia platform URLs and as `/p/{slug}/...` shop pages.
 * Bare `/contact` (etc.) is always the platform page; pharmacy identity is only
 * `/p/{slug}/contact`.
 */
export const PUBLIC_IDENTITY_SECTIONS = ["careers", "contact", "delivery", "faq"] as const;
export const PUBLIC_CLINICAL_SECTIONS = [
  "vaccinations",
  "screenings",
  "preventive",
  "how-do-you-feel",
] as const;

const DETAIL_SECTIONS = new Set(["medicines", "services", "vaccinations", "screenings"]);
const STOREFRONT_SECTIONS = new Set<string>(PUBLIC_STOREFRONT_SECTIONS);
const PREFIXABLE_STOREFRONT_SECTIONS = new Set<string>(
  PUBLIC_STOREFRONT_SECTIONS.filter((section) => section !== "home"),
);

/** Prefix shop-section links with `/p/{slug}` only when already on a storefront. */
export function tenantHref(slug: string | null | undefined, href: string): string {
  if (!slug) return href;
  if (!href.startsWith("/")) return href;
  if (/^\/(portal|login|register|forgot-password|reset-password|pharmacies|privacy|terms|onboard|admin)(?:[/?#]|$)/.test(href)) return href;
  if (href === "/") return `/p/${slug}`;
  if (href.startsWith(`/p/`)) return href;

  const pathOnly = href.split(/[?#]/)[0];
  const segment = pathOnly.split("/")[1] || "";
  if (!PREFIXABLE_STOREFRONT_SECTIONS.has(segment)) {
    return href;
  }

  return `/p/${slug}${href}`;
}

/** Only explicitly supported public pages are routable inside a pharmacy. */
export function publicStorefrontRoute(path: string[] = []) {
  const [section = "home", detail] = path;
  if (path.length > 2) return null;
  if (detail && !DETAIL_SECTIONS.has(section)) return null;
  if (!STOREFRONT_SECTIONS.has(section)) return null;
  return { section, detail };
}

/** Dual-routed shop pages. Not used to rewrite bare URLs from a remembered cookie. */
export function isPublicIdentityPath(pathname: string): boolean {
  return PUBLIC_IDENTITY_SECTIONS.some(
    (section) =>
      pathname === `/${section}` ||
      pathname.startsWith(`/${section}/`) ||
      pathname === `/api/${section}` ||
      pathname.startsWith(`/api/${section}/`),
  );
}

/** Tenant-supplied media must be an ordinary HTTPS URL or local asset path. */
export function publicImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const src = value.trim();
  if (!src || /[\\\x00-\x20]/.test(src)) return null;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
