import "server-only";

import { prismaUnscoped } from "@/app/lib/db/prisma";
import { formatPrice } from "@/app/lib/format";
import { sellableFromInventory } from "@/app/lib/inventory-availability";
import { listPharmacyDirectory } from "@/app/lib/services/pharmacy-directory";
import { buildPublicInventoryWhere } from "@/app/lib/services/public-medication-visibility";

export type AssistMedicineMatch = {
  slug: string;
  name: string;
  genericName: string;
  brandName: string | null;
  strength: string | null;
  priceKes: string;
  availability: "in_stock" | "low_stock" | "out_of_stock";
  pharmacies: Array<{
    slug: string;
    name: string;
    location: string;
    href: string;
  }>;
};

export type AssistPharmacyMatch = {
  slug: string;
  name: string;
  location: string;
  href: string;
  delivery: boolean;
  stocksQuery: boolean;
};

export type AssistLiveMatches = {
  medicines: AssistMedicineMatch[];
  pharmacies: AssistPharmacyMatch[];
};

const MEDICATION_LIMIT = 36;
const RESULT_LIMIT = 5;

function locationOf(city: string | null, county: string | null): string {
  return [city, county].filter(Boolean).join(", ") || "Kenya";
}

function availabilityOf(stock: number, threshold: number): AssistMedicineMatch["availability"] {
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}

function availabilityRank(value: AssistMedicineMatch["availability"]): number {
  return value === "in_stock" ? 3 : value === "low_stock" ? 2 : 1;
}

/**
 * Live, public-safe network lookup used by the page-assist UI.
 * It deliberately uses the unscoped client because this feature answers
 * network questions such as “who has X?” across listed Afyvia pharmacies.
 */
export async function searchAssistLive(rawQuery: string): Promise<AssistLiveMatches> {
  const query = rawQuery.trim().replace(/\s+/g, " ").slice(0, 100);
  if (query.length < 2) return { medicines: [], pharmacies: [] };

  try {
    const [inventoryRows, directoryRows] = await Promise.all([
      prismaUnscoped.pharmacyInventory.findMany({
        where: {
          ...buildPublicInventoryWhere(),
          medicationMaster: {
            status: "active",
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { genericName: { contains: query, mode: "insensitive" } },
              { brandName: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        select: {
          pharmacyId: true,
          slug: true,
          price: true,
          currentStock: true,
          lowStockThreshold: true,
          reservations: { where: { status: "active" }, select: { quantity: true } },
          medicationMaster: {
            select: {
              id: true,
              name: true,
              genericName: true,
              brandName: true,
              strengthDisplay: true,
            },
          },
        },
        orderBy: [{ currentStock: "desc" }, { updatedAt: "desc" }],
        take: MEDICATION_LIMIT,
      }),
      listPharmacyDirectory({ q: query }),
    ]);

    const pharmacyIds = Array.from(new Set(inventoryRows.map((row) => row.pharmacyId)));
    const pharmacies = pharmacyIds.length
      ? await prismaUnscoped.pharmacy.findMany({
          where: { id: { in: pharmacyIds }, status: "active", listed: true },
          select: { id: true, slug: true, name: true, city: true, county: true },
        })
      : [];

    const pharmacyById = new Map(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));
    const grouped = new Map<string, AssistMedicineMatch>();

    for (const row of inventoryRows) {
      const pharmacy = pharmacyById.get(row.pharmacyId);
      if (!pharmacy) continue;

      const key = `${row.medicationMaster.id}:${row.medicationMaster.name}:${row.medicationMaster.strengthDisplay ?? ""}`;
      const rowAvailability = availabilityOf(sellableFromInventory(row), row.lowStockThreshold);
      const existing = grouped.get(key);
      const price = Number(row.price?.toString?.() ?? row.price);
      const pharmacyMatch = {
        slug: pharmacy.slug,
        name: pharmacy.name,
        location: locationOf(pharmacy.city, pharmacy.county),
        href: `/p/${pharmacy.slug}/medicines/${row.slug}`,
      };

      if (existing) {
        if (!existing.pharmacies.some((item) => item.slug === pharmacy.slug)) {
          existing.pharmacies.push(pharmacyMatch);
        }
        if (availabilityRank(rowAvailability) > availabilityRank(existing.availability)) {
          existing.availability = rowAvailability;
          if (Number.isFinite(price)) existing.priceKes = formatPrice(price);
        }
        continue;
      }

      grouped.set(key, {
        slug: row.slug,
        name: row.medicationMaster.name,
        genericName: row.medicationMaster.genericName,
        brandName: row.medicationMaster.brandName,
        strength: row.medicationMaster.strengthDisplay,
        priceKes: formatPrice(Number.isFinite(price) ? price : 0),
        availability: rowAvailability,
        pharmacies: [pharmacyMatch],
      });
    }

    const directPharmacyMatches: AssistPharmacyMatch[] = directoryRows.slice(0, RESULT_LIMIT).map((pharmacy) => ({
      slug: pharmacy.slug,
      name: pharmacy.name,
      location: locationOf(pharmacy.city, pharmacy.county),
      href: `/p/${pharmacy.slug}`,
      delivery: pharmacy.hasDelivery,
      stocksQuery: pharmacy.hasSearchedMedicine,
    }));

    const stockPharmacyMatches: AssistPharmacyMatch[] = Array.from(grouped.values())
      .flatMap((medicine) => medicine.pharmacies)
      .map((pharmacy) => ({
        slug: pharmacy.slug,
        name: pharmacy.name,
        location: pharmacy.location,
        href: `/p/${pharmacy.slug}`,
        delivery: false,
        stocksQuery: true,
      }));

    const pharmacyMap = new Map<string, AssistPharmacyMatch>();
    for (const pharmacy of [...stockPharmacyMatches, ...directPharmacyMatches]) {
      const existing = pharmacyMap.get(pharmacy.slug);
      pharmacyMap.set(
        pharmacy.slug,
        existing
          ? {
              ...existing,
              stocksQuery: existing.stocksQuery || pharmacy.stocksQuery,
              delivery: existing.delivery || pharmacy.delivery,
            }
          : pharmacy,
      );
    }

    return {
      medicines: Array.from(grouped.values()).slice(0, RESULT_LIMIT),
      pharmacies: Array.from(pharmacyMap.values()).slice(0, RESULT_LIMIT),
    };
  } catch (error) {
    console.error("[assist-live-lookup]", error);
    return { medicines: [], pharmacies: [] };
  }
}
