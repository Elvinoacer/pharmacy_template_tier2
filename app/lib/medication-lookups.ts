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

const FALLBACK_DOSAGE_FORMS: LookupOption[] = [
  { id: "df-tablet", value: "Tablet", slug: "tablet" },
  { id: "df-capsule", value: "Capsule", slug: "capsule" },
  { id: "df-syrup", value: "Syrup", slug: "syrup" },
  { id: "df-injection", value: "Injection", slug: "injection" },
  { id: "df-cream", value: "Cream", slug: "cream" },
  { id: "df-ointment", value: "Ointment", slug: "ointment" },
  { id: "df-eye-drops", value: "Eye Drops", slug: "eye-drops" },
  { id: "df-ear-drops", value: "Ear Drops", slug: "ear-drops" },
  { id: "df-nasal-spray", value: "Nasal Spray", slug: "nasal-spray" },
  { id: "df-suspension", value: "Suspension", slug: "suspension" },
  { id: "df-inhaler", value: "Inhaler", slug: "inhaler" },
  { id: "df-sachet", value: "Sachet", slug: "sachet" },
];

const FALLBACK_ROUTES: LookupOption[] = [
  { id: "rt-oral", value: "Oral", slug: "oral" },
  { id: "rt-topical", value: "Topical", slug: "topical" },
  { id: "rt-intravenous", value: "Intravenous", slug: "intravenous" },
  { id: "rt-intramuscular", value: "Intramuscular", slug: "intramuscular" },
  { id: "rt-inhalation", value: "Inhalation", slug: "inhalation" },
  { id: "rt-rectal", value: "Rectal", slug: "rectal" },
  { id: "rt-ophthalmic", value: "Ophthalmic", slug: "ophthalmic" },
  { id: "rt-nasal", value: "Nasal", slug: "nasal" },
];

const FALLBACK_PREGNANCY: LookupOption[] = [
  { id: "pc-a", value: "A", slug: "a" },
  { id: "pc-b", value: "B", slug: "b" },
  { id: "pc-c", value: "C", slug: "c" },
  { id: "pc-d", value: "D", slug: "d" },
  { id: "pc-x", value: "X", slug: "x" },
];

export async function listLookups(kind: LookupKind): Promise<LookupOption[]> {
  try {
    const rows = await prisma.medicationLookup.findMany({
      where: { kind, active: true },
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
      select: { id: true, value: true, slug: true },
    });
    if (rows.length === 0) {
      return kind === "dosage_form"
        ? FALLBACK_DOSAGE_FORMS
        : kind === "route"
          ? FALLBACK_ROUTES
          : FALLBACK_PREGNANCY;
    }
    return rows;
  } catch {
    return kind === "dosage_form"
      ? FALLBACK_DOSAGE_FORMS
      : kind === "route"
        ? FALLBACK_ROUTES
        : FALLBACK_PREGNANCY;
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
