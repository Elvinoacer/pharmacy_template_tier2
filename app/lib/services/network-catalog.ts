import "server-only";

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
};

export type NetworkMedicineListing = {
  id: string;
  slug: string;
  href: string;
  price: number;
  currentStock: number;
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
  pharmacySlug?: string;
  skip?: number;
  take?: number;
}) {
  return withPlatformBypass(async () => {
    const q = opts?.q?.trim();
    const category = opts?.category?.trim();
    const pharmacySlug = opts?.pharmacySlug?.trim().toLowerCase();
    const pharmacyFilter = pharmacyWhere(pharmacySlug);

    const medicationMaster = {
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
      pharmacy: pharmacyFilter,
      ...(Object.keys(medicationMaster).length > 0 ? { medicationMaster } : {}),
    };

    const [total, rows, categoryRows, selectedPharmacy] = await Promise.all([
      prismaUnscoped.pharmacyInventory.count({ where }),
      prismaUnscoped.pharmacyInventory.findMany({
        where,
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
        skip: opts?.skip ?? 0,
        take: opts?.take ?? 24,
      }),
      prismaUnscoped.medicationMaster.findMany({
        where: {
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
            },
          })
        : Promise.resolve(null),
    ]);

    const items: NetworkMedicineListing[] = rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      href: `/p/${row.pharmacy.slug}/medicines/${row.slug}`,
      price: priceNumber(row.price) ?? 0,
      currentStock: row.currentStock,
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
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        take: 240,
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
      pharmacy: row.pharmacy,
    }));

    return { services, selectedPharmacy };
  });
}
