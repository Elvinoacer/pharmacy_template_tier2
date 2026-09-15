import type { MetadataRoute } from "next";
import { articles, platform } from "./lib/data";
import { prismaUnscoped } from "./lib/db";
import { listPublicServices } from "./lib/services/pharmacy-services";
import { listPublicCategories } from "./lib/medication-categories";
import { listPublicVaccines } from "./lib/services/vaccination-service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = platform.siteUrl;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/for-pharmacies",
    "/onboard",
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
    "/search",
    "/vaccinations",
    "/vaccinations/book",
    "/vaccinations/schedule",
    "/preventive",
    "/screenings",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority:
      path === ""
        ? 1
        : path === "/contact" || path === "/refill" || path === "/how-do-you-feel"
          ? 0.9
          : 0.7,
  }));

  const [services, categories, vaccines] = await Promise.all([
    listPublicServices().catch(() => []),
    listPublicCategories().catch(() => []),
    listPublicVaccines().catch(() => []),
  ]);

  const serviceRoutes = services.map((s) => ({
    url: `${base}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const categoryRoutes = categories.map((c) => ({
    url: `${base}/medicines/${c.slug}`,
    lastModified: now,
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
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Tenant storefronts and public pharmacy profile pages
  let storefrontRoutes: MetadataRoute.Sitemap = [];
  let medicineRoutes: MetadataRoute.Sitemap = [];
  let tenantServiceRoutes: MetadataRoute.Sitemap = [];

  try {
    const tenants = await prismaUnscoped.pharmacy.findMany({
      where: { status: "active", listed: true },
      select: { slug: true, updatedAt: true },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });

    storefrontRoutes = tenants.flatMap((t) => [
      {
        url: `${base}/pharmacies/${t.slug}`,
        lastModified: t.updatedAt || now,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      {
        url: `${base}/p/${t.slug}`,
        lastModified: t.updatedAt || now,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
    ]);

    const medicines = await prismaUnscoped.pharmacyInventory.findMany({
      where: {
        active: true,
        publicListing: true,
        pharmacy: { status: "active", listed: true },
      },
      select: {
        slug: true,
        updatedAt: true,
        pharmacy: { select: { slug: true } },
      },
      take: 1000,
    });

    medicineRoutes = medicines.flatMap((m) => [
      {
        url: `${base}/medicines/${m.slug}`,
        lastModified: m.updatedAt || now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
      {
        url: `${base}/p/${m.pharmacy.slug}/medicines/${m.slug}`,
        lastModified: m.updatedAt || now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
    ]);

    const tenantServices = await prismaUnscoped.pharmacyService.findMany({
      where: {
        active: true,
        pharmacy: { status: "active", listed: true },
      },
      select: {
        slug: true,
        updatedAt: true,
        pharmacy: { select: { slug: true } },
      },
      take: 500,
    });

    tenantServiceRoutes = tenantServices.map((s) => ({
      url: `${base}/p/${s.pharmacy.slug}/services/${s.slug}`,
      lastModified: s.updatedAt || now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable during build — network routes still emit.
  }

  return [
    ...staticRoutes,
    ...storefrontRoutes,
    ...serviceRoutes,
    ...tenantServiceRoutes,
    ...categoryRoutes,
    ...medicineRoutes,
    ...articleRoutes,
    ...vaccineRoutes,
  ];
}
