import "server-only";

import { prismaUnscoped } from "@/app/lib/db";
import { writeAuditLog } from "@/app/lib/auth";
import { computeEnrichmentScore, normalizeForMatch } from "./medication-validation";
import { medicationSlug } from "./shared-medication-library";
import { findOrCreateLookup } from "../medication-lookups";
import { MAX_PLATFORM_CSV_IMPORT_ROWS } from "@/app/lib/medication-import-limits";

export const MAX_IMPORT_ROWS = MAX_PLATFORM_CSV_IMPORT_ROWS;

export type RawCsvRow = Record<string, string>;

export type ParsedActiveIngredient = {
  name: string;
  amount: string | null;
  unit: string | null;
};

export type ValidatedMedicationRow = {
  rowNumber: number;
  raw: RawCsvRow;
  name: string;
  genericName: string;
  brandName: string | null;
  strengthValue: number | null;
  strengthUnit: string | null;
  strengthDisplay: string | null;
  dosageForm: string;
  route: string | null;
  packSize: string | null;
  barcode: string | null;
  category: string;
  manufacturer: string | null;
  manufacturerCountry: string | null;
  countryOfOrigin: string | null;
  activeIngredients: ParsedActiveIngredient[];
  description: string | null;
  indications: string | null;
  dosage: string | null;
  sideEffects: string | null;
  contraindications: string | null;
  storage: string | null;
  clinicalNotes: string | null;
  pregnancyCategory: string | null;
  controlledDrug: boolean;
  controlledDrugSchedule: string | null;
  pediatricUse: boolean;
  requiresRefrigeration: boolean;
  clinicalTags: string[];
  imageUrl: string | null;
  imageUrls: string | null;
};

export type RowValidationError = {
  rowNumber: number;
  column: string;
  code: string;
  message: string;
  value: string;
};

export type RowAction = "create" | "match_enrich" | "needs_review";

export type AnalyzedRow = {
  rowNumber: number;
  action: RowAction;
  matchReason?: "barcode" | "generic_strength_form" | "name_identity" | "ambiguous";
  existingMasterId?: string;
  existingMasterName?: string;
  data: ValidatedMedicationRow;
  warnings: string[];
};

export type ImportPreviewResult = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  exactMatches: number;
  likelyDuplicates: number;
  newMasters: number;
  needsReview: number;
  errors: RowValidationError[];
  analyzedRows: AnalyzedRow[];
};

export type ImportExecutionResult = {
  batchId: string;
  totalRows: number;
  createdCount: number;
  matchedCount: number;
  reviewCount: number;
  errorCount: number;
  errors: Array<{ rowNumber: number; message: string }>;
};

/**
 * Robust RFC 4180 compliant CSV parser.
 * Handles quoted fields, embedded commas, double-quote escaping (""), newlines within quotes,
 * and UTF-8 BOM characters.
 */
export function parseRfc4180Csv(csvContent: string): { headers: string[]; rows: RawCsvRow[] } {
  // Strip BOM if present
  let input = csvContent.replace(/^\uFEFF/, "");

  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < input.length && input[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ",") {
        currentRecord.push(currentField);
        currentField = "";
        i++;
        continue;
      } else if (char === "\r") {
        if (i + 1 < input.length && input[i + 1] === "\n") {
          i++;
        }
        currentRecord.push(currentField);
        currentField = "";
        if (currentRecord.length > 0 && !(currentRecord.length === 1 && currentRecord[0] === "")) {
          records.push(currentRecord);
        }
        currentRecord = [];
        i++;
        continue;
      } else if (char === "\n") {
        currentRecord.push(currentField);
        currentField = "";
        if (currentRecord.length > 0 && !(currentRecord.length === 1 && currentRecord[0] === "")) {
          records.push(currentRecord);
        }
        currentRecord = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.length > 0 && !(currentRecord.length === 1 && currentRecord[0] === "")) {
      records.push(currentRecord);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = records[0].map((h) => normalizeHeader(h));
  const rows: RawCsvRow[] = [];

  for (let r = 1; r < records.length; r++) {
    const rowRecord = records[r];
    const rowObj: RawCsvRow = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      const header = rawHeaders[c];
      rowObj[header] = rowRecord[c] !== undefined ? rowRecord[c] : "";
    }
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function parseBooleanStrict(val: string | undefined): { value: boolean; error?: string } {
  if (!val || val.trim() === "") return { value: false };
  const s = val.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return { value: true };
  if (["false", "0", "no", "n"].includes(s)) return { value: false };
  return { value: false, error: `Invalid boolean value "${val}". Allowed: true/false, yes/no, 1/0.` };
}

export function parseActiveIngredients(input: string | undefined): ParsedActiveIngredient[] {
  if (!input?.trim()) return [];
  const items = input.split(";").map((s) => s.trim()).filter(Boolean);
  const result: ParsedActiveIngredient[] = [];

  for (const item of items) {
    const parts = item.split("|").map((p) => p.trim());
    if (parts.length >= 3) {
      result.push({
        name: parts[0],
        amount: parts[1] || null,
        unit: parts[2] || null,
      });
    } else if (parts.length === 2) {
      result.push({
        name: parts[0],
        amount: parts[1] || null,
        unit: null,
      });
    } else if (parts.length === 1 && parts[0]) {
      result.push({
        name: parts[0],
        amount: null,
        unit: null,
      });
    }
  }

  return result;
}

/**
 * Validates a single raw CSV row against the platform contract.
 */
export function validateCsvRow(raw: RawCsvRow, rowNumber: number): {
  valid: boolean;
  data?: ValidatedMedicationRow;
  errors: RowValidationError[];
  warnings: string[];
} {
  const errors: RowValidationError[] = [];
  const warningList: string[] = [];

  // Required Fields
  const name = raw.name?.trim() || "";
  if (!name) {
    errors.push({
      rowNumber,
      column: "name",
      code: "REQUIRED_FIELD_MISSING",
      message: "Medication name is required.",
      value: raw.name || "",
    });
  }

  const genericName = raw.generic_name?.trim() || "";
  if (!genericName) {
    errors.push({
      rowNumber,
      column: "generic_name",
      code: "REQUIRED_FIELD_MISSING",
      message: "Generic name is required.",
      value: raw.generic_name || "",
    });
  }

  const dosageForm = raw.dosage_form?.trim() || "";
  if (!dosageForm) {
    errors.push({
      rowNumber,
      column: "dosage_form",
      code: "REQUIRED_FIELD_MISSING",
      message: "Dosage form is required (e.g. Tablet, Syrup, Injection).",
      value: raw.dosage_form || "",
    });
  }

  // Booleans
  const controlledParsed = parseBooleanStrict(raw.controlled_drug);
  if (controlledParsed.error) {
    errors.push({
      rowNumber,
      column: "controlled_drug",
      code: "INVALID_BOOLEAN",
      message: controlledParsed.error,
      value: raw.controlled_drug || "",
    });
  }

  const controlledDrug = controlledParsed.value;
  const controlledDrugSchedule = raw.controlled_drug_schedule?.trim() || null;

  if (controlledDrug && !controlledDrugSchedule) {
    errors.push({
      rowNumber,
      column: "controlled_drug_schedule",
      code: "SCHEDULE_REQUIRED_FOR_CONTROLLED",
      message: "controlled_drug_schedule is required when controlled_drug is true (Schedules 1-5).",
      value: raw.controlled_drug_schedule || "",
    });
  }

  const pediatricParsed = parseBooleanStrict(raw.pediatric_use);
  if (pediatricParsed.error) {
    errors.push({
      rowNumber,
      column: "pediatric_use",
      code: "INVALID_BOOLEAN",
      message: pediatricParsed.error,
      value: raw.pediatric_use || "",
    });
  }

  const refrigParsed = parseBooleanStrict(raw.requires_refrigeration);
  if (refrigParsed.error) {
    errors.push({
      rowNumber,
      column: "requires_refrigeration",
      code: "INVALID_BOOLEAN",
      message: refrigParsed.error,
      value: raw.requires_refrigeration || "",
    });
  }

  // URLs
  let imageUrl = raw.image_url?.trim() || null;
  if (imageUrl) {
    try {
      const u = new URL(imageUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    } catch {
      errors.push({
        rowNumber,
        column: "image_url",
        code: "INVALID_URL",
        message: `Invalid image_url "${imageUrl}". Must be http or https.`,
        value: imageUrl,
      });
    }
  }

  if (raw.image_urls?.trim()) {
    const urls = raw.image_urls.split(";").map((u) => u.trim()).filter(Boolean);
    for (const urlStr of urls) {
      try {
        const u = new URL(urlStr);
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      } catch {
        errors.push({
          rowNumber,
          column: "image_urls",
          code: "INVALID_URL",
          message: `Invalid image URL "${urlStr}" in image_urls. Must be http or https.`,
          value: urlStr,
        });
      }
    }
  }

  // Numerical strength
  let strengthValue: number | null = null;
  if (raw.strength_value && raw.strength_value.trim() !== "") {
    const num = Number(raw.strength_value.trim());
    if (Number.isFinite(num)) {
      strengthValue = num;
    } else {
      errors.push({
        rowNumber,
        column: "strength_value",
        code: "INVALID_NUMBER",
        message: `Invalid strength_value "${raw.strength_value}". Must be a number.`,
        value: raw.strength_value,
      });
    }
  }

  // Active Ingredients
  const activeIngredients = parseActiveIngredients(raw.active_ingredients);

  // Clinical tags
  const clinicalTags = (raw.clinical_tags || "")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);

  // Missing data warnings
  if (!raw.barcode?.trim()) warningList.push("Missing barcode");
  if (!raw.manufacturer?.trim()) warningList.push("Missing manufacturer");
  if (!raw.route?.trim()) warningList.push("Missing route of administration");
  if (!raw.strength_display?.trim() && strengthValue === null) warningList.push("Missing strength information");
  if (activeIngredients.length === 0) warningList.push("Missing active ingredients");

  if (errors.length > 0) {
    return { valid: false, errors, warnings: warningList };
  }

  const data: ValidatedMedicationRow = {
    rowNumber,
    raw,
    name,
    genericName,
    brandName: raw.brand_name?.trim() || null,
    strengthValue,
    strengthUnit: raw.strength_unit?.trim() || null,
    strengthDisplay: raw.strength_display?.trim() || (strengthValue ? `${strengthValue} ${raw.strength_unit || ""}`.trim() : null),
    dosageForm,
    route: raw.route?.trim() || null,
    packSize: raw.pack_size?.trim() || null,
    barcode: raw.barcode?.trim() || null,
    category: raw.category?.trim() || "general",
    manufacturer: raw.manufacturer?.trim() || null,
    manufacturerCountry: raw.manufacturer_country?.trim() || null,
    countryOfOrigin: raw.country_of_origin?.trim() || null,
    activeIngredients,
    description: raw.description?.trim() || null,
    indications: raw.indications?.trim() || null,
    dosage: raw.dosage?.trim() || null,
    sideEffects: raw.side_effects?.trim() || null,
    contraindications: raw.contraindications?.trim() || null,
    storage: raw.storage?.trim() || null,
    clinicalNotes: raw.clinical_notes?.trim() || null,
    pregnancyCategory: raw.pregnancy_category?.trim() || null,
    controlledDrug: controlledParsed.value,
    controlledDrugSchedule,
    pediatricUse: pediatricParsed.value,
    requiresRefrigeration: refrigParsed.value,
    clinicalTags,
    imageUrl,
    imageUrls: raw.image_urls?.trim() || null,
  };

  return { valid: true, data, errors: [], warnings: warningList };
}

/**
 * Previews and analyzes a parsed CSV content without writing to the database.
 */
export async function previewPlatformMedicationImport(csvContent: string): Promise<ImportPreviewResult> {
  const { rows } = parseRfc4180Csv(csvContent);

  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      exactMatches: 0,
      likelyDuplicates: 0,
      newMasters: 0,
      needsReview: 0,
      errors: [],
      analyzedRows: [],
    };
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: rows.length,
      exactMatches: 0,
      likelyDuplicates: 0,
      newMasters: 0,
      needsReview: 0,
      errors: [
        {
          rowNumber: 0,
          column: "file",
          code: "ROW_LIMIT_EXCEEDED",
          message: `Import exceeds the maximum limit of ${MAX_IMPORT_ROWS} rows. Found ${rows.length} rows.`,
          value: String(rows.length),
        },
      ],
      analyzedRows: [],
    };
  }

  const allErrors: RowValidationError[] = [];
  const validValidated: ValidatedMedicationRow[] = [];
  const warningsByRow = new Map<number, string[]>();

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // 1-based data row (row 1 is headers)
    const result = validateCsvRow(rows[i], rowNumber);
    if (!result.valid || !result.data) {
      allErrors.push(...result.errors);
    } else {
      validValidated.push(result.data);
      warningsByRow.set(rowNumber, result.warnings);
    }
  }

  // Duplicate Analysis against existing database
  const analyzedRows: AnalyzedRow[] = [];
  let exactMatches = 0;
  let likelyDuplicates = 0;
  let newMasters = 0;
  let needsReview = 0;

  // Batch query candidate barcodes
  const barcodes = validValidated.map((r) => r.barcode).filter((b): b is string => Boolean(b));
  const existingByBarcode = new Map<string, { id: string; name: string }>();
  if (barcodes.length > 0) {
    const hits = await prismaUnscoped.medicationMaster.findMany({
      where: { barcode: { in: barcodes } },
      select: { id: true, name: true, barcode: true },
    });
    for (const hit of hits) {
      if (hit.barcode) existingByBarcode.set(hit.barcode, { id: hit.id, name: hit.name });
    }
  }

  // In-file duplicate barcode tracking
  const seenBarcodesInFile = new Map<string, number>();
  const seenGsfInFile = new Map<string, number>();

  for (const row of validValidated) {
    const warnings = [...(warningsByRow.get(row.rowNumber) || [])];
    let action: RowAction = "create";
    let matchReason: AnalyzedRow["matchReason"] = undefined;
    let existingMasterId: string | undefined;
    let existingMasterName: string | undefined;

    const generic = normalizeForMatch(row.genericName);
    const strengthKey = normalizeForMatch(row.strengthDisplay || (row.strengthValue ? `${row.strengthValue} ${row.strengthUnit || ""}` : ""));
    const gsfKey = `${generic}|${strengthKey}|${normalizeForMatch(row.dosageForm)}`;

    // Check Barcode
    if (row.barcode) {
      if (seenBarcodesInFile.has(row.barcode)) {
        action = "needs_review";
        matchReason = "ambiguous";
        warnings.push(`Barcode "${row.barcode}" is duplicated within this import file at row ${seenBarcodesInFile.get(row.barcode)}.`);
        needsReview++;
        analyzedRows.push({
          rowNumber: row.rowNumber,
          action,
          matchReason,
          data: row,
          warnings,
        });
        continue;
      }
      seenBarcodesInFile.set(row.barcode, row.rowNumber);

      const barcodeHit = existingByBarcode.get(row.barcode);
      if (barcodeHit) {
        action = "match_enrich";
        matchReason = "barcode";
        existingMasterId = barcodeHit.id;
        existingMasterName = barcodeHit.name;
        exactMatches++;
        analyzedRows.push({
          rowNumber: row.rowNumber,
          action,
          matchReason,
          existingMasterId,
          existingMasterName,
          data: row,
          warnings,
        });
        continue;
      }
    } else if (gsfKey && seenGsfInFile.has(gsfKey)) {
      action = "needs_review";
      matchReason = "ambiguous";
      warnings.push(`Medication identity "${row.name}" (${row.genericName} ${row.strengthDisplay}) matches row ${seenGsfInFile.get(gsfKey)} within this file.`);
      needsReview++;
      analyzedRows.push({
        rowNumber: row.rowNumber,
        action,
        matchReason,
        data: row,
        warnings,
      });
      continue;
    }
    seenGsfInFile.set(gsfKey, row.rowNumber);

    // Check Generic + Strength + DosageForm
    const genericMatches = await prismaUnscoped.medicationMaster.findMany({
      where: {
        genericName: { equals: row.genericName, mode: "insensitive" },
        dosageForm: { value: { equals: row.dosageForm, mode: "insensitive" } },
      },
      select: {
        id: true,
        name: true,
        strengthDisplay: true,
        strengthValue: true,
        strengthUnit: true,
        brandName: true,
      },
      take: 10,
    });

    const strengthExact = genericMatches.filter((m) => {
      const existingStrength = normalizeForMatch(m.strengthDisplay || (m.strengthValue ? `${m.strengthValue} ${m.strengthUnit || ""}` : ""));
      return existingStrength && strengthKey && existingStrength === strengthKey;
    });

    if (strengthExact.length === 1) {
      action = "match_enrich";
      matchReason = "generic_strength_form";
      existingMasterId = strengthExact[0].id;
      existingMasterName = strengthExact[0].name;
      exactMatches++;
    } else if (strengthExact.length > 1) {
      action = "needs_review";
      matchReason = "ambiguous";
      warnings.push(`Multiple existing records match generic "${row.genericName}" and strength "${row.strengthDisplay}".`);
      needsReview++;
    } else {
      // Check Name identity
      const nameMatches = await prismaUnscoped.medicationMaster.findMany({
        where: { name: { equals: row.name, mode: "insensitive" } },
        select: { id: true, name: true, genericName: true, brandName: true },
        take: 5,
      });

      if (nameMatches.length === 1) {
        const candidate = nameMatches[0];
        if (normalizeForMatch(candidate.genericName) === generic) {
          action = "match_enrich";
          matchReason = "name_identity";
          existingMasterId = candidate.id;
          existingMasterName = candidate.name;
          likelyDuplicates++;
        } else {
          action = "needs_review";
          matchReason = "ambiguous";
          warnings.push(`Product name matches "${candidate.name}" but generic name differs ("${candidate.genericName}" vs "${row.genericName}").`);
          needsReview++;
        }
      } else if (nameMatches.length > 1) {
        action = "needs_review";
        matchReason = "ambiguous";
        warnings.push(`Multiple existing records share the name "${row.name}".`);
        needsReview++;
      } else {
        action = "create";
        newMasters++;
      }
    }

    analyzedRows.push({
      rowNumber: row.rowNumber,
      action,
      matchReason,
      existingMasterId,
      existingMasterName,
      data: row,
      warnings,
    });
  }

  return {
    totalRows: rows.length,
    validRows: validValidated.length,
    invalidRows: allErrors.length > 0 ? new Set(allErrors.map((e) => e.rowNumber)).size : 0,
    exactMatches,
    likelyDuplicates,
    newMasters,
    needsReview,
    errors: allErrors,
    analyzedRows,
  };
}

/**
 * Resolves Lookups, Manufacturers, Ingredients, and Tags in batch to avoid N+1 queries.
 */
class LookupBatchCache {
  private dosageForms = new Map<string, string>();
  private routes = new Map<string, string>();
  private pregnancyCategories = new Map<string, string>();
  private manufacturers = new Map<string, string>();
  private activeIngredients = new Map<string, string>();
  private clinicalTags = new Map<string, string>();

  async preload(rows: ValidatedMedicationRow[]) {
    // 1. Dosage Forms
    const formNames = [...new Set(rows.map((r) => r.dosageForm).filter(Boolean))];
    for (const name of formNames) {
      const id = await findOrCreateLookup("dosage_form", name);
      if (id) this.dosageForms.set(name.toLowerCase(), id);
    }

    // 2. Routes
    const routeNames = [...new Set(rows.map((r) => r.route).filter((r): r is string => Boolean(r)))];
    for (const name of routeNames) {
      const id = await findOrCreateLookup("route", name);
      if (id) this.routes.set(name.toLowerCase(), id);
    }

    // 3. Pregnancy Categories
    const pregNames = [...new Set(rows.map((r) => r.pregnancyCategory).filter((r): r is string => Boolean(r)))];
    for (const name of pregNames) {
      const id = await findOrCreateLookup("pregnancy_category", name);
      if (id) this.pregnancyCategories.set(name.toLowerCase(), id);
    }

    // 4. Manufacturers
    const mfgNames = [...new Set(rows.map((r) => r.manufacturer).filter((r): r is string => Boolean(r)))];
    if (mfgNames.length > 0) {
      const existing = await prismaUnscoped.manufacturer.findMany({
        where: { name: { in: mfgNames, mode: "insensitive" } },
      });
      for (const m of existing) {
        this.manufacturers.set(m.name.toLowerCase(), m.id);
      }
      for (const row of rows) {
        if (row.manufacturer && !this.manufacturers.has(row.manufacturer.toLowerCase())) {
          const created = await prismaUnscoped.manufacturer.create({
            data: {
              name: row.manufacturer,
              country: row.manufacturerCountry,
              active: true,
            },
          });
          this.manufacturers.set(row.manufacturer.toLowerCase(), created.id);
        }
      }
    }

    // 5. Active Ingredients
    const ingredientNames = [...new Set(rows.flatMap((r) => r.activeIngredients.map((a) => a.name)).filter(Boolean))];
    if (ingredientNames.length > 0) {
      const existing = await prismaUnscoped.activeIngredient.findMany({
        where: { name: { in: ingredientNames, mode: "insensitive" } },
      });
      for (const ing of existing) {
        this.activeIngredients.set(ing.name.toLowerCase(), ing.id);
      }
      for (const name of ingredientNames) {
        if (!this.activeIngredients.has(name.toLowerCase())) {
          const created = await prismaUnscoped.activeIngredient.create({
            data: { name, active: true },
          });
          this.activeIngredients.set(name.toLowerCase(), created.id);
        }
      }
    }

    // 6. Clinical Tags
    const tagNames = [...new Set(rows.flatMap((r) => r.clinicalTags).filter(Boolean))];
    if (tagNames.length > 0) {
      const existing = await prismaUnscoped.clinicalTag.findMany({
        where: { name: { in: tagNames, mode: "insensitive" } },
      });
      for (const t of existing) {
        this.clinicalTags.set(t.name.toLowerCase(), t.id);
      }
      for (const name of tagNames) {
        if (!this.clinicalTags.has(name.toLowerCase())) {
          const created = await prismaUnscoped.clinicalTag.create({
            data: {
              name,
              slug: medicationSlug(name) || `tag-${Date.now().toString(36)}`,
              active: true,
            },
          });
          this.clinicalTags.set(name.toLowerCase(), created.id);
        }
      }
    }
  }

  getDosageFormId(name: string): string | null {
    return this.dosageForms.get(name.toLowerCase()) || null;
  }
  getRouteId(name: string | null): string | null {
    return name ? this.routes.get(name.toLowerCase()) || null : null;
  }
  getPregnancyCategoryId(name: string | null): string | null {
    return name ? this.pregnancyCategories.get(name.toLowerCase()) || null : null;
  }
  getManufacturerId(name: string | null): string | null {
    return name ? this.manufacturers.get(name.toLowerCase()) || null : null;
  }
  getActiveIngredientId(name: string): string | null {
    return this.activeIngredients.get(name.toLowerCase()) || null;
  }
  getClinicalTagId(name: string): string | null {
    return this.clinicalTags.get(name.toLowerCase()) || null;
  }
}

/**
 * Executes a platform CSV import.
 * Writes ONLY to canonical records (MedicationMaster, Lookups, Manufacturer, ActiveIngredients, Tags).
 * ZERO PharmacyInventory rows are created!
 */
export async function executePlatformMedicationImport(options: {
  csvContent: string;
  filename?: string;
  actorId: string;
  transactional?: boolean;
}): Promise<ImportExecutionResult> {
  const { csvContent, filename, actorId, transactional = false } = options;

  const preview = await previewPlatformMedicationImport(csvContent);
  if (transactional && preview.errors.length > 0) {
    throw new Error(`Transactional import aborted due to ${preview.errors.length} validation errors.`);
  }

  // Create Import Batch Record
  const batch = await prismaUnscoped.medicationImportBatch.create({
    data: {
      actorId,
      filename: filename || "medications.csv",
      totalRows: preview.totalRows,
      errors: preview.errors.map((e) => ({
        row: e.rowNumber,
        column: e.column,
        code: e.code,
        message: e.message,
      })),
      summary: {
        validRows: preview.validRows,
        invalidRows: preview.invalidRows,
      },
    },
  });

  const validRows = preview.analyzedRows.map((a) => a.data);
  const cache = new LookupBatchCache();
  await cache.preload(validRows);

  let createdCount = 0;
  let matchedCount = 0;
  let reviewCount = 0;
  const executionErrors: Array<{ rowNumber: number; message: string }> = [];

  // Process in chunks of 50
  const CHUNK_SIZE = 50;
  for (let c = 0; c < preview.analyzedRows.length; c += CHUNK_SIZE) {
    const chunk = preview.analyzedRows.slice(c, c + CHUNK_SIZE);

    for (const item of chunk) {
      const row = item.data;
      const dosageFormId = cache.getDosageFormId(row.dosageForm);
      const routeId = cache.getRouteId(row.route);
      const pregnancyCategoryId = cache.getPregnancyCategoryId(row.pregnancyCategory);
      const manufacturerId = cache.getManufacturerId(row.manufacturer);

      const enrichment = computeEnrichmentScore({
        genericName: row.genericName,
        strengthDisplay: row.strengthDisplay,
        strengthValue: row.strengthValue,
        dosageFormId,
        routeId,
        indications: row.indications,
        sideEffects: row.sideEffects,
        contraindications: row.contraindications,
        manufacturerId,
        pregnancyCategoryId,
        barcode: row.barcode,
        imageUrl: row.imageUrl,
        activeIngredients: row.activeIngredients.map((a) => a.name),
      });

      const lockKey = row.barcode
        ? `platform-csv:barcode:${row.barcode}`
        : `platform-csv:gsf:${normalizeForMatch(row.genericName)}:${normalizeForMatch(row.strengthDisplay || "")}:${dosageFormId || ""}`;

      try {
        await prismaUnscoped.$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

            let masterId: string | null =
              item.action === "match_enrich" && item.existingMasterId ? item.existingMasterId : null;

            // Re-check under lock in case created by another chunk or concurrent import
            if (!masterId && row.barcode) {
              const existingBarcode = await tx.medicationMaster.findUnique({
                where: { barcode: row.barcode },
                select: { id: true },
              });
              if (existingBarcode) {
                masterId = existingBarcode.id;
              }
            }

            if (!masterId && row.genericName && dosageFormId) {
              const genericMatches = await tx.medicationMaster.findMany({
                where: {
                  genericName: { equals: row.genericName, mode: "insensitive" },
                  dosageFormId: dosageFormId,
                },
                select: { id: true, strengthDisplay: true, strengthValue: true, strengthUnit: true },
              });
              const strengthKey = normalizeForMatch(
                row.strengthDisplay || (row.strengthValue ? `${row.strengthValue} ${row.strengthUnit || ""}` : "")
              );
              const exact = genericMatches.find((m) => {
                const existingStr = normalizeForMatch(
                  m.strengthDisplay || (m.strengthValue ? `${m.strengthValue} ${m.strengthUnit || ""}` : "")
                );
                return existingStr && strengthKey && existingStr === strengthKey;
              });
              if (exact) {
                masterId = exact.id;
              }
            }

            if (!masterId) {
              const nameMatches = await tx.medicationMaster.findMany({
                where: { name: { equals: row.name, mode: "insensitive" } },
                select: { id: true, genericName: true },
              });
              const exactName = nameMatches.find(
                (m) => normalizeForMatch(m.genericName) === normalizeForMatch(row.genericName)
              );
              if (exactName) {
                masterId = exactName.id;
              }
            }

            if (masterId) {
              matchedCount++;

              // Enrich missing fields
              const current = await tx.medicationMaster.findUnique({ where: { id: masterId } });
              if (current) {
                const fill: Record<string, unknown> = {};
                const checkFill = (key: string, incoming: unknown, existing: unknown) => {
                  if ((existing == null || existing === "") && incoming != null && incoming !== "") fill[key] = incoming;
                };

                checkFill("brandName", row.brandName, current.brandName);
                checkFill("strengthValue", row.strengthValue, current.strengthValue);
                checkFill("strengthUnit", row.strengthUnit, current.strengthUnit);
                checkFill("strengthDisplay", row.strengthDisplay, current.strengthDisplay);
                checkFill("packSize", row.packSize, current.packSize);
                checkFill("dosageFormId", dosageFormId, current.dosageFormId);
                checkFill("routeId", routeId, current.routeId);
                checkFill("pregnancyCategoryId", pregnancyCategoryId, current.pregnancyCategoryId);
                checkFill("manufacturerId", manufacturerId, current.manufacturerId);
                checkFill("countryOfOrigin", row.countryOfOrigin, current.countryOfOrigin);
                checkFill("barcode", row.barcode, current.barcode);
                checkFill("description", row.description, current.description);
                checkFill("indications", row.indications, current.indications);
                checkFill("dosage", row.dosage, current.dosage);
                checkFill("sideEffects", row.sideEffects, current.sideEffects);
                checkFill("contraindications", row.contraindications, current.contraindications);
                checkFill("storage", row.storage, current.storage);
                checkFill("clinicalNotes", row.clinicalNotes, current.clinicalNotes);
                checkFill("imageUrl", row.imageUrl, current.imageUrl);
                checkFill("imageUrls", row.imageUrls, current.imageUrls);

                if (enrichment.score > current.enrichmentScore) {
                  fill.enrichmentScore = enrichment.score;
                  fill.enrichmentStatus = enrichment.status;
                  if (enrichment.status === "complete" && !current.enrichedAt) fill.enrichedAt = new Date();
                }

                if (Object.keys(fill).length > 0) {
                  await tx.medicationMaster.update({ where: { id: masterId }, data: fill });
                }
              }
            } else {
              // Create new master
              const status = item.action === "needs_review" ? "needs_review" : "active";
              if (status === "needs_review") reviewCount++;
              else createdCount++;

              const slug = medicationSlug(row.name) || `medicine-${Date.now().toString(36)}`;
              const created = await tx.medicationMaster.create({
                data: {
                  name: row.name,
                  slug,
                  genericName: row.genericName,
                  brandName: row.brandName,
                  strengthValue: row.strengthValue,
                  strengthUnit: row.strengthUnit,
                  strengthDisplay: row.strengthDisplay,
                  packSize: row.packSize,
                  dosageFormId,
                  routeId,
                  pregnancyCategoryId,
                  manufacturerId,
                  countryOfOrigin: row.countryOfOrigin,
                  barcode: row.barcode,
                  category: row.category,
                  description: row.description,
                  indications: row.indications,
                  dosage: row.dosage,
                  sideEffects: row.sideEffects,
                  contraindications: row.contraindications,
                  storage: row.storage,
                  clinicalNotes: row.clinicalNotes,
                  imageUrl: row.imageUrl,
                  imageUrls: row.imageUrls,
                  controlledDrug: row.controlledDrug,
                  controlledDrugSchedule: row.controlledDrugSchedule,
                  pediatricUse: row.pediatricUse,
                  requiresRefrigeration: row.requiresRefrigeration,
                  enrichmentStatus: enrichment.status,
                  enrichmentScore: enrichment.score,
                  enrichedAt: enrichment.status === "complete" ? new Date() : null,
                  acquisitionMethod: "platform_csv_import",
                  status,
                },
              });
              masterId = created.id;
            }

            // Active Ingredients
            for (const ing of row.activeIngredients) {
              const ingId = cache.getActiveIngredientId(ing.name);
              if (ingId) {
                const existingLink = await tx.medicationActiveIngredient.findFirst({
                  where: { medicationMasterId: masterId, activeIngredientId: ingId },
                });
                if (!existingLink) {
                  await tx.medicationActiveIngredient.create({
                    data: {
                      medicationMasterId: masterId,
                      activeIngredientId: ingId,
                      amount: ing.amount,
                      unit: ing.unit,
                    },
                  });
                }
              }
            }

            // Clinical Tags
            for (const tag of row.clinicalTags) {
              const tagId = cache.getClinicalTagId(tag);
              if (tagId) {
                await tx.medicationClinicalTag.upsert({
                  where: {
                    medicationMasterId_clinicalTagId: {
                      medicationMasterId: masterId,
                      clinicalTagId: tagId,
                    },
                  },
                  create: {
                    medicationMasterId: masterId,
                    clinicalTagId: tagId,
                  },
                  update: {},
                });
              }
            }
          },
          { maxWait: 20000, timeout: 60000 }
        );
      } catch (err) {
        console.error(`[platform csv import] row ${row.rowNumber} failed:`, err);
        executionErrors.push({
          rowNumber: row.rowNumber,
          message: err instanceof Error ? err.message : "Database error while importing row",
        });
      }
    }
  }

  // Update Batch Stats
  await prismaUnscoped.medicationImportBatch.update({
    where: { id: batch.id },
    data: {
      createdCount,
      matchedCount,
      reviewCount,
      errorCount: executionErrors.length,
      summary: {
        createdCount,
        matchedCount,
        reviewCount,
        errorCount: executionErrors.length,
      },
    },
  });

  await writeAuditLog(actorId, "platform_medication_csv_import", "medication_import_batch", batch.id, {
    batchId: batch.id,
    createdCount,
    matchedCount,
    reviewCount,
    errorCount: executionErrors.length,
  });

  return {
    batchId: batch.id,
    totalRows: preview.totalRows,
    createdCount,
    matchedCount,
    reviewCount,
    errorCount: executionErrors.length,
    errors: executionErrors,
  };
}
