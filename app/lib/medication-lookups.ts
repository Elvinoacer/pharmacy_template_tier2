import "server-only";

import { prisma } from "@/app/lib/db";

/**
 * Server-side helpers for the editable medication lookup tables
 * (dosage forms, routes, pregnancy categories, manufacturers, active
 * ingredients, clinical tags).
 *
 * Per Decision D10, dosage forms / routes / pregnancy categories live
 * in a single `MedicationLookup` table with a `kind` discriminator.
 */

export type LookupOption = {
  id: string;
  value: string;
  slug: string;
};

export type LookupKind = "dosage_form" | "route" | "pregnancy_category";

const DEFAULT_DOSAGE_FORMS = [
  { value: "Tablet", slug: "tablet", sortOrder: 10 },
  { value: "Capsule", slug: "capsule", sortOrder: 20 },
  { value: "Syrup", slug: "syrup", sortOrder: 30 },
  { value: "Injection", slug: "injection", sortOrder: 40 },
  { value: "Cream", slug: "cream", sortOrder: 50 },
  { value: "Ointment", slug: "ointment", sortOrder: 60 },
  { value: "Eye Drops", slug: "eye-drops", sortOrder: 70 },
  { value: "Ear Drops", slug: "ear-drops", sortOrder: 80 },
  { value: "Nasal Spray", slug: "nasal-spray", sortOrder: 90 },
  { value: "Suspension", slug: "suspension", sortOrder: 100 },
  { value: "Inhaler", slug: "inhaler", sortOrder: 110 },
  { value: "Sachet", slug: "sachet", sortOrder: 120 },
  { value: "Drops", slug: "drops", sortOrder: 130 },
  { value: "Gel", slug: "gel", sortOrder: 140 },
  { value: "Solution", slug: "solution", sortOrder: 150 },
  { value: "Suppository", slug: "suppository", sortOrder: 160 },
];

const DEFAULT_ROUTES = [
  { value: "Oral", slug: "oral", sortOrder: 10 },
  { value: "Topical", slug: "topical", sortOrder: 20 },
  { value: "Intravenous", slug: "intravenous", sortOrder: 30 },
  { value: "Intramuscular", slug: "intramuscular", sortOrder: 40 },
  { value: "Inhalation", slug: "inhalation", sortOrder: 50 },
  { value: "Rectal", slug: "rectal", sortOrder: 60 },
  { value: "Ophthalmic", slug: "ophthalmic", sortOrder: 70 },
  { value: "Nasal", slug: "nasal", sortOrder: 80 },
  { value: "Sublingual", slug: "sublingual", sortOrder: 90 },
  { value: "Transdermal", slug: "transdermal", sortOrder: 100 },
];

const DEFAULT_PREGNANCY = [
  { value: "A", slug: "a", sortOrder: 10 },
  { value: "B", slug: "b", sortOrder: 20 },
  { value: "C", slug: "c", sortOrder: 30 },
  { value: "D", slug: "d", sortOrder: 40 },
  { value: "X", slug: "x", sortOrder: 50 },
];

export async function ensureLookupsSeeded(kind?: LookupKind): Promise<void> {
  try {
    const kindsToSeed: LookupKind[] = kind ? [kind] : ["dosage_form", "route", "pregnancy_category"];
    for (const k of kindsToSeed) {
      const count = await prisma.medicationLookup.count({ where: { kind: k } });
      if (count === 0) {
        const defaults =
          k === "dosage_form"
            ? DEFAULT_DOSAGE_FORMS
            : k === "route"
              ? DEFAULT_ROUTES
              : DEFAULT_PREGNANCY;
        await prisma.medicationLookup.createMany({
          data: defaults.map((d) => ({
            kind: k,
            value: d.value,
            slug: d.slug,
            sortOrder: d.sortOrder,
            active: true,
          })),
          skipDuplicates: true,
        });
      }
    }
  } catch (err) {
    console.error("[ensureLookupsSeeded] failed:", err);
  }
}

export async function findOrCreateLookup(kind: LookupKind, rawValue: string): Promise<string | null> {
  const clean = rawValue.trim();
  if (!clean) return null;

  try {
    // 1. Exact case-insensitive match
    let hit = await prisma.medicationLookup.findFirst({
      where: { kind, value: { equals: clean, mode: "insensitive" } },
      select: { id: true },
    });
    if (hit) return hit.id;

    // 2. Contains match (e.g. "Oral tablet" -> "Tablet")
    hit = await prisma.medicationLookup.findFirst({
      where: { kind, value: { contains: clean, mode: "insensitive" } },
      select: { id: true },
    });
    if (hit) return hit.id;

    // Or the lookup value is contained in the input
    const all = await prisma.medicationLookup.findMany({
      where: { kind, active: true },
      select: { id: true, value: true },
    });
    const found = all.find((opt) => clean.toLowerCase().includes(opt.value.toLowerCase()));
    if (found) return found.id;

    // 3. Create novel lookup entry with a clean slug
    const slug = clean
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || `lookup-${Date.now().toString(36)}`;

    const created = await prisma.medicationLookup.create({
      data: {
        kind,
        value: clean.charAt(0).toUpperCase() + clean.slice(1),
        slug,
        sortOrder: 200,
        active: true,
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    console.error(`[findOrCreateLookup] failed for ${kind} ${rawValue}:`, err);
    return null;
  }
}

export async function listLookups(kind: LookupKind): Promise<LookupOption[]> {
  try {
    let rows = await prisma.medicationLookup.findMany({
      where: { kind, active: true },
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
      select: { id: true, value: true, slug: true },
    });
    if (rows.length === 0) {
      await ensureLookupsSeeded(kind);
      rows = await prisma.medicationLookup.findMany({
        where: { kind, active: true },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
        select: { id: true, value: true, slug: true },
      });
    }
    return rows;
  } catch {
    return [];
  }
}

export async function listDosageForms() {
  return listLookups("dosage_form");
}
export async function listRoutes() {
  return listLookups("route");
}
export async function listPregnancyCategories() {
  return listLookups("pregnancy_category");
}

export type ManufacturerOption = { id: string; name: string };
export async function listManufacturers(): Promise<ManufacturerOption[]> {
  try {
    const rows = await prisma.manufacturer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return rows.length > 0 ? rows : [{ id: "mfr-unknown", name: "Unknown Manufacturer" }];
  } catch {
    return [{ id: "mfr-unknown", name: "Unknown Manufacturer" }];
  }
}

export type ActiveIngredientOption = { id: string; name: string };
export async function listActiveIngredients(): Promise<ActiveIngredientOption[]> {
  try {
    const rows = await prisma.activeIngredient.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return rows;
  } catch {
    return [];
  }
}

export type ClinicalTagOption = { id: string; name: string; slug: string };
export async function listClinicalTags(): Promise<ClinicalTagOption[]> {
  try {
    const rows = await prisma.clinicalTag.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return rows;
  } catch {
    return [];
  }
}

/** Resolve a lookup id to its display value (best-effort, returns null if missing). */
export async function resolveLookupValue(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  try {
    const row = await prisma.medicationLookup.findUnique({
      where: { id },
      select: { value: true },
    });
    return row?.value ?? null;
  } catch {
    return null;
  }
}
