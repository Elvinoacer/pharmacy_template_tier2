# Medication Module — Firm Implementation Decisions

**Status:** Authoritative. Every decision below is final for this build.
**Scope:** Implements `MEDICATION_MODULE_IMPLEMENTATION.md` in full.

---

## Architectural Decisions

### D1 — OTC / Prescription Required placement (resolves Phase 0.1)
**Decision:** Both fields live on `PharmacyInventory` (per-pharmacy), NOT `MedicationMaster`.
**Rationale:** The doc explicitly asks to decide based on whether these "can vary by pharmacy jurisdiction." Kenya's Pharmacy and Poisons Board classifications can vary by pharmacy license type and local jurisdiction. Keeping them on `PharmacyInventory` keeps `MedicationMaster` purely clinical (universal drug facts) and lets each pharmacy set its own dispensing rules. Validation and dispensing logic reads from `PharmacyInventory`.

### D2 — Multi-tenancy / pharmacy scoping
**Decision:** Single-pharmacy deployment. `PharmacyInventory` has NO `pharmacyId` FK.
**Rationale:** The existing codebase has no multi-tenant concept (all 30+ files assume single-pharmacy). Adding multi-tenancy now would be a massive breaking change outside this module's scope. `MedicationMaster` is the universal shared pool; `PharmacyInventory` is "this pharmacy's stock record" referencing it. The shared-library concept still works — `MedicationMaster` is the cross-pharmacy pool that future multi-tenant deployments would partition.

### D3 — ID preservation for safe migration
**Decision:** `PharmacyInventory` REUSES the old `Medication.id` (UUIDs preserved 1:1). `MedicationMaster` gets NEW UUIDs.
**Rationale:** This means existing `OrderItem.medicationId` and `Prescription.medicationId` FK values continue to resolve — they now point to `PharmacyInventory` instead of `Medication`, with zero ID remigration. The migration only: (a) creates new tables, (b) copies data with ID preservation, (c) drops the old `medications` table, (d) repoints FK constraints to the new table.

### D4 — FK targets after the split
**Decision:**
- `OrderItem.medicationId` → `PharmacyInventory` (the sellable/stockable unit; OrderItem already snapshots `name` + `unitPrice` so the FK is for traceability).
- `Prescription.medicationId` → `PharmacyInventory` (semantically a prescription is filled against pharmacy stock; also preserves the existing FK column unchanged).
**Rationale:** Both consumers continue to point at `PharmacyInventory`, which carries the commercial context (price, stock, OTC/Rx flags) and reaches back to `MedicationMaster` for clinical data via `medicationMasterId`. This is the minimum-break migration path.

---

## Data Model Decisions

### D5 — Brand Name (resolves Phase 1.1)
**Decision:** Single text field `brandName` on `MedicationMaster` (comma-separated for multi-brand). NOT a separate table.
**Rationale:** A separate brand table adds significant UI/schema complexity for marginal v1 benefit. The doc says "consider whether this needs to be its own list/table." V1 uses text (e.g., "Panadol, Calpol, Tylenol"). A schema comment documents that v2 may normalize. This is pragmatic for production-now.

### D6 — Active Ingredients (resolves Phase 1.2)
**Decision:** Dedicated `ActiveIngredient` lookup table + `MedicationActiveIngredient` join table (many-to-many).
**Fields:** `ActiveIngredient { id, name @unique, active, createdAt, updatedAt }`. Join: `medicationMasterId`, `activeIngredientId`, `amount` (optional, e.g. "500"), `unit` (optional, e.g. "mg").
**Rationale:** Satisfies "relational, not free text." Editable by admins. Multi-ingredient drugs (e.g., Co-amoxiclav = amoxicillin + clavulanic acid) supported.

### D7 — Manufacturer (resolves Phase 1.2)
**Decision:** Dedicated `Manufacturer` lookup table. `MedicationMaster.manufacturerId` FK.
**Fields:** `Manufacturer { id, name @unique, country?, active, createdAt, updatedAt }`. Editable by admins. Prevents "GSK" vs "Gsk" vs "GlaxoSmithKline" duplication.

### D8 — Drug Interactions (resolves Phase 1.2)
**Decision:** `MedicationInteraction` join table, self-referencing on `MedicationMaster`.
**Fields:** `medicationMasterId`, `interactsWithId` (both FK → MedicationMaster), `severity` (enum string: `minor | moderate | severe | contraindicated`), `description`, `createdAt`. Two rows per pair (A↔B and B↔A) to simplify lookups in either direction.
**Rationale:** Enables automatic interaction warnings at dispensing time — the doc calls this "one of the higher-effort fields."

### D9 — Clinical Tags (resolves Phase 1.2)
**Decision:** `ClinicalTag` lookup table + `MedicationClinicalTag` join table (many-to-many).
**Fields:** `ClinicalTag { id, name @unique, slug @unique, active, createdAt }`. Editable. Examples: Antibiotic, NSAID, Antihypertensive, Antidiabetic, Anticoagulant.

### D10 — Dosage Form / Route / Pregnancy Category (resolves Phase 1.3)
**Decision:** Single `MedicationLookup` table with `kind` discriminator (`dosage_form | route | pregnancy_category`). Each row: `{ id, kind, value, slug, sortOrder, active }`. Editable without code change.
**Rationale:** Avoids table proliferation (3 separate tables) while keeping the "editable lookup" requirement. Seeded with the doc's enumerated values on migration.

### D11 — Controlled Drug sub-classification (resolves Phase 1.4)
**Decision:** `controlledDrug` boolean + `controlledDrugSchedule` enum string (`schedule_1 | schedule_2 | schedule_3 | schedule_4 | schedule_5 | null`).
**Validation:** If `controlledDrug=true`, schedule MUST be set (enforced in the Phase 4 validation service + at DB level via CHECK constraint).

### D12 — InventoryLot (resolves Phase 1.5)
**Decision:** `InventoryLot` model with FK to `PharmacyInventory`. One-to-many.
**Fields:** `{ id, pharmacyInventoryId, batchNumber, expiryDate, quantity, receivedAt, active, createdAt, updatedAt }`. Supports multiple lots per medication per pharmacy. Used for recall handling + expiry-based alerts.

### D13 — Strength (resolves Phase 1.1)
**Decision:** Structured `strengthValue` (Decimal, nullable) + `strengthUnit` (text, nullable) + `strengthDisplay` (text, the human-readable override).
**Rationale:** `strengthValue` enables sorting/filtering (e.g., "show all 500mg paracetamol"); `strengthDisplay` handles combination drugs (e.g., "500 mg + 65 mg") that don't fit a single number.

### D14 — Enrichment status (resolves Phase 5)
**Decision:** Three fields on `MedicationMaster`:
- `enrichmentStatus` enum (`complete | partial | minimal`)
- `enrichmentScore` Int (0–100, computed on every save via shared service)
- `enrichedAt` DateTime? (last time status flipped to `complete`)
**Computation:** Shared service `computeEnrichment(master)` checks presence of: genericName, activeIngredients (≥1), strength, dosageForm, route, indications, sideEffects, contraindications, manufacturer, pregnancyCategory, barcode, at least one image. Score = (present / total) × 100. Status: ≥80% → complete, 40–79% → partial, <40% → minimal.

### D15 — Acquisition method tracking (resolves Phase 6)
**Decision:** `acquisitionMethod` enum on `MedicationMaster` (`shared_library | barcode | ai_import | csv_import | manual | pos_sync | unknown`). Set at creation by each acquisition flow. Used by the metrics page.

---

## Acquisition Method Decisions

### D16 — Barcode scanning (resolves Phase 3.2)
**Decision:** Browser-native `BarcodeDetector` API for camera scanning, with a manual text input field as fallback (handles hardware USB scanners that behave as keyboard input). No new dependency.
**Rationale:** `BarcodeDetector` is Chromium-native; the manual input covers non-supporting browsers and hardware scanners. No bundle-size cost. The lookup hits `/api/admin/medications/library/lookup?barcode=...` → `MedicationMaster.barcode` unique index.

### D17 — AI Import (resolves Phase 3.3)
**Decision:** Fully provider-agnostic. No AI API calls from our system.
**Components:**
1. Versioned prompt template stored as a constant in `app/lib/medication-ai-prompt.ts` (with `PROMPT_VERSION = "1.0.0"`).
2. Zod JSON schema in `app/lib/medication-ai-schema.ts` — the canonical contract between prompt and parser.
3. New page `/admin/medications/import/ai`:
   - "Copy Prompt" button (copies the prompt template to clipboard).
   - Photo guidance panel (explains what to photograph: front, back, leaflet).
   - Optional photo upload (stored as gallery images on the resulting MedicationMaster).
   - Paste textarea for the AI's JSON response.
   - "Parse" action validates against the Zod schema.
   - On success: review screen with parsed fields mapped into the 5-section form for correction.
   - On failure: per-field error list + "Edit JSON" + "Fall back to Manual Entry" escape.
4. The parser is the single source of truth — no AI-vendor-specific handling.

### D18 — CSV / Excel import (resolves Phase 3.4)
**Decision:** Support both `.csv` and `.xlsx`.
**Dependencies added:** `papaparse` (client-side CSV, MIT), `xlsx` (SheetJS community, Apache-2.0, dynamically imported server-side for `.xlsx` only to keep the main bundle lean), `@types/papaparse`.
**Flow:**
1. Upload file → client-side parse to JSON rows (papaparse for CSV, xlsx for Excel).
2. Column mapping UI (map source columns → system fields; arbitrary source columns supported).
3. Preview table (first 10 rows mapped).
4. Import execution (server action): for each row, run `findExistingMaster(genericName, strength, dosageForm)` — if match, create `PharmacyInventory` only; if no match, create `MedicationMaster` (enrichmentStatus='minimal') + `PharmacyInventory`.
5. Summary screen: X created, Y matched, Z flagged for enrichment.

### D19 — CSV/Excel match-first strategy (resolves Phase 3.4)
**Decision:** Match against existing `MedicationMaster` first (by normalized generic name + strength + dosage form), then by name. Reuses the same duplicate-detection service from Phase 4.
**Rationale:** Prevents flooding the shared library with duplicates. Matched rows create only `PharmacyInventory`; unmatched rows create both models with the enrichment flag set.

### D20 — Form sections UI (resolves Phase 2)
**Decision:** Accordion (collapsible sections), all on one page. NOT tabs, NOT stepper.
**Rationale:** Best UX for a long form — admins expand/collapse sections, all data stays on one page (no lost context), works on mobile. Uses the existing admin styling patterns (`input-admin`, `label-admin`, etc.).

### D21 — Acquisition chooser UI (resolves Phase 3)
**Decision:** New `/admin/medications/add` page with 6 cards (5 active + 1 greyed "Coming soon" for POS Sync). The existing "New Medication" button on `/admin/medications` routes to `/admin/medications/add` instead of `/admin/medications/new`. The old `/new` route becomes the Manual Entry flow (last option, per the doc).

### D22 — Review-before-save (resolves Phase 4.2)
**Decision:** Every acquisition flow that creates/edits a `MedicationMaster` shows a `<MedicationReviewScreen>` with validation results (pass/flag/fail per rule) before final commit. The Shared Library "Add to Pharmacy" flow (which only creates a `PharmacyInventory` against an existing validated `MedicationMaster`) is the single exception — it shows a lightweight confirm step instead, since the master record is already vetted.

### D23 — Barcode + SKU uniqueness (resolves Phase 4.1)
**Decision:**
- `MedicationMaster.barcode` → `@unique` (DB-level, partial unique index where barcode IS NOT NULL).
- `PharmacyInventory.sku` → `@unique` (DB-level, partial unique index where sku IS NOT NULL, single-tenant so no pharmacy scoping needed).
Both enforced in the migration SQL with `CREATE UNIQUE INDEX ... WHERE ... IS NOT NULL`.

### D24 — Required fields (resolves Phase 4.1 "Missing required fields")
**Decision:** Required fields are:
- `MedicationMaster`: `name` (existing), `genericName` (new, required), `dosageForm` (new, required), `slug` (derived, required).
- `PharmacyInventory`: `medicationMasterId` (FK, required), `slug` (required, unique), `price` (required, ≥0).
Everything else is optional (supports Phase 5 progressive enrichment).

---

## Migration Strategy (resolves Phase 0.3)

### D25 — Migration approach
**Decision:** One migration `20260805120000_medication_master_inventory_split/migration.sql` that:
1. Creates all new tables (`medication_masters`, `pharmacy_inventory`, `inventory_lots`, `active_ingredients`, `medication_active_ingredients`, `manufacturers`, `medication_interactions`, `clinical_tags`, `medication_clinical_tags`, `medication_lookups`).
2. Seeds `MedicationLookup` with the doc's enumerated dosage forms, routes, pregnancy categories.
3. Inserts into `medication_masters` the clinical fields from `medications` (new UUIDs).
4. Inserts into `pharmacy_inventory` the commercial fields from `medications`, with `medication_master_id` FK + REUSING the old `medications.id` as the new `pharmacy_inventory.id` (per D3).
5. Drops FK constraints from `order_items.medication_id` and `prescriptions.medication_id` to `medications`, then recreates them pointing to `pharmacy_inventory`.
6. Drops the old `medications` table.
7. Creates all unique indexes (barcode, sku) and check constraints (controlled drug schedule).

### D26 — Backward compatibility
**Decision:** All 14 consumer files are updated in this same build to use the new models. No backward-compat shim. `prisma.medication` is removed entirely. Clean break, appropriate for a template.

---

## UI/UX Decisions

### D27 — Enrichment queue UI (resolves Phase 5)
**Decision:** New `/admin/medications/incomplete` page listing `MedicationMaster` where `enrichmentStatus != 'complete'`, sorted by score ascending. Filterable by status. Quick-edit link to the existing edit form.

### D28 — Metrics page (resolves Phase 6)
**Decision:** New `/admin/medications/metrics` page showing:
- Count of `MedicationMaster` by `acquisitionMethod` (bar chart via simple CSS bars, no chart lib).
- Count by `enrichmentStatus`.
- Total library size + growth (last 30 days, computed from `createdAt`).
- Hit-rate proxy: % of `PharmacyInventory` rows whose `MedicationMaster` was created via `shared_library` or `barcode` (reuse) vs `manual`/`ai_import`/`csv_import` (new entry).

### D29 — Shared Library search API (resolves Phase 3.1)
**Decision:** New `/api/admin/medications/library/search?q=...` endpoint querying `MedicationMaster` with case-insensitive partial match on `name`, `genericName`, `brandName`, `barcode`. Returns enriched results (manufacturer, dosage form, strength, active ingredients, whether this pharmacy already stocks it). Debounced 250ms on the client.

### D30 — Barcode lookup API (resolves Phase 3.2)
**Decision:** New `/api/admin/medications/library/lookup?barcode=...` endpoint. Returns the matching `MedicationMaster` + whether this pharmacy already stocks it. 404 if not found (frontend then offers the AI Import path with the scanned barcode carried forward as context).

---

## Delivery Decisions

### D31 — `.git` preservation
**Decision:** The `.git` directory is NEVER modified. All source-file edits happen outside `.git`. The final zip INCLUDES the `.git` directory unchanged so the user's git history is preserved.

### D32 — Zip contents
**Decision:** The final zip includes: all source files, `.git/`, `.github/`, `.gitignore`, `.env.example`, `prisma/` (with new migration), `app/`, `public/`, `package.json`, `package-lock.json` (regenerated to include new deps), `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, all `.md` docs. Excludes: `node_modules/`, `.next/`, `app/generated/` (regenerated by `prisma generate`).

---

*End of decisions. Every phase, field, and acceptance criterion in `MEDICATION_MODULE_IMPLEMENTATION.md` is covered by one or more decisions above.*
