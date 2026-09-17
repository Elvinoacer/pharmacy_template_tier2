import "server-only";
import { withPlatformBypass } from "@/app/lib/tenant-context";
import { Prisma } from "@/app/generated/prisma/client";

import { prismaUnscoped } from "@/app/lib/db/prisma";
import {
  buildDirectoryPharmacyWhere,
  pharmacySupportsDelivery,
} from "@/app/lib/pharmacy-directory-query";

export type DirectoryPharmacy = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  featured: boolean;
  city: string | null;
  county: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  whatsapp: string | null;
  phone: string | null;
  stockCount: number;
  otcCount: number;
  topCategories: string[];
  services: string[];
  hasDelivery: boolean;
  hasSearchedMedicine: boolean;
  searchedMedicineCount: number;
};

type DirectoryOptions = {
  q?: string;
  city?: string;
  county?: string;
  category?: string;
  delivery?: boolean;
  featured?: boolean;
};

function titleCaseCategory(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type StockAggRow = { pharmacyId: string; stockCount: number; otcCount: number };
type CategoryAggRow = { pharmacyId: string; category: string; n: number };
type SearchAggRow = { pharmacyId: string; n: number };

async function directoryAggregates(ids: string[], q?: string) {
  if (ids.length === 0) {
    return {
      stockById: new Map<string, StockAggRow>(),
      categoriesById: new Map<string, string[]>(),
      searchById: new Map<string, number>(),
    };
  }

  const idList = Prisma.join(ids);

  try {
    const [stockRows, categoryRows, searchRows] = await Promise.all([
      prismaUnscoped.$queryRaw<StockAggRow[]>`
        SELECT
          i.pharmacy_id AS "pharmacyId",
          COUNT(*) FILTER (WHERE (i.current_stock - COALESCE(r.reserved, 0)) > 0)::int AS "stockCount",
          COUNT(*) FILTER (WHERE i.over_the_counter AND (i.current_stock - COALESCE(r.reserved, 0)) > 0)::int AS "otcCount"
        FROM pharmacy_inventory i
        LEFT JOIN (
          SELECT inventory_id, SUM(quantity) AS reserved
          FROM inventory_reservations
          WHERE status = 'active'
          GROUP BY inventory_id
        ) r ON r.inventory_id = i.id
        WHERE i.pharmacy_id IN (${idList})
          AND i.active = true
          AND i.public_listing = true
        GROUP BY i.pharmacy_id
      `,
      prismaUnscoped.$queryRaw<CategoryAggRow[]>`
        SELECT i.pharmacy_id AS "pharmacyId", COALESCE(m.category, 'general') AS category, COUNT(*)::int AS n
        FROM pharmacy_inventory i
        INNER JOIN medication_masters m ON m.id = i.medication_master_id
        LEFT JOIN (
          SELECT inventory_id, SUM(quantity) AS reserved
          FROM inventory_reservations
          WHERE status = 'active'
          GROUP BY inventory_id
        ) r ON r.inventory_id = i.id
        WHERE i.pharmacy_id IN (${idList})
          AND i.active = true
          AND i.public_listing = true
          AND (i.current_stock - COALESCE(r.reserved, 0)) > 0
        GROUP BY i.pharmacy_id, m.category
      `,
      q
        ? prismaUnscoped.$queryRaw<SearchAggRow[]>`
            SELECT i.pharmacy_id AS "pharmacyId", COUNT(*)::int AS n
            FROM pharmacy_inventory i
            INNER JOIN medication_masters m ON m.id = i.medication_master_id
            LEFT JOIN (
              SELECT inventory_id, SUM(quantity) AS reserved
              FROM inventory_reservations
              WHERE status = 'active'
              GROUP BY inventory_id
            ) r ON r.inventory_id = i.id
            WHERE i.pharmacy_id IN (${idList})
              AND i.active = true
              AND i.public_listing = true
              AND (i.current_stock - COALESCE(r.reserved, 0)) > 0
              AND (
                m.name ILIKE ${"%" + q + "%"}
                OR COALESCE(m.generic_name, '') ILIKE ${"%" + q + "%"}
                OR COALESCE(m.category, '') ILIKE ${"%" + q + "%"}
              )
            GROUP BY i.pharmacy_id
          `
        : Promise.resolve([] as SearchAggRow[]),
    ]);

    const stockById = new Map(stockRows.map((row) => [row.pharmacyId, row]));
    const categoriesById = new Map<string, string[]>();
    const grouped = new Map<string, Array<{ category: string; n: number }>>();
    for (const row of categoryRows) {
      const list = grouped.get(row.pharmacyId) ?? [];
      list.push({ category: row.category, n: row.n });
      grouped.set(row.pharmacyId, list);
    }
    for (const [pharmacyId, list] of grouped) {
      categoriesById.set(
        pharmacyId,
        list
          .sort((a, b) => b.n - a.n || a.category.localeCompare(b.category))
          .slice(0, 4)
          .map((item) => titleCaseCategory(item.category))
          .filter(Boolean),
      );
    }
    const searchById = new Map(searchRows.map((row) => [row.pharmacyId, row.n]));
    return { stockById, categoriesById, searchById };
  } catch (error) {
    console.error("[pharmacy-directory] aggregate query failed", error);
    const stockGroups = await prismaUnscoped.pharmacyInventory.groupBy({
      by: ["pharmacyId"],
      where: {
        pharmacyId: { in: ids },
        active: true,
        publicListing: true,
        currentStock: { gt: 0 },
      },
      _count: { _all: true },
    });
    const otcGroups = await prismaUnscoped.pharmacyInventory.groupBy({
      by: ["pharmacyId"],
      where: {
        pharmacyId: { in: ids },
        active: true,
        publicListing: true,
        currentStock: { gt: 0 },
        overTheCounter: true,
      },
      _count: { _all: true },
    });
    const searchGroups = q
      ? await prismaUnscoped.pharmacyInventory.groupBy({
          by: ["pharmacyId"],
          where: {
            pharmacyId: { in: ids },
            active: true,
            publicListing: true,
            currentStock: { gt: 0 },
            medicationMaster: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { genericName: { contains: q, mode: "insensitive" } },
                { category: { contains: q, mode: "insensitive" } },
              ],
            },
          },
          _count: { _all: true },
        })
      : [];
    const otcById = new Map(otcGroups.map((row) => [row.pharmacyId, row._count._all]));
    return {
      stockById: new Map(
        stockGroups.map((row) => [
          row.pharmacyId,
          { pharmacyId: row.pharmacyId, stockCount: row._count._all, otcCount: otcById.get(row.pharmacyId) ?? 0 },
        ]),
      ),
      categoriesById: new Map<string, string[]>(),
      searchById: new Map(searchGroups.map((row) => [row.pharmacyId, row._count._all])),
    };
  }
}

export async function listPharmacyDirectory(opts: DirectoryOptions = {}): Promise<DirectoryPharmacy[]> {
  const q = opts.q?.trim();

  try {
    const pharmacies = await withPlatformBypass(() =>
      prismaUnscoped.pharmacy.findMany({
        where: buildDirectoryPharmacyWhere(opts),
        orderBy: [{ featured: "desc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          tagline: true,
          description: true,
          featured: true,
          city: true,
          county: true,
          country: true,
          latitude: true,
          longitude: true,
          logoUrl: true,
          coverImageUrl: true,
          whatsapp: true,
          phone: true,
          settings: { select: { deliveryNotes: true, deliveryRadiusKm: true } },
          services: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
            select: { title: true },
            take: 4,
          },
        },
      }),
    );

    const ids = pharmacies.map((pharmacy) => pharmacy.id);
    const { stockById, categoriesById, searchById } = await withPlatformBypass(() =>
      directoryAggregates(ids, q),
    );

    return pharmacies.map((pharmacy) => {
      const stock = stockById.get(pharmacy.id);
      const searchedMedicineCount = q ? searchById.get(pharmacy.id) ?? 0 : 0;
      return {
        id: pharmacy.id,
        slug: pharmacy.slug,
        name: pharmacy.name,
        tagline: pharmacy.tagline,
        description: pharmacy.description,
        featured: pharmacy.featured,
        city: pharmacy.city,
        county: pharmacy.county,
        country: pharmacy.country,
        latitude: pharmacy.latitude,
        longitude: pharmacy.longitude,
        logoUrl: pharmacy.logoUrl,
        coverImageUrl: pharmacy.coverImageUrl,
        whatsapp: pharmacy.whatsapp,
        phone: pharmacy.phone,
        stockCount: stock?.stockCount ?? 0,
        otcCount: stock?.otcCount ?? 0,
        topCategories: categoriesById.get(pharmacy.id) ?? [],
        services: pharmacy.services.map((service) => service.title),
        hasDelivery: pharmacySupportsDelivery(pharmacy.settings),
        hasSearchedMedicine: searchedMedicineCount > 0,
        searchedMedicineCount,
      };
    });
  } catch (error) {
    console.error("[pharmacy-directory] listing query failed", error);
    return [];
  }
}

export async function getMarketplaceFeaturedPharmacies(): Promise<DirectoryPharmacy[]> {
  return (await listPharmacyDirectory({ featured: true })).slice(0, 6);
}

export async function getDirectoryFacets() {
  try {
    const [cities, counties, categories] = await Promise.all([
      prismaUnscoped.pharmacy.findMany({
        where: { status: "active", listed: true, city: { not: null } },
        select: { city: true },
        distinct: ["city"],
        orderBy: { city: "asc" },
      }),
      prismaUnscoped.pharmacy.findMany({
        where: { status: "active", listed: true, county: { not: null } },
        select: { county: true },
        distinct: ["county"],
        orderBy: { county: "asc" },
      }),
      prismaUnscoped.medicationCategory.findMany({
        where: { publicVisible: true, active: true },
        select: { name: true, slug: true },
        orderBy: { sortOrder: "asc" },
        take: 40,
      }),
    ]);
    return {
      cities: cities.map((item) => item.city).filter(Boolean) as string[],
      counties: counties.map((item) => item.county).filter(Boolean) as string[],
      categories,
    };
  } catch (error) {
    console.error("[pharmacy-directory] facet query failed", error);
    return { cities: [], counties: [], categories: [] };
  }
}
