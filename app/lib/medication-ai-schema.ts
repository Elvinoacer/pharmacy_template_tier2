import { z } from "zod";

/**
 * Canonical JSON schema for the AI-Assisted Import feature (Phase 3.3).
 *
 * This is the SINGLE source of truth for the contract between:
 *   - the extraction prompt (medication-ai-prompt.ts) — asks the AI to output this shape
 *   - the parser (admin/medications/import/ai) — validates the pasted AI response
 *
 * Provider-agnostic: no AI-vendor-specific fields. Works with ChatGPT, Claude, Gemini,
 * Grok, GLM, Kimi, or any future LLM that can emit JSON.
 *
 * Field names use the human NAMES of lookups (e.g. "Tablet" for dosage form) rather
 * than UUIDs — the AI doesn't know our internal IDs. The import API resolves names → IDs.
 */

export const PROMPT_VERSION = "1.0.0";

export const MedicationAiSchema = z.object({
  name: z.string().min(1).describe("Brand/product name as printed on the pack, e.g. 'Panadol 500mg'"),
  genericName: z.string().min(1).describe("INN / generic name, e.g. 'Paracetamol'"),
  brandName: z.string().optional().catch(undefined).describe("Comma-separated brand equivalents, e.g. 'Panadol, Calpol'"),
  strengthValue: z.number().optional().catch(undefined).describe("Numeric strength, e.g. 500"),
  strengthUnit: z.string().optional().catch(undefined).describe("Strength unit, e.g. 'mg'"),
  strengthDisplay: z.string().optional().catch(undefined).describe("Human-readable strength, e.g. '500 mg' or '500 mg + 65 mg' for combos"),
  packSize: z.string().optional().catch(undefined).describe("e.g. '10 tablets', '100ml bottle'"),
  dosageForm: z.string().optional().catch(undefined).describe("Name of dosage form: Tablet, Capsule, Syrup, Injection, Cream, Ointment, Eye Drops, Ear Drops, Nasal Spray, Suspension, Inhaler, Sachet"),
  route: z.string().optional().catch(undefined).describe("Name of route: Oral, Topical, Intravenous, Intramuscular, Inhalation, Rectal, Ophthalmic, Nasal"),
  pregnancyCategory: z.string().optional().catch(undefined).describe("One of: A, B, C, D, X"),
  manufacturer: z.string().optional().catch(undefined).describe("Manufacturer name, e.g. 'GSK', 'Cipla', 'GlaxoSmithKline'"),
  countryOfOrigin: z.string().optional().catch(undefined).describe("Country of manufacture"),
  barcode: z.string().optional().catch(undefined).describe("EAN/GTIN barcode if visible on the pack"),
  category: z.string().optional().catch(undefined).describe("Category slug, e.g. 'pain-relief', 'antibiotics'. Default 'general'."),
  description: z.string().optional().catch(undefined).describe("Short one-line summary"),
  indications: z.string().optional().catch(undefined).describe("What it treats (markdown ok)"),
  dosage: z.string().optional().catch(undefined).describe("Dosage instructions, e.g. '1-2 tablets every 4-6 hours'"),
  sideEffects: z.string().optional().catch(undefined).describe("Common side effects"),
  contraindications: z.string().optional().catch(undefined).describe("When NOT to use it"),
  storage: z.string().optional().catch(undefined).describe("Storage instructions, e.g. 'Store below 25°C'"),
  clinicalNotes: z.string().optional().catch(undefined).describe("Extra pharmacology notes"),
  controlledDrug: z.boolean().optional().catch(false).describe("True if it's a controlled/scheduled substance"),
  controlledDrugSchedule: z.string().optional().catch(undefined).describe("One of: schedule_1, schedule_2, schedule_3, schedule_4, schedule_5"),
  pediatricUse: z.boolean().optional().catch(false).describe("True if suitable for children"),
  requiresRefrigeration: z.boolean().optional().catch(false).describe("True if it must be refrigerated"),
  activeIngredients: z.array(z.string()).optional().catch([]).describe("Active ingredient names, e.g. ['Paracetamol'] or ['Amoxicillin', 'Clavulanic acid']"),
  clinicalTags: z.array(z.string()).optional().catch([]).describe("Clinical tag names, e.g. ['Antibiotic', 'NSAID']"),
});

export type MedicationAiInput = z.infer<typeof MedicationAiSchema>;
