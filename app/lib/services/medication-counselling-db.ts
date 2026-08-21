import "server-only";

import { prisma } from "../db";
import {
  CURATED_COUNSELLING_PROFILES,
  generateDynamicCounsellingProfile,
  type MedicationCounsellingProfile,
} from "../medication-counselling";

/**
 * Look up a medication counselling profile by slug or generic name from database
 * and fallback to curated or dynamic profile.
 */
export async function getMedicationCounsellingBySlug(
  slug: string
): Promise<MedicationCounsellingProfile | null> {
  const normSlug = slug.toLowerCase().trim();

  // Try direct curated match
  if (CURATED_COUNSELLING_PROFILES[normSlug]) {
    return CURATED_COUNSELLING_PROFILES[normSlug];
  }

  // Look up in database
  const inventoryItem = await prisma.pharmacyInventory
    .findFirst({
      where: { slug: normSlug },
      include: {
        medicationMaster: {
          include: {
            dosageForm: true,
            route: true,
            activeIngredients: { include: { activeIngredient: true } },
          },
        },
      },
    })
    .catch(() => null);

  if (!inventoryItem?.medicationMaster) {
    // Check if generic name matches curated
    for (const [key, profile] of Object.entries(CURATED_COUNSELLING_PROFILES)) {
      if (normSlug.includes(key)) return profile;
    }
    return null;
  }

  const master = inventoryItem.medicationMaster;
  return generateDynamicCounsellingProfile(
    master.name,
    master.genericName,
    master.category,
    master.dosageForm?.value || null,
    master.dosage,
    master.storage,
    master.sideEffects
  );
}

/**
 * Get all available counselling medications for search & directory
 */
export async function getAllCounsellingMedications(): Promise<
  Array<{
    slug: string;
    name: string;
    genericName: string;
    category: string;
    hasCuratedGuide: boolean;
  }>
> {
  const inventoryItems = await prisma.pharmacyInventory
    .findMany({
      where: { active: true },
      include: {
        medicationMaster: {
          select: { name: true, genericName: true, category: true },
        },
      },
      take: 100,
    })
    .catch(() => []);

  const results = inventoryItems.map((item) => ({
    slug: item.slug,
    name: item.medicationMaster.name,
    genericName: item.medicationMaster.genericName,
    category: item.medicationMaster.category,
    hasCuratedGuide: Boolean(
      CURATED_COUNSELLING_PROFILES[item.slug] ||
        CURATED_COUNSELLING_PROFILES[
          item.medicationMaster.genericName.toLowerCase()
        ]
    ),
  }));

  // Ensure curated are always present
  for (const [key, profile] of Object.entries(CURATED_COUNSELLING_PROFILES)) {
    if (!results.some((r) => r.slug === key)) {
      results.unshift({
        slug: key,
        name: `${profile.brandNames[0]} (${profile.genericName})`,
        genericName: profile.genericName,
        category: profile.categorySlug,
        hasCuratedGuide: true,
      });
    }
  }

  return results;
}
