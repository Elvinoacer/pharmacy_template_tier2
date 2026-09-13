/** Only explicitly supported public pages are routable inside a pharmacy. */
export function publicStorefrontRoute(path: string[] = []) {
  const [section = "home", detail] = path;
  if (path.length > 2) return null;
  if (detail && section !== "medicines" && section !== "services") return null;
  if (!["home", "about", "gallery", "medicines", "services", "location", "contact", "order", "refill"].includes(section)) return null;
  return { section, detail };
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
