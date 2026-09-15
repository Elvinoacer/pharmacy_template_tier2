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
] as const;

/** Shop pages that have their own `app/{section}/page.tsx` and are also `/p/{slug}/{section}`. */
export const PUBLIC_IDENTITY_SECTIONS = ["careers", "contact", "delivery", "faq"] as const;

const DETAIL_SECTIONS = new Set(["medicines", "services"]);
const STOREFRONT_SECTIONS = new Set<string>(PUBLIC_STOREFRONT_SECTIONS);

/** Only explicitly supported public pages are routable inside a pharmacy. */
export function publicStorefrontRoute(path: string[] = []) {
  const [section = "home", detail] = path;
  if (path.length > 2) return null;
  if (detail && !DETAIL_SECTIONS.has(section)) return null;
  if (!STOREFRONT_SECTIONS.has(section)) return null;
  return { section, detail };
}

/** Bare `/careers` (and matching API) paths that belong to one pharmacy. */
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
