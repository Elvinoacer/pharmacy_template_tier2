import "server-only";

/**
 * Shared parser for the medication form (Phase 2 five-section form).
 * Used by both adminCreateMedicationAction and the /api/admin/medications/validate
 * endpoint so parsing logic stays in one place.
 *
 * Form field names match the `name="..."` attributes on MedicationForm.tsx.
 */

export type ParsedMaster = {
  name: string;
  slug: string;
  genericName: string;
  brandName: string | null;
  strengthValue: number | null;
  strengthUnit: string | null;
  strengthDisplay: string | null;
  packSize: string | null;
  dosageFormId: string | null;
  routeId: string | null;
  pregnancyCategoryId: string | null;
  manufacturerId: string | null;
  countryOfOrigin: string | null;
  barcode: string | null;
  category: string;
  description: string | null;
  indications: string | null;
  dosage: string | null;
  sideEffects: string | null;
  contraindications: string | null;
  storage: string | null;
  clinicalNotes: string | null;
  imageUrl: string | null;
  imageUrls: string | null;
  alternativeIds: string | null;
  controlledDrug: boolean;
  controlledDrugSchedule: string | null;
  pediatricUse: boolean;
  requiresRefrigeration: boolean;
  acquisitionMethod: string;
};

export type ParsedInventory = {
  slug: string;
  sku: string | null;
  price: number;
  purchasePrice: number | null;
  currentStock: number;
  lowStockThreshold: number;
  supplier: string | null;
  shelfLocation: string | null;
  promotions: string | null;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  publicListing: boolean;
  active: boolean;
};

export type ParsedMedicationForm = {
  master: ParsedMaster;
  inventory: ParsedInventory;
  activeIngredientIds: string[];
  clinicalTagIds: string[];
  /** Optional comma-separated interaction target IDs (Phase 1.2 — edited via a separate UI). */
  interactionIds: string[];
};

function trimOrNull(v: string): string | null {
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function parseNum(v: FormDataEntryValue | null, def = 0): number {
  if (v == null) return def;
  const n = Number(String(v));
  return Number.isFinite(n) ? n : def;
}

export function parseMedicationFormData(formData: FormData): ParsedMedicationForm {
  const name = String(formData.get("name") || "").trim();
  const genericName = String(formData.get("genericName") || "").trim();
  const slugRaw = String(formData.get("slug") || "").trim();
  const slug =
    slugRaw || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Mutual exclusivity for OTC / Rx.
  const overTheCounter = formData.get("overTheCounter") === "on";
  let prescriptionRequired = formData.get("prescriptionRequired") === "on";
  if (overTheCounter && prescriptionRequired) prescriptionRequired = false;
  if (!overTheCounter && !prescriptionRequired) prescriptionRequired = true;

  const controlledDrug = formData.get("controlledDrug") === "on";
  const controlledDrugSchedule = String(formData.get("controlledDrugSchedule") || "").trim() || null;

  const master: ParsedMaster = {
    name,
    slug,
    genericName,
    brandName: trimOrNull(String(formData.get("brandName") || "")),
    strengthValue: (() => {
      const v = String(formData.get("strengthValue") || "").trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })(),
    strengthUnit: trimOrNull(String(formData.get("strengthUnit") || "")),
    strengthDisplay: trimOrNull(String(formData.get("strengthDisplay") || "")),
    packSize: trimOrNull(String(formData.get("packSize") || "")),
    dosageFormId: trimOrNull(String(formData.get("dosageFormId") || "")),
    routeId: trimOrNull(String(formData.get("routeId") || "")),
    pregnancyCategoryId: trimOrNull(String(formData.get("pregnancyCategoryId") || "")),
    manufacturerId: trimOrNull(String(formData.get("manufacturerId") || "")),
    countryOfOrigin: trimOrNull(String(formData.get("countryOfOrigin") || "")),
    barcode: trimOrNull(String(formData.get("barcode") || "")),
    category: String(formData.get("category") || "general"),
    description: trimOrNull(String(formData.get("description") || "")),
    indications: trimOrNull(String(formData.get("indications") || "")),
    dosage: trimOrNull(String(formData.get("dosage") || "")),
    sideEffects: trimOrNull(String(formData.get("sideEffects") || "")),
    contraindications: trimOrNull(String(formData.get("contraindications") || "")),
    storage: trimOrNull(String(formData.get("storage") || "")),
    clinicalNotes: trimOrNull(String(formData.get("clinicalNotes") || "")),
    imageUrl: trimOrNull(String(formData.get("imageUrl") || "")),
    imageUrls: trimOrNull(String(formData.get("imageUrls") || "")),
    alternativeIds: trimOrNull(String(formData.get("alternativeIds") || "")),
    controlledDrug,
    controlledDrugSchedule,
    pediatricUse: formData.get("pediatricUse") === "on",
    requiresRefrigeration: formData.get("requiresRefrigeration") === "on",
    acquisitionMethod: String(formData.get("acquisitionMethod") || "manual"),
  };

  const inventory: ParsedInventory = {
    slug,
    sku: trimOrNull(String(formData.get("sku") || "")),
    price: parseNum(formData.get("price"), 0),
    purchasePrice: (() => {
      const v = String(formData.get("purchasePrice") || "").trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })(),
    currentStock: parseNum(formData.get("currentStock"), 0),
    lowStockThreshold: parseNum(formData.get("lowStockThreshold"), 10),
    supplier: trimOrNull(String(formData.get("supplier") || "")),
    shelfLocation: trimOrNull(String(formData.get("shelfLocation") || "")),
    promotions: trimOrNull(String(formData.get("promotions") || "")),
    overTheCounter,
    prescriptionRequired,
    publicListing: formData.get("publicListing") === "on",
    active: formData.getAll("active").includes("on"),
  };

  // Multi-value fields come in as repeated form entries OR comma-separated strings.
  const activeIngredientIds = formData
    .getAll("activeIngredientIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const clinicalTagIds = formData
    .getAll("clinicalTagIds")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const interactionIds = formData
    .getAll("interactionIds")
    .map((v) => String(v).trim())
    .filter(Boolean);

  return { master, inventory, activeIngredientIds, clinicalTagIds, interactionIds };
}
