/** Keep structured data safe when embedded in an HTML script element. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function locationPath(city: string): string {
  return `/locations/${encodeURIComponent(city.trim().toLowerCase())}`;
}

export function uniqueSitemapEntries<T extends { url: string; lastModified?: string | Date }>(entries: T[]): T[] {
  const result = new Map<string, T>();
  for (const entry of entries) {
    const previous = result.get(entry.url);
    if (!previous || (entry.lastModified && (!previous.lastModified || new Date(entry.lastModified) > new Date(previous.lastModified)))) {
      result.set(entry.url, entry);
    }
  }
  return [...result.values()];
}
