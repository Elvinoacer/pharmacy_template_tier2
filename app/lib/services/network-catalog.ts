import "server-only";
import { distanceKm, proximityOrder, type Coordinates } from "@/app/lib/proximity";

import { prismaUnscoped } from "@/app/lib/db";
import { titleFromSlug } from "@/app/lib/medication-categories";
import { withPlatformBypass } from "@/app/lib/tenant-context";

export type NetworkPharmacySummary = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  county: string | null;
  logoUrl: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type NetworkMedicineListing = {
  id: string;
  slug: string;
  href: string;
  price: number;
  currentStock: number;
  distanceKm?: number | null;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  pharmacy: NetworkPharmacySummary;
  medicationMaster: {
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
  };
};

export type NetworkServiceListing = {
  id: string;
  slug: string;
  href: string;
  title: string;
  short: string;
  description: string;
  benefits: string[];
  eligibility: string | null;
  duration: string | null;
  imageUrl: string | null;
  icon: string | null;
  price: number | null;
  bookable: boolean;
  sortOrder: number;
  distanceKm?: number | null;
  pharmacy: NetworkPharmacySummary;
};

export type NetworkCategoryOption = {
  slug: string;
  name: string;
};

function priceNumber(value: { toString(): string } | number | null): number | null {
  if (value == null) return null;
  const next = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(next) ? next : null;
}

function pharmacyWhere(pharmacySlug?: string) {
  return {
    status: "active" as const,
    listed: true,
    verifiedAt: { not: null },
    ...(pharmacySlug ? { slug: pharmacySlug } : {}),
  };
}

/**
 * Public-safe cross-tenant medicine catalogue.
 *
 * The explicit bypass is required for Postgres RLS, but every query still
 * fails closed to publicListing=true and an active, listed pharmacy.
 */
export async function listNetworkMedicineListings(opts?: {
  q?: string;
  category?: string;
  inStock?: boolean;
  pharmacySlug?: string;
  origin?: Coordinates | null;
  skip?: number;
  take?: number;
}) {
  return withPlatformBypass(async () => {
    const q = opts?.q?.trim();
    const category = opts?.category?.trim();
    const pharmacySlug = opts?.pharmacySlug?.trim().toLowerCase();
    const pharmacyFilter = pharmacyWhere(pharmacySlug);

    const medicationMaster = {
      status: "active",
      ...(category && category !== "all" ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { genericName: { contains: q, mode: "insensitive" as const } },
              { brandName: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const where = {
      active: true,
      publicListing: true,
      ...(opts?.inStock ? { currentStock: { gt: 0 } } : {}),
      pharmacy: pharmacyFilter,
      medicationMaster,
    };

    const origin = opts?.origin;
    const skip = Math.max(0, opts?.skip ?? 0);
    const take = Math.min(100, Math.max(1, opts?.take ?? 24));
    const partitions = origin ? await prismaUnscoped.pharmacyInventory.groupBy({ by: ["pharmacyId"], where, _count: { _all: true } }) : [];
    const providers = origin ? await prismaUnscoped.pharmacy.findMany({ where: pharmacyFilter, select: { id: true, name: true, latitude: true, longitude: true } }) : [];
    const ranked = providers.map((provider) => ({ ...provider, distanceKm: origin ? distanceKm(origin, provider) : null })).sort((a, b) => proximityOrder(a, b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    let remainingSkip = skip;
    let remainingTake = take;
    const pageParts: { pharmacyId: string; skip: number; take: number }[] = [];
    const counts = new Map(partitions.map((part) => [part.pharmacyId, part._count._all]));
    for (const provider of ranked) {
      const count = counts.get(provider.id) || 0;
      if (remainingSkip >= count) { remainingSkip -= count; continue; }
      if (!remainingTake) break;
      const partTake = Math.min(remainingTake, count - remainingSkip);
      pageParts.push({ pharmacyId: provider.id, skip: remainingSkip, take: partTake });
      remainingTake -= partTake; remainingSkip = 0;
    }
    const nearbyIds = origin ? (await Promise.all(pageParts.map((part) => prismaUnscoped.pharmacyInventory.findMany({ where: { ...where, pharmacyId: part.pharmacyId }, select: { id: true }, orderBy: [{ currentStock: "desc" }, { id: "asc" }], skip: part.skip, take: part.take })))).flat().map((row) => row.id) : null;

    const [total, rows, categoryRows, selectedPharmacy] = await Promise.all([
      prismaUnscoped.pharmacyInventory.count({ where }),
      prismaUnscoped.pharmacyInventory.findMany({
        where: nearbyIds ? { ...where, id: { in: nearbyIds } } : where,
        select: {
          id: true,
          slug: true,
          price: true,
          currentStock: true,
          overTheCounter: true,
          prescriptionRequired: true,
          pharmacy: {
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              county: true,
              logoUrl: true,
              latitude: true,
              longitude: true,
            },
          },
          medicationMaster: {
            select: {
              name: true,
              description: true,
              category: true,
              imageUrl: true,
            },
          },
        },
        orderBy: [{ currentStock: "desc" }, { updatedAt: "desc" }],
        skip: nearbyIds ? 0 : skip,
        take,
      }),
      prismaUnscoped.medicationMaster.findMany({
        where: {
          status: "active",
          pharmacyInventory: {
            some: {
              active: true,
              publicListing: true,
              pharmacy: pharmacyFilter,
            },
          },
        },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
      pharmacySlug
        ? prismaUnscoped.pharmacy.findFirst({
            where: pharmacyFilter,
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              county: true,
              logoUrl: true,
              latitude: true,
              longitude: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (nearbyIds) { const rank = new Map(nearbyIds.map((id, index) => [id, index])); rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)); }
    const items: NetworkMedicineListing[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      href: `/p/${row.pharmacy.slug}/medicines/${row.slug}`,
      price: priceNumber(row.price) ?? 0,
      currentStock: row.currentStock,
      distanceKm: origin ? distanceKm(origin, row.pharmacy) : null,
      overTheCounter: row.overTheCounter,
      prescriptionRequired: row.prescriptionRequired,
      pharmacy: row.pharmacy,
      medicationMaster: row.medicationMaster,
    }));

    const categories: NetworkCategoryOption[] = categoryRows
      .map((row) => (row.category || "general").trim().toLowerCase() || "general")
      .filter((slug, index, all) => all.indexOf(slug) === index)
      .map((slug) => ({ slug, name: titleFromSlug(slug) }));

    return { total, items, categories, selectedPharmacy };
  });
}

/** Public-safe cross-tenant service catalogue for active, listed pharmacies. */
export async function listNetworkServiceListings(opts?: {
  q?: string;
  pharmacySlug?: string;
  origin?: Coordinates | null;
}) {
  return withPlatformBypass(async () => {
    const q = opts?.q?.trim();
    const pharmacySlug = opts?.pharmacySlug?.trim().toLowerCase();
    const pharmacyFilter = pharmacyWhere(pharmacySlug);

    const [rows, selectedPharmacy] = await Promise.all([
      prismaUnscoped.pharmacyService.findMany({
        where: {
          active: true,
          pharmacy: pharmacyFilter,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" as const } },
                  { short: { contains: q, mode: "insensitive" as const } },
                  { description: { contains: q, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          slug: true,
          title: true,
          short: true,
          description: true,
          benefits: true,
          eligibility: true,
          duration: true,
          imageUrl: true,
          icon: true,
          price: true,
          bookable: true,
          sortOrder: true,
          pharmacy: {
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              county: true,
              logoUrl: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],

      }),
      pharmacySlug
        ? prismaUnscoped.pharmacy.findFirst({
            where: pharmacyFilter,
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              county: true,
              logoUrl: true,
              latitude: true,
              longitude: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const services: NetworkServiceListing[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      href: `/p/${row.pharmacy.slug}/services/${row.slug}`,
      title: row.title,
      short: row.short,
      description: row.description,
      benefits: row.benefits || [],
      eligibility: row.eligibility,
      duration: row.duration,
      imageUrl: row.imageUrl,
      icon: row.icon,
      price: priceNumber(row.price),
      bookable: row.bookable,
      sortOrder: row.sortOrder,
      distanceKm: opts?.origin ? distanceKm(opts.origin, row.pharmacy) : null,
      pharmacy: row.pharmacy,
    }));

    if (opts?.origin) services.sort((a, b) => proximityOrder(a, b) || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    return { services, selectedPharmacy };
  });
}
