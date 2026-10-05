import "server-only";
import type { MetadataRoute } from "next";
import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { buildPublicInventoryWhere, QUALIFYING_PHARMACY_WHERE } from "./public-medication-visibility";
import { platform } from "@/app/lib/data";
import { uniqueSitemapEntries } from "@/app/lib/seo";

// At most three URLs per row: well below the 50,000 URL / 50MB limits.
export const SITEMAP_BATCH = 5000;
const serviceWhere = { active: true, pharmacy: QUALIFYING_PHARMACY_WHERE };
export async function discoverySitemapKeys() {
  return withPlatformBypass(async () => {
    const counts = await Promise.all([
      prismaUnscoped.pharmacy.count({ where: QUALIFYING_PHARMACY_WHERE }),
      prismaUnscoped.pharmacyInventory.count({ where: buildPublicInventoryWhere() }),
      prismaUnscoped.pharmacyService.count({ where: serviceWhere }),
    ]);
    return counts.flatMap((count, i) => Array.from({ length: Math.ceil(count / SITEMAP_BATCH) }, (_, page) => `${["pharmacies", "medicines", "services"][i]}-${page}.xml`));
  });
}
export async function discoverySitemapPage(kind: string, page: number): Promise<MetadataRoute.Sitemap> {
  return withPlatformBypass(async () => {
    const paging = { skip: page * SITEMAP_BATCH, take: SITEMAP_BATCH, orderBy: { id: "asc" as const } };
    const entry = (path: string, updatedAt: Date) => ({ url: `${platform.siteUrl}${path}`, lastModified: updatedAt });
    if (kind === "pharmacies") {
      const rows = await prismaUnscoped.pharmacy.findMany({ ...paging, where: QUALIFYING_PHARMACY_WHERE, select: { slug: true, updatedAt: true } });
      return uniqueSitemapEntries(rows.map(p => entry(`/pharmacies/${p.slug}`, p.updatedAt)));
    }
    if (kind === "medicines") {
      const rows = await prismaUnscoped.pharmacyInventory.findMany({ ...paging, where: buildPublicInventoryWhere(), select: { slug: true, updatedAt: true, pharmacy: { select: { slug: true } }, medicationMaster: { select: { slug: true } } } });
      return uniqueSitemapEntries(rows.flatMap(m => [entry(`/p/${m.pharmacy.slug}/medicines/${m.slug}`, m.updatedAt), { url: `${platform.siteUrl}/medicines/${m.medicationMaster.slug}` }]));
    }
    const rows = await prismaUnscoped.pharmacyService.findMany({ ...paging, where: serviceWhere, select: { slug: true, updatedAt: true, pharmacy: { select: { slug: true } } } });
    const counts = rows.length ? await prismaUnscoped.pharmacyService.groupBy({
      by: ["slug"], where: { ...serviceWhere, slug: { in: [...new Set(rows.map(s => s.slug))] } }, _count: { _all: true },
    }) : [];
    const comparisonSlugs = new Set(counts.filter(row => row._count._all > 1).map(row => row.slug));
    return uniqueSitemapEntries(rows.flatMap(s => [
      entry(`/p/${s.pharmacy.slug}/services/${s.slug}`, s.updatedAt),
      ...(comparisonSlugs.has(s.slug) ? [{ url: `${platform.siteUrl}/services/${s.slug}` }] : []),
    ]));
  });
}
export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
}
