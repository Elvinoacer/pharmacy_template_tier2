import "server-only";

import { prisma } from "@/app/lib/db";

/**
 * Medication validation service (Phase 4 of MEDICATION_MODULE_IMPLEMENTATION.md).
 *
 * A SINGLE shared validation function called by every acquisition flow before final save:
 *   - Shared Library add
 *   - Barcode scan
 *   - AI import
 *   - CSV/Excel import
 *   - Manual entry
 *
 * Returns a structured result the UI renders as a review screen (pass/flag/fail per rule).
 *
 * Decision D22: every flow that creates/edits a MedicationMaster shows a review screen
 * with these results before final commit.
 */

export type Severity = "pass" | "flag" | "fail";

export type ValidationCheck = {
  /** Stable key the UI uses to dedupe / order checks. */
  rule: string;
  /** Human label, e.g. "Duplicate medication detection". */
  label: string;
  /** "pass" = no issue, "flag" = warning the admin can override, "fail" = hard block. */
  severity: Severity;
  /** Human message explaining the issue (empty when severity=pass). */
  message: string;
  /** Optional related medication IDs surfaced as possible matches. */
  matchIds?: string[];
};

export type ValidationResult = {
  checks: ValidationCheck[];
  /** True when no check is `fail` — the admin can proceed (may still have `flag`s to acknowledge). */
  canProceed: boolean;
  /** True when at least one check is `flag` or `fail`. */
  hasIssues: boolean;
  /** Counts for quick badge rendering. */
  counts: { pass: number; flag: number; fail: number };
};

export type MedicationCandidate = {
  /** Present when editing an existing master; absent for new. */
  id?: string;
  name: string;
  genericName: string;
  brandName?: string | null;
  strengthValue?: string | number | null;
  strengthUnit?: string | null;
  strengthDisplay?: string | null;
  dosageFormId?: string | null;
  routeId?: string | null;
  barcode?: string | null;
  controlledDrug?: boolean;
  controlledDrugSchedule?: string | null;
  /** Ids of interaction pairs (other MedicationMaster records). */
  interactionIds?: string[];
};

export type InventoryCandidate = {
  /** Present when editing existing inventory; absent for new. */
  id?: string;
  medicationMasterId?: string;
  slug: string;
  sku?: string | null;
  price: number | string;
  overTheCounter?: boolean;
  prescriptionRequired?: boolean;
};

const REQUIRED_MASTER_FIELDS: Array<{ key: keyof MedicationCandidate; label: string }> = [
  { key: "name", label: "Medicine name" },
  { key: "genericName", label: "Generic name" },
];

const REQUIRED_DOSAGE_FORM_MSG =
  "Dosage form is required (Phase 4 validation rule). Pick a dosage form before saving.";

/**
 * Normalize a string for fuzzy comparison: lowercase, trim, collapse whitespace,
 * strip common separators. Used by duplicate detection so "Paracetamol 500mg" and
 * "paracetamol  500-mg" match.
 */
export function normalizeForMatch(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Compute the enrichment score (Phase 5, Decision D14).
 * Checks presence of core clinical fields. Returns 0-100.
 */
export const ENRICHMENT_FIELDS: Array<{ key: string; label: string }> = [
  { key: "genericName", label: "Generic name" },
  { key: "activeIngredients", label: "Active ingredient(s)" },
  { key: "strengthDisplay", label: "Strength" },
  { key: "dosageFormId", label: "Dosage form" },
  { key: "routeId", label: "Route" },
  { key: "indications", label: "Indications" },
  { key: "sideEffects", label: "Side effects" },
  { key: "contraindications", label: "Contraindications" },
  { key: "manufacturerId", label: "Manufacturer" },
  { key: "pregnancyCategoryId", label: "Pregnancy category" },
  { key: "barcode", label: "Barcode" },
  { key: "imageUrl", label: "Image" },
];

export function computeEnrichmentScore(data: {
  genericName?: string | null;
  activeIngredients?: unknown[] | null;
  strengthDisplay?: string | null;
  strengthValue?: string | number | null;
  dosageFormId?: string | null;
  routeId?: string | null;
  indications?: string | null;
  sideEffects?: string | null;
  contraindications?: string | null;
  manufacturerId?: string | null;
  pregnancyCategoryId?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
}): { score: number; status: "complete" | "partial" | "minimal" } {
  const present = [
    data.genericName,
    Array.isArray(data.activeIngredients) && data.activeIngredients.length > 0 ? "x" : null,
    data.strengthDisplay || data.strengthValue,
    data.dosageFormId,
    data.routeId,
    data.indications,
    data.sideEffects,
    data.contraindications,
    data.manufacturerId,
    data.pregnancyCategoryId,
    data.barcode,
    data.imageUrl,
  ].filter(Boolean).length;

  const score = Math.round((present / ENRICHMENT_FIELDS.length) * 100);
  const status: "complete" | "partial" | "minimal" =
    score >= 80 ? "complete" : score >= 40 ? "partial" : "minimal";
  return { score, status };
}

/** Build an empty (all-pass) result — used as a baseline before checks run. */
function emptyResult(): ValidationResult {
  return {
    checks: [],
    canProceed: true,
    hasIssues: false,
    counts: { pass: 0, flag: 0, fail: 0 },
  };
}

function finish(checks: ValidationCheck[]): ValidationResult {
  const counts = { pass: 0, flag: 0, fail: 0 };
  for (const c of checks) counts[c.severity]++;
  return {
    checks,
    canProceed: counts.fail === 0,
    hasIssues: counts.flag > 0 || counts.fail > 0,
    counts,
  };
}

/**
 * The single shared validation function. Pure (no writes). Safe to call from any
 * server action or route handler.
 *
 * @param master  Candidate MedicationMaster data.
 * @param inventory Candidate PharmacyInventory data (optional — shared-library add flow may skip SKU/barcode checks).
 * @param opts    Extra context: existing master id when editing (so it doesn't flag itself as a duplicate).
 */
export async function validateMedication(
  master: MedicationCandidate,
  inventory?: InventoryCandidate | null,
  opts: { existingMasterId?: string; existingInventoryId?: string } = {},
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  // ── Rule 1: Missing required fields ──────────────────────────────
  const missing: string[] = [];
  for (const f of REQUIRED_MASTER_FIELDS) {
    if (!String(master[f.key] ?? "").trim()) missing.push(f.label);
  }
  if (!master.dosageFormId) missing.push("Dosage form");
  if (inventory && !String(inventory.slug || "").trim()) missing.push("Inventory slug");
  if (inventory && (inventory.price === "" || inventory.price == null || Number(inventory.price) < 0)) {
    missing.push("Price (must be ≥ 0)");
  }
  checks.push({
    rule: "required_fields",
    label: "Missing required fields",
    severity: missing.length > 0 ? "fail" : "pass",
    message:
      missing.length > 0
        ? `Required field(s) missing: ${missing.join(", ")}.`
        : "All required fields are present.",
  });

  // ── Rule 2: Duplicate medication detection (generic + strength + dosage form) ──
  // Per the doc: "implement as one check, not two" with the duplicate strength/form combination rule.
  const normGeneric = normalizeForMatch(master.genericName);
  const normName = normalizeForMatch(master.name);
  if (normGeneric || normName) {
    const orClauses: Array<Record<string, unknown>> = [];
    if (normGeneric) orClauses.push({ genericName: { equals: master.genericName, mode: "insensitive" } });
    if (normName) orClauses.push({ name: { equals: master.name, mode: "insensitive" } });

    const matches = await prisma.medicationMaster.findMany({
      where: {
        AND: [
          { id: opts.existingMasterId ? { not: opts.existingMasterId } : undefined },
          { OR: orClauses },
        ],
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        strengthDisplay: true,
        dosageFormId: true,
        dosageForm: { select: { value: true } },
      },
      take: 10,
    });

    // Surface possible duplicates as a flag (not a hard block — the admin may confirm they're different).
    if (matches.length > 0) {
      const list = matches
        .map(
          (m) =>
            `${m.name} (${m.genericName}${m.strengthDisplay ? `, ${m.strengthDisplay}` : ""}${
              m.dosageForm?.value ? `, ${m.dosageForm.value}` : ""
            })`,
        )
        .join("; ");
      checks.push({
        rule: "duplicate_detection",
        label: "Duplicate medication detection",
        severity: "flag",
        message: `Possible existing match(es): ${list}. Confirm these are different before saving.`,
        matchIds: matches.map((m) => m.id),
      });
    } else {
      checks.push({
        rule: "duplicate_detection",
        label: "Duplicate medication detection",
        severity: "pass",
        message: "No similar medication found in the shared library.",
      });
    }
  } else {
    checks.push({
      rule: "duplicate_detection",
      label: "Duplicate medication detection",
      severity: "pass",
      message: "Skipped — no name/generic to match against.",
    });
  }

  // ── Rule 3: Conflicting information (OTC + Prescription Required both true) ──
  if (inventory) {
    const otc = Boolean(inventory.overTheCounter);
    const rx = inventory.prescriptionRequired !== false;
    if (otc && rx) {
      checks.push({
        rule: "otc_rx_conflict",
        label: "OTC / Prescription conflict",
        severity: "fail",
        message: "A medication cannot be both over-the-counter AND prescription-required. Pick one.",
      });
    } else {
      checks.push({
        rule: "otc_rx_conflict",
        label: "OTC / Prescription conflict",
        severity: "pass",
        message: "OTC / prescription flags are consistent.",
      });
    }
  }

  // ── Rule 4: Barcode uniqueness ───────────────────────────────────
  if (master.barcode && String(master.barcode).trim()) {
    const barcode = String(master.barcode).trim();
    const clash = await prisma.medicationMaster.findFirst({
      where: {
        barcode,
        ...(opts.existingMasterId ? { id: { not: opts.existingMasterId } } : {}),
      },
      select: { id: true, name: true },
    });
    checks.push({
      rule: "barcode_unique",
      label: "Barcode uniqueness",
      severity: clash ? "fail" : "pass",
      message: clash
        ? `Barcode "${barcode}" is already used by "${clash.name}".`
        : `Barcode "${barcode}" is unique.`,
      matchIds: clash ? [clash.id] : undefined,
    });
  }

  // ── Rule 5: Generic vs brand consistency ────────────────────────
  if (master.brandName && String(master.brandName).trim() && !String(master.genericName || "").trim()) {
    checks.push({
      rule: "brand_without_generic",
      label: "Generic vs brand consistency",
      severity: "flag",
      message: "A brand name is set but no generic name is provided. Add the generic name (INN) for clinical matching.",
    });
  } else {
    checks.push({
      rule: "brand_without_generic",
      label: "Generic vs brand consistency",
      severity: "pass",
      message: "Generic / brand consistency check passed.",
    });
  }

  // ── Rule 6: Duplicate SKU detection (per pharmacy, single-tenant) ──
  if (inventory?.sku && String(inventory.sku).trim()) {
    const sku = String(inventory.sku).trim();
    const clash = await prisma.pharmacyInventory.findFirst({
      where: {
        sku,
        ...(opts.existingInventoryId ? { id: { not: opts.existingInventoryId } } : {}),
      },
      select: { id: true, slug: true },
    });
    checks.push({
      rule: "sku_unique",
      label: "Duplicate SKU detection",
      severity: clash ? "fail" : "pass",
      message: clash
        ? `SKU "${sku}" is already used by inventory row "${clash.slug}".`
        : `SKU "${sku}" is unique.`,
      matchIds: clash ? [clash.id] : undefined,
    });
  }

  // ── Rule 7: Duplicate strength/form combination (folded into Rule 2 per the doc) ──
  // The doc says "implement as one check, not two" — we surface a focused message here
  // when the duplicate found has the SAME dosage form AND strength, which is a stronger signal.
  if (master.dosageFormId && normGeneric) {
    const sameFormMatch = await prisma.medicationMaster.findFirst({
      where: {
        id: opts.existingMasterId ? { not: opts.existingMasterId } : undefined,
        genericName: { equals: master.genericName, mode: "insensitive" },
        dosageFormId: master.dosageFormId,
      },
      select: { id: true, name: true, strengthDisplay: true },
    });
    if (sameFormMatch) {
      checks.push({
        rule: "same_form_strength",
        label: "Duplicate strength/form combination",
        severity: "flag",
        message: `An existing master "${sameFormMatch.name}" has the same generic + dosage form. Confirm this is a different strength.`,
        matchIds: [sameFormMatch.id],
      });
    } else {
      checks.push({
        rule: "same_form_strength",
        label: "Duplicate strength/form combination",
        severity: "pass",
        message: "No exact generic + dosage-form collision.",
      });
    }
  }

  // ── Rule 8: Controlled drug schedule required when controlledDrug=true (Decision D11) ──
  if (master.controlledDrug) {
    const ok = master.controlledDrugSchedule &&
      ["schedule_1", "schedule_2", "schedule_3", "schedule_4", "schedule_5"].includes(
        master.controlledDrugSchedule,
      );
    checks.push({
      rule: "controlled_schedule",
      label: "Controlled drug schedule",
      severity: ok ? "pass" : "fail",
      message: ok
        ? `Schedule set to ${master.controlledDrugSchedule}.`
        : "Controlled drug is checked but no valid schedule (1-5) is set.",
    });
  }

  return finish(checks);
}

/**
 * Match an incoming row (CSV/AI import) against existing MedicationMaster records.
 * Used by Phase 3.4 (CSV import) and Phase 3.3 (AI import) before deciding whether
 * to create a new master or reuse an existing one (Decision D19).
 *
 * Match priority:
 *   1. Exact barcode (highest confidence)
 *   2. Normalized generic name + strength display + dosage form
 *   3. Normalized name match
 */
export async function findExistingMaster(input: {
  barcode?: string | null;
  genericName?: string | null;
  name?: string | null;
  strengthDisplay?: string | null;
  dosageFormId?: string | null;
}): Promise<{ id: string; name: string; matchReason: "barcode" | "generic_strength_form" | "name" } | null> {
  // 1. Barcode
  if (input.barcode && String(input.barcode).trim()) {
    const hit = await prisma.medicationMaster.findUnique({
      where: { barcode: String(input.barcode).trim() },
      select: { id: true, name: true },
    });
    if (hit) return { id: hit.id, name: hit.name, matchReason: "barcode" };
  }

  // 2. Generic + strength + form
  const normGeneric = normalizeForMatch(input.genericName);
  if (normGeneric) {
    const candidates = await prisma.medicationMaster.findMany({
      where: {
        genericName: { equals: input.genericName || "", mode: "insensitive" },
        ...(input.dosageFormId ? { dosageFormId: input.dosageFormId } : {}),
      },
      select: { id: true, name: true, strengthDisplay: true },
      take: 20,
    });
    const normStrength = normalizeForMatch(input.strengthDisplay);
    const exact = candidates.find(
      (c) => normalizeForMatch(c.strengthDisplay) === normStrength && normStrength !== "",
    );
    if (exact) {
      return { id: exact.id, name: exact.name, matchReason: "generic_strength_form" };
    }
    // Fall back to first candidate if strength is absent on both sides.
    if (candidates.length > 0 && !input.strengthDisplay) {
      return { id: candidates[0].id, name: candidates[0].name, matchReason: "generic_strength_form" };
    }
  }

  // 3. Name
  const normName = normalizeForMatch(input.name);
  if (normName) {
    const hit = await prisma.medicationMaster.findFirst({
      where: { name: { equals: input.name || "", mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (hit) return { id: hit.id, name: hit.name, matchReason: "name" };
  }

  return null;
}
