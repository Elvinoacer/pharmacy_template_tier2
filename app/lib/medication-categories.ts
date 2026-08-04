import "server-only";

import { prisma } from "@/app/lib/db";

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  count: number;
  /** True when the slug exists only on medications (not yet in registry). */
  orphan?: boolean;
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

/**
 * Ensure every distinct Medication.category has a registry row, then return
 * all categories with live medication counts (including empty ones).
 */
export async function listCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  // Pull registry + live usage in parallel.
  const [registry, grouped] = await Promise.all([
    prisma.medicationCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
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

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    sortOrder: r.sortOrder,
    active: r.active,
    count: countBySlug.get(r.slug) || 0,
  }));
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
    // Fallback if table not migrated yet.
    return [
      { slug: "general", name: "General" },
      { slug: "pain-relief", name: "Pain Relief" },
      { slug: "antibiotics", name: "Antibiotics" },
      { slug: "cardiovascular", name: "Cardiovascular" },
      { slug: "diabetes", name: "Diabetes" },
      { slug: "respiratory", name: "Respiratory" },
      { slug: "vitamins", name: "Vitamins" },
      { slug: "first-aid", name: "First Aid" },
      { slug: "cold-flu", name: "Cold Flu" },
      { slug: "skin-care", name: "Skin Care" },
      { slug: "baby-care", name: "Baby Care" },
      { slug: "womens-health", name: "Womens Health" },
      { slug: "mens-health", name: "Mens Health" },
      { slug: "mental-health", name: "Mental Health" },
      { slug: "digestive", name: "Digestive" },
      { slug: "allergy", name: "Allergy" },
    ];
  }
}
