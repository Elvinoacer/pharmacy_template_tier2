import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { withPlatformBypass } from "@/app/lib/tenant-context";

/**
 * Platform standard for a qualifying public pharmacy.
 * A pharmacy must be active, listed on marketplace/storefront, and verified.
 */
export const QUALIFYING_PHARMACY_WHERE = {
  status: "active" as const,
  listed: true,
  verifiedAt: { not: null },
} as const;

/**
 * Platform standard for a qualifying canonical MedicationMaster.
 * Must be in "active" canonical status (not deprecated, archived, or needs_review).
 */
export const QUALIFYING_MEDICATION_MASTER_WHERE = {
  status: "active" as const,
} as const;

export type PublicInventoryFilterOptions = {
  id?: string | null;
  medicationMasterId?: string | null;
  pharmacyId?: string | null;
  pharmacySlug?: string | null;
  slug?: string | null;
  inStock?: boolean;
  category?: string | null;
  searchQuery?: string | null;
  excludeInventoryId?: string | null;
  excludeMasterId?: string | null;
};

/**
 * Builds the canonical Prisma where clause for public medication queries.
 *
 * Enforces the core invariant:
 * - PharmacyInventory.active = true
 * - PharmacyInventory.publicListing = true
 * - Pharmacy is active, listed, and verified
 * - MedicationMaster.status = "active"
 */
export function buildPublicInventoryWhere(opts?: PublicInventoryFilterOptions) {
  const q = opts?.searchQuery?.trim();
  const category = opts?.category?.trim();

  return {
    active: true,
    publicListing: true,
    ...(opts?.id ? { id: opts.id } : {}),
    ...(opts?.medicationMasterId ? { medicationMasterId: opts.medicationMasterId } : {}),
    // Physical stock must be positive. Callers subtract active reservations
    // (`sellableAvailable`) before presenting "in stock" to a guest.
    ...(opts?.inStock ? { currentStock: { gt: 0 } } : {}),
    ...(opts?.slug ? { slug: opts.slug } : {}),
    ...(opts?.pharmacyId ? { pharmacyId: opts.pharmacyId } : {}),
    ...(opts?.excludeInventoryId ? { id: { not: opts.excludeInventoryId } } : {}),
    pharmacy: {
      ...QUALIFYING_PHARMACY_WHERE,
      ...(opts?.pharmacySlug ? { slug: opts.pharmacySlug } : {}),
    },
    medicationMaster: {
      ...QUALIFYING_MEDICATION_MASTER_WHERE,
      ...(opts?.excludeMasterId ? { id: { not: opts.excludeMasterId } } : {}),
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
    },
  };
}

/**
 * In-memory predicate to verify whether an inventory record satisfies all public visibility criteria.
 * Used for edge cases, verification tests, and post-filtering.
 */
export function isQualifyingPublicInventory(inventory: {
  active: boolean;
  publicListing: boolean;
  currentStock?: number;
  pharmacy?: {
    status: string;
    listed: boolean;
    verifiedAt: Date | string | null;
  } | null;
  medicationMaster?: {
    status?: string | null;
  } | null;
}): boolean {
  if (!inventory.active) return false;
  if (!inventory.publicListing) return false;

  if (inventory.medicationMaster) {
    if (inventory.medicationMaster.status && inventory.medicationMaster.status !== "active") {
      return false;
    }
  }

  if (inventory.pharmacy) {
    if (inventory.pharmacy.status !== "active") return false;
    if (!inventory.pharmacy.listed) return false;
    if (!inventory.pharmacy.verifiedAt) return false;
  }

  return true;
}

/**
 * Single public medicine detail lookup.
 * Fails closed (returns null) if any public condition is violated or if publicListing=false.
 */
export async function getPublicMedicineBySlug(slug: string, pharmacyId?: string) {
  if (!slug) return null;

  return withPlatformBypass(() =>
    prismaUnscoped.pharmacyInventory.findFirst({
      where: buildPublicInventoryWhere({ slug, pharmacyId }),
      include: {
        pharmacy: {
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            county: true,
            latitude: true,
            longitude: true,
            status: true,
            listed: true,
            verifiedAt: true,
          },
        },
        medicationMaster: {
          select: {
            id: true,
            name: true,
            slug: true,
            genericName: true,
            brandName: true,
            strengthValue: true,
            strengthUnit: true,
            strengthDisplay: true,
            packSize: true,
            category: true,
            description: true,
            dosage: true,
            indications: true,
            sideEffects: true,
            contraindications: true,
            storage: true,
            clinicalNotes: true,
            imageUrl: true,
            imageUrls: true,
            alternativeIds: true,
            controlledDrug: true,
            controlledDrugSchedule: true,
            pediatricUse: true,
            requiresRefrigeration: true,
            status: true,
            dosageForm: { select: { value: true } },
            route: { select: { value: true } },
            manufacturer: { select: { name: true, country: true } },
            activeIngredients: {
              select: {
                amount: true,
                unit: true,
                activeIngredient: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  );
}

/**
 * Get qualifying public related or alternative medicines for the same pharmacy.
 */
export async function getPublicMedicineRelated(options: {
  pharmacyId: string;
  category: string;
  currentInventoryId: string;
  alternativeMasterIds?: string[];
  take?: number;
}) {
  const { pharmacyId, category, currentInventoryId, alternativeMasterIds, take = 4 } = options;

  return withPlatformBypass(async () => {
    if (alternativeMasterIds && alternativeMasterIds.length > 0) {
      const directMatches = await prismaUnscoped.pharmacyInventory.findMany({
        where: {
          ...buildPublicInventoryWhere({ pharmacyId, excludeInventoryId: currentInventoryId }),
          medicationMasterId: { in: alternativeMasterIds },
        },
        include: {
          medicationMaster: { select: { name: true, imageUrl: true, genericName: true } },
        },
        take,
      });

      if (directMatches.length > 0) return directMatches;
    }

    return prismaUnscoped.pharmacyInventory.findMany({
      where: {
        ...buildPublicInventoryWhere({ pharmacyId, category, excludeInventoryId: currentInventoryId }),
      },
      include: {
        medicationMaster: { select: { name: true, imageUrl: true, genericName: true } },
      },
      take,
    });
  });
}
