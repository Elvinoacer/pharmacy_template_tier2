import "server-only";
import { withPlatformBypass } from "@/app/lib/tenant-context";

import { prismaUnscoped } from "@/app/lib/db/prisma";

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

export async function listPharmacyDirectory(opts: DirectoryOptions = {}): Promise<DirectoryPharmacy[]> {
  const q = opts.q?.trim();
  const city = opts.city?.trim();
  const county = opts.county?.trim();
  const category = opts.category?.trim();

  try {
    const pharmacies = await withPlatformBypass(() => prismaUnscoped.pharmacy.findMany({
      where: {
        status: "active",
        listed: true,
        verifiedAt: { not: null },
        ...(opts.featured ? { featured: true } : {}),
        ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
        ...(county ? { county: { equals: county, mode: "insensitive" as const } } : {}),
        ...(opts.delivery
          ? { settings: { is: { deliveryNotes: { not: null } } } }
          : {}),
        ...(category || q
          ? {
              OR: [
                ...(q
                  ? [
                      { name: { contains: q, mode: "insensitive" as const } },
                      { tagline: { contains: q, mode: "insensitive" as const } },
                      { city: { contains: q, mode: "insensitive" as const } },
                      { county: { contains: q, mode: "insensitive" as const } },
                    ]
                  : []),
                {
                  inventory: {
                    some: {
                      active: true,
                      publicListing: true,
                      currentStock: { gt: 0 },
                      ...(category || q
                        ? {
                            medicationMaster: {
                              AND: [
                                ...(category
                                  ? [
                                      {
                                        category: {
                                          equals: category,
                                          mode: "insensitive" as const,
                                        },
                                      },
                                    ]
                                  : []),
                                ...(q
                                  ? [
                                      {
                                        OR: [
                                          {
                                            name: {
                                              contains: q,
                                              mode: "insensitive" as const,
                                            },
                                          },
                                          {
                                            genericName: {
                                              contains: q,
                                              mode: "insensitive" as const,
                                            },
                                          },
                                          {
                                            category: {
                                              contains: q,
                                              mode: "insensitive" as const,
                                            },
                                          },
                                        ],
                                      },
                                    ]
                                  : []),
                              ],
                            },
                          }
                        : {}),
                    },
                  },
                },
              ],
            }
          : {}),
      },
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
        inventory: {
          where: {
            active: true,
            publicListing: true,
            currentStock: { gt: 0 },
          },
          select: {
            currentStock: true,
            overTheCounter: true,
            medicationMaster: {
              select: { name: true, genericName: true, category: true },
            },
          },
          take: 250,
        },
        services: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { title: true },
          take: 4,
        },
      },
    }));

    return pharmacies.map((pharmacy) => {
      const inventory = pharmacy.inventory;
      const categories = Array.from(
        new Set(
          inventory
            .map((item) => item.medicationMaster.category)
            .filter(Boolean)
            .map(titleCaseCategory),
        ),
      ).slice(0, 4);
      const searchedItems = q
        ? inventory.filter((item) =>
            [
              item.medicationMaster.name,
              item.medicationMaster.genericName,
              item.medicationMaster.category,
            ].some((value) => value?.toLowerCase().includes(q.toLowerCase())),
          )
        : [];

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
        stockCount: inventory.length,
        otcCount: inventory.filter((item) => item.overTheCounter).length,
        topCategories: categories,
        services: pharmacy.services.map((service) => service.title),
        hasDelivery: Boolean(
          pharmacy.settings?.deliveryNotes || pharmacy.settings?.deliveryRadiusKm,
        ),
        hasSearchedMedicine: searchedItems.length > 0,
        searchedMedicineCount: searchedItems.length,
      };
    });
  } catch {
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
  } catch {
    return { cities: [], counties: [], categories: [] };
  }
}
