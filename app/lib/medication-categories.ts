import "server-only";

import { prisma } from "@/app/lib/db";

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  brands: string[];
  tips: string[];
  publicVisible: boolean;
  sortOrder: number;
  active: boolean;
  count: number;
  /** True when the slug exists only on medications (not yet in registry). */
  orphan?: boolean;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  brands: string[];
  tips: string[];
  sortOrder: number;
  /** Live count of public-listed active inventory in this category. */
  publicMedCount: number;
};

/** Normalize a free-text label into a stable slug for Medication.category. */
export function slugifyCategory(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mapRow(
  r: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    brands: string[];
    tips: string[];
    publicVisible: boolean;
    sortOrder: number;
    active: boolean;
  },
  count: number,
): CategoryWithCount {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    imageUrl: r.imageUrl,
    brands: r.brands || [],
    tips: r.tips || [],
    publicVisible: r.publicVisible,
    sortOrder: r.sortOrder,
    active: r.active,
    count,
  };
}

/**
 * Ensure every distinct Medication.category has a registry row, then return
 * all categories with live medication counts (including empty ones).
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const [registry, grouped] = await Promise.all([
    prisma.medicationCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.medicationMaster.groupBy({
      by: ["category"],
      _count: { _all: true },
    }),
  ]);

  const countBySlug = new Map<string, number>();
  for (const g of grouped) {
    const slug = (g.category || "general").trim().toLowerCase() || "general";
    countBySlug.set(slug, (countBySlug.get(slug) || 0) + g._count._all);
  }

  const known = new Set(registry.map((r) => r.slug));

  // Backfill orphan slugs that appear on meds but not in the registry.
  const orphans = [...countBySlug.keys()].filter((s) => !known.has(s));
  if (orphans.length > 0) {
    await prisma.medicationCategory.createMany({
      data: orphans.map((slug) => ({
        name: titleFromSlug(slug),
        slug,
        sortOrder: 999,
        active: true,
        publicVisible: true,
      })),
      skipDuplicates: true,
    });
  }

  const rows =
    orphans.length > 0
      ? await prisma.medicationCategory.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : registry;

  return rows.map((r) => mapRow(r, countBySlug.get(r.slug) || 0));
}

/** Active category slugs/names for medication form dropdowns. */
export async function listActiveCategoryOptions(): Promise<
  Array<{ slug: string; name: string }>
> {
  try {
    const cats = await listCategoriesWithCounts();
    return cats
      .filter((c) => c.active)
      .map((c) => ({ slug: c.slug, name: c.name }));
  } catch (err) {
    console.error("[listActiveCategoryOptions]", err);
    // Production must not invent a healthy-looking taxonomy when the database
    // is unavailable. An empty list makes the failure visible and prevents
    // users from choosing categories that do not exist in this tenant's data.
    return [];
  }
}

const CATEGORY_ALIAS_MAP: Record<string, string> = {
  allergy: "allergy-treatments",
  digestive: "digestive-health",
  "womens-health": "feminine-hygiene",
  "vitamins-supplements": "nutritional-products",
  "diabetes-care": "medical-consumables",
  vitamins: "nutritional-products",
};

/**
 * Public-facing categories for /medicines browse cards.
 * Active + publicVisible only, ordered by sortOrder.
 */
export async function listPublicCategories(): Promise<PublicCategory[]> {
  const cats = await prisma.medicationCategory.findMany({
    where: { active: true, publicVisible: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Count public inventory per category slug (master.category).
  const publicMasters = await prisma.medicationMaster.findMany({
    where: {
      pharmacyInventory: { some: { publicListing: true, active: true } },
    },
    select: { category: true },
  });
  const countBySlug = new Map<string, number>();
  for (const m of publicMasters) {
    const slug = (m.category || "general").trim().toLowerCase() || "general";
    countBySlug.set(slug, (countBySlug.get(slug) || 0) + 1);
  }

  // Filter out redundant empty aliases if canonical category has products
  const canonicalSlugsWithItems = new Set(
    Object.values(CATEGORY_ALIAS_MAP).filter((s) => (countBySlug.get(s) || 0) > 0)
  );

  const filtered = cats.filter((c) => {
    if (
      CATEGORY_ALIAS_MAP[c.slug] &&
      canonicalSlugsWithItems.has(CATEGORY_ALIAS_MAP[c.slug]) &&
      (countBySlug.get(c.slug) || 0) === 0
    ) {
      return false; // Skip redundant alias
    }
    return true;
  });

  return filtered.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    brands: c.brands || [],
    tips: c.tips || [],
    sortOrder: c.sortOrder,
    publicMedCount: countBySlug.get(c.slug) || 0,
  }));
}

export async function getPublicCategoryBySlug(
  slug: string,
): Promise<PublicCategory | null> {
  const normalized = (slug || "").trim().toLowerCase();
  const canonicalSlug = CATEGORY_ALIAS_MAP[normalized] || normalized;

  let c = await prisma.medicationCategory.findFirst({
    where: { slug: canonicalSlug, active: true, publicVisible: true },
  });

  if (!c && canonicalSlug !== normalized) {
    c = await prisma.medicationCategory.findFirst({
      where: { slug: normalized, active: true, publicVisible: true },
    });
  }

  if (!c) return null;

  const publicMedCount = await prisma.medicationMaster.count({
    where: {
      category: c.slug,
      pharmacyInventory: { some: { publicListing: true, active: true } },
    },
  });

  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    brands: c.brands || [],
    tips: c.tips || [],
    sortOrder: c.sortOrder,
    publicMedCount,
  };
}
