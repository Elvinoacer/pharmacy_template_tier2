import type { MetadataRoute } from "next";
import { articles, platform } from "./lib/data";
import { listDiscoveryLocations } from "./lib/services/local-discovery";
import { locationPath, uniqueSitemapEntries } from "./lib/seo";
import { VACCINE_CATALOG } from "./lib/vaccination-catalog";
import { listPublicCategories } from "./lib/medication-categories";
import { withPlatformBypass } from "./lib/tenant-context";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = platform.siteUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/for-pharmacies",
    "/pharmacies",
    "/locations",
    "/services",
    "/medicines",
    "/health",
    "/faq",
    "/contact",
    "/refill",
    "/how-do-you-feel",
    "/delivery",
    "/careers",
    "/privacy",
    "/terms",
    "/vaccinations",
    "/preventive",
    "/screenings",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority:
      path === ""
        ? 1
        : path === "/contact" || path === "/refill" || path === "/how-do-you-feel"
          ? 0.9
          : 0.7,
  }));

  const [cities, categories] = await Promise.all([
    listDiscoveryLocations(),
    withPlatformBypass(() => listPublicCategories()),
  ]);
  const locationRoutes = cities.map(city => ({ url: `${base}${locationPath(city)}` }));

  // Only advertise category pages that have real public inventory. Tenant-scoped
  // category rows can share the same slug, so final output is deduplicated below.
  const categoryRoutes = categories
    .filter((c) => c.publicMedCount > 0)
    .map((c) => ({
      url: `${base}/medicines/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  const articleRoutes = articles.map((a) => ({
    url: `${base}/health/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Vaccine information pages are global editorial resources. Their canonical
  // slugs come from the shared catalogue, not tenant VaccineProduct rows.
  const vaccineRoutes = VACCINE_CATALOG.map((v) => ({
    url: `${base}/vaccinations/${v.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Large catalogues are paginated independently via /sitemap-index.xml.
  // The final dedupe is deliberate: tenant-scoped records may share canonical
  // platform URLs and must never appear repeatedly in the XML.
  return uniqueSitemapEntries([
    ...staticRoutes,
    ...locationRoutes,
    ...categoryRoutes,
    ...articleRoutes,
    ...vaccineRoutes,
  ]);
}
