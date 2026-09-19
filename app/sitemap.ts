import type { MetadataRoute } from "next";
import { articles, platform } from "./lib/data";
import { listDiscoveryLocations } from "./lib/services/local-discovery";
import { locationPath } from "./lib/seo";
import { listPublicCategories } from "./lib/medication-categories";
import { prismaUnscoped } from "./lib/db";
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

  const [cities, categories, vaccines] = await Promise.all([
    listDiscoveryLocations(),
    withPlatformBypass(() => listPublicCategories()),
    withPlatformBypass(() => prismaUnscoped.vaccineProduct.findMany({ where: { active: true }, select: { slug: true } })),
  ]);
  const locationRoutes = cities.map(city => ({ url: `${base}${locationPath(city)}` }));

  const categoryRoutes = categories.map((c) => ({
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

  const vaccineRoutes = vaccines.map((v) => ({
    url: `${base}/vaccinations/${v.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Large catalogues are paginated independently via /sitemap-index.xml.
  return [...staticRoutes, ...locationRoutes, ...categoryRoutes, ...articleRoutes, ...vaccineRoutes];
}
