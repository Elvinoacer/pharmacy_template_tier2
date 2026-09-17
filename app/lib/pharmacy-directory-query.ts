/**
 * Authoritative pharmacy-directory predicates.
 * Shared by the server query and unit tests so the browser never re-implements
 * delivery / category / search business rules.
 */

export { pharmacySupportsDelivery } from "@/app/lib/inventory-availability";

/** Prisma `settings is` clause: notes present or a positive delivery radius. */
export function directoryDeliveryWhere() {
  return {
    settings: {
      is: {
        OR: [
          {
            AND: [{ deliveryNotes: { not: null } }, { NOT: { deliveryNotes: "" } }],
          },
          { deliveryRadiusKm: { gt: 0 } },
        ],
      },
    },
  };
}

const PUBLIC_STOCK_SOME = {
  active: true,
  publicListing: true,
  currentStock: { gt: 0 },
} as const;

export function buildDirectoryPharmacyWhere(opts: {
  q?: string;
  city?: string;
  county?: string;
  category?: string;
  delivery?: boolean;
  featured?: boolean;
}) {
  const q = opts.q?.trim();
  const city = opts.city?.trim();
  const county = opts.county?.trim();
  const category = opts.category?.trim();

  const and: Record<string, unknown>[] = [];

  if (category) {
    and.push({
      inventory: {
        some: {
          ...PUBLIC_STOCK_SOME,
          medicationMaster: {
            category: { equals: category, mode: "insensitive" as const },
          },
        },
      },
    });
  }

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { tagline: { contains: q, mode: "insensitive" as const } },
        { city: { contains: q, mode: "insensitive" as const } },
        { county: { contains: q, mode: "insensitive" as const } },
        {
          services: {
            some: {
              active: true,
              title: { contains: q, mode: "insensitive" as const },
            },
          },
        },
        {
          inventory: {
            some: {
              ...PUBLIC_STOCK_SOME,
              medicationMaster: {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { genericName: { contains: q, mode: "insensitive" as const } },
                  { category: { contains: q, mode: "insensitive" as const } },
                ],
              },
            },
          },
        },
      ],
    });
  }

  return {
    status: "active" as const,
    listed: true,
    verifiedAt: { not: null },
    ...(opts.featured ? { featured: true } : {}),
    ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
    ...(county ? { county: { equals: county, mode: "insensitive" as const } } : {}),
    ...(opts.delivery ? directoryDeliveryWhere() : {}),
    ...(and.length ? { AND: and } : {}),
  };
}
