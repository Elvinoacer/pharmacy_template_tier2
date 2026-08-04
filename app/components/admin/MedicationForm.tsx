"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import {
  Pill, Tag, Hash, DollarSign, Package, AlertCircle, Check, Save, FileText, Boxes,
  ChevronDown, ChevronRight, X, Beaker, MapPin, Globe, Shield, Baby, Snowflake,
  Image as ImageIcon, AlertTriangle,
} from "lucide-react";
import ImageUploadField from "@/app/components/admin/ImageUploadField";
import type { ValidationResult } from "@/app/lib/services/medication-validation";

type LookupOption = { id: string; value: string; slug: string };
type ManufacturerOption = { id: string; name: string };
type ActiveIngredientOption = { id: string; name: string };
type ClinicalTagOption = { id: string; name: string; slug: string };
type CategoryOption = { slug: string; name: string };

const FALLBACK_CATEGORIES: CategoryOption[] = [
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

export type MedicationFormDefaults = {
  inventoryId?: string;
  masterId?: string;
  name?: string;
  slug?: string;
  genericName?: string;
  brandName?: string;
  strengthValue?: string;
  strengthUnit?: string;
  strengthDisplay?: string;
  packSize?: string;
  dosageFormId?: string;
  routeId?: string;
  pregnancyCategoryId?: string;
  manufacturerId?: string;
  countryOfOrigin?: string;
  barcode?: string;
  category?: string;
  description?: string;
  indications?: string;
  dosage?: string;
  sideEffects?: string;
  contraindications?: string;
  storage?: string;
  clinicalNotes?: string;
  imageUrl?: string;
  imageUrls?: string;
  alternativeIds?: string;
  controlledDrug?: boolean;
  controlledDrugSchedule?: string;
  pediatricUse?: boolean;
  requiresRefrigeration?: boolean;
  // Inventory
  sku?: string;
  price?: string;
  purchasePrice?: string;
  currentStock?: string;
  lowStockThreshold?: string;
  supplier?: string;
  shelfLocation?: string;
  promotions?: string;
  overTheCounter?: boolean;
  publicListing?: boolean;
  prescriptionRequired?: boolean;
  active?: boolean;
  // Relational
  activeIngredientIds?: string[];
  clinicalTagIds?: string[];
  acquisitionMethod?: string;
};

export type MedicationFormProps = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  categories?: CategoryOption[];
  dosageForms?: LookupOption[];
  routes?: LookupOption[];
  pregnancyCategories?: LookupOption[];
  manufacturers?: ManufacturerOption[];
  activeIngredients?: ActiveIngredientOption[];
  clinicalTags?: ClinicalTagOption[];
  defaults?: MedicationFormDefaults;
  /** Hide the acquisition-method selector (e.g. on the manual entry form). */
  acquisitionMethod?: string;
};

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold admin-text hover:bg-[var(--admin-hover)]"
      >
        <Icon className="h-4 w-4 admin-accent-text" />
        <span className="flex-1">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 admin-soft" /> : <ChevronRight className="h-4 w-4 admin-soft" />}
      </button>
      {open && <div className="space-y-4 border-t border-[var(--admin-border-2)] p-4">{children}</div>}
    </div>
  );
}

export default function MedicationForm({
  action,
  categories,
  dosageForms = [],
  routes = [],
  pregnancyCategories = [],
  manufacturers = [],
  activeIngredients = [],
  clinicalTags = [],
  defaults,
  acquisitionMethod = "manual",
}: MedicationFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const categoryOptions = categories?.length ? categories : FALLBACK_CATEGORIES;

  const [name, setName] = useState(defaults?.name || "");
  const [slug, setSlug] = useState(defaults?.slug || "");
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults?.slug));
  const [otc, setOtc] = useState(defaults?.overTheCounter ?? false);
  const [rxRequired, setRxRequired] = useState(defaults?.prescriptionRequired ?? true);
  const [controlledDrug, setControlledDrug] = useState(defaults?.controlledDrug ?? false);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(
    defaults?.activeIngredientIds || [],
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaults?.clinicalTagIds || []);

  const validation = state?.validation as unknown as ValidationResult | undefined;

  useEffect(() => {
    if (!slugTouched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [name, slugTouched]);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  function setOtcChecked(checked: boolean) {
    setOtc(checked);
    if (checked) setRxRequired(false);
  }
  function setRxChecked(checked: boolean) {
    setRxRequired(checked);
    if (checked) setOtc(false);
  }

  const needsConfirmation = Boolean(state?.needsConfirmation);

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden IDs for edit mode + acquisition method + confirmation flag */}
      {defaults?.inventoryId && <input type="hidden" name="inventoryId" value={defaults.inventoryId} />}
      {defaults?.masterId && <input type="hidden" name="masterId" value={defaults.masterId} />}
      <input type="hidden" name="acquisitionMethod" value={acquisitionMethod} />
      {needsConfirmation && <input type="hidden" name="confirmed" value="true" />}

      {state?.error && (
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      {/* ── Review-before-save panel (Phase 4.2) ── */}
      {needsConfirmation && validation && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Review before saving
          </div>
          <p className="mb-3 text-xs text-amber-700/80 dark:text-amber-400/80">
            The validation layer flagged {validation.counts.flag} issue(s). Review them below and click
            &ldquo;Confirm &amp; Save&rdquo; to proceed, or edit the form and resubmit.
          </p>
          <ul className="space-y-1.5">
            {validation.checks
              .filter((c) => c.severity === "flag")
              .map((c) => (
                <li key={c.rule} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-[var(--admin-text)]">
                    <strong>{c.label}:</strong> {c.message}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* ── 1. Identification ── */}
      <Section title="1. Identification" icon={Pill}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Medicine name *</label>
            <div className="relative">
              <Pill className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Paracetamol 500mg"
                className="input-admin pl-9"
              />
            </div>
          </div>
          <div>
            <label className="label-admin">Generic name (INN) *</label>
            <input
              name="genericName"
              required
              defaultValue={defaults?.genericName || ""}
              placeholder="Paracetamol"
              className="input-admin"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Brand name(s)</label>
            <input
              name="brandName"
              defaultValue={defaults?.brandName || ""}
              placeholder="Panadol, Calpol, Tylenol"
              className="input-admin"
            />
            <p className="mt-1 text-[10px] admin-soft">Comma-separated. One generic often has many brand equivalents.</p>
          </div>
          <div>
            <label className="label-admin">Barcode (EAN/GTIN)</label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input
                name="barcode"
                defaultValue={defaults?.barcode || ""}
                placeholder="6001234567890"
                className="input-admin pl-9 font-mono"
              />
            </div>
            <p className="mt-1 text-[10px] admin-soft">Unique across the shared library. Used for barcode lookup.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Slug (pharmacy-specific)</label>
            <input
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder={slug || "paracetamol-500mg"}
              className="input-admin font-mono"
            />
          </div>
          <div>
            <label className="label-admin">Category</label>
            <select name="category" className="input-admin" defaultValue={defaults?.category || "general"}>
              {categoryOptions.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* ── 2. Clinical information ── */}
      <Section title="2. Clinical information" icon={Beaker}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Active ingredient(s) *</label>
            <ActiveIngredientPicker
              options={activeIngredients}
              selected={selectedIngredientIds}
              onChange={setSelectedIngredientIds}
            />
            <p className="mt-1 text-[10px] admin-soft">
              Relational, multi-value. {selectedIngredientIds.length} selected.
            </p>
          </div>
          <div>
            <label className="label-admin">Manufacturer</label>
            <select name="manufacturerId" className="input-admin" defaultValue={defaults?.manufacturerId || ""}>
              <option value="">— Select manufacturer —</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label-admin">Strength value</label>
            <input
              name="strengthValue"
              type="number"
              step="0.0001"
              defaultValue={defaults?.strengthValue || ""}
              placeholder="500"
              className="input-admin"
            />
          </div>
          <div>
            <label className="label-admin">Strength unit</label>
            <input
              name="strengthUnit"
              defaultValue={defaults?.strengthUnit || ""}
              placeholder="mg"
              className="input-admin"
            />
          </div>
          <div>
            <label className="label-admin">Strength (display)</label>
            <input
              name="strengthDisplay"
              defaultValue={defaults?.strengthDisplay || ""}
              placeholder="500 mg (or 500 mg + 65 mg for combos)"
              className="input-admin"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Dosage form *</label>
            <select name="dosageFormId" className="input-admin" defaultValue={defaults?.dosageFormId || ""} required>
              <option value="">— Select dosage form —</option>
              {dosageForms.map((d) => (
                <option key={d.id} value={d.id}>{d.value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-admin">Route of administration</label>
            <select name="routeId" className="input-admin" defaultValue={defaults?.routeId || ""}>
              <option value="">— Select route —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.value}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label-admin">Indications (what it treats)</label>
          <textarea name="indications" rows={3} defaultValue={defaults?.indications || ""} placeholder="Markdown supported. e.g. 'Used for mild to moderate pain, fever, headaches…'" className="input-admin resize-y" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Side effects</label>
            <textarea name="sideEffects" rows={2} defaultValue={defaults?.sideEffects || ""} placeholder="Nausea, rash, liver issues with prolonged use…" className="input-admin resize-y" />
          </div>
          <div>
            <label className="label-admin">Contraindications</label>
            <textarea name="contraindications" rows={2} defaultValue={defaults?.contraindications || ""} placeholder="Not for patients with liver disease or taking warfarin…" className="input-admin resize-y" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Pregnancy category</label>
            <select name="pregnancyCategoryId" className="input-admin" defaultValue={defaults?.pregnancyCategoryId || ""}>
              <option value="">— Select category —</option>
              {pregnancyCategories.map((p) => (
                <option key={p.id} value={p.id}>{p.value}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-admin">Pediatric use</label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)] mt-2">
              <input
                type="checkbox"
                name="pediatricUse"
                defaultChecked={defaults?.pediatricUse}
                className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text"
              />
              <Baby className="h-4 w-4" /> Suitable for children
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--admin-inset)] p-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
            <input
              type="checkbox"
              name="controlledDrug"
              checked={controlledDrug}
              onChange={(e) => setControlledDrug(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text"
            />
            <Shield className="h-4 w-4" /> Controlled drug
          </label>
          {controlledDrug && (
            <div className="mt-3">
              <label className="label-admin">Controlled drug schedule *</label>
              <select
                name="controlledDrugSchedule"
                className="input-admin"
                defaultValue={defaults?.controlledDrugSchedule || ""}
                required
              >
                <option value="">— Select schedule —</option>
                <option value="schedule_1">Schedule 1</option>
                <option value="schedule_2">Schedule 2</option>
                <option value="schedule_3">Schedule 3</option>
                <option value="schedule_4">Schedule 4</option>
                <option value="schedule_5">Schedule 5</option>
              </select>
              <p className="mt-1 text-[10px] admin-soft">Kenya Pharmacy &amp; Poisons Board schedule. Required when controlled drug is checked.</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Dosage instructions</label>
            <input name="dosage" defaultValue={defaults?.dosage || ""} placeholder="1-2 tablets every 4-6 hours, max 8 in 24h" className="input-admin" />
          </div>
          <div>
            <label className="label-admin">Storage instructions</label>
            <input name="storage" defaultValue={defaults?.storage || ""} placeholder="Store below 25°C, keep dry" className="input-admin" />
          </div>
        </div>

        <div>
          <label className="label-admin">Clinical notes</label>
          <textarea name="clinicalNotes" rows={2} defaultValue={defaults?.clinicalNotes || ""} placeholder="Extra pharmacology notes, bioavailability, half-life, etc." className="input-admin resize-y" />
        </div>
      </Section>

      {/* ── 3. Commercial information ── */}
      <Section title="3. Commercial information" icon={DollarSign}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label-admin">Selling price (KES) *</label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input name="price" type="number" min="0" step="0.01" required defaultValue={defaults?.price || "0"} className="input-admin pl-9" />
            </div>
          </div>
          <div>
            <label className="label-admin">Purchase price (KES)</label>
            <input name="purchasePrice" type="number" min="0" step="0.01" defaultValue={defaults?.purchasePrice || ""} className="input-admin" />
          </div>
          <div>
            <label className="label-admin">Pack size</label>
            <input name="packSize" defaultValue={defaults?.packSize || ""} placeholder="10 tablets, 100ml bottle" className="input-admin" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Country of origin</label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input name="countryOfOrigin" defaultValue={defaults?.countryOfOrigin || ""} placeholder="Kenya" className="input-admin pl-9" />
            </div>
          </div>
          <div>
            <label className="label-admin">Supplier</label>
            <input name="supplier" defaultValue={defaults?.supplier || ""} placeholder="Nairobi Pharma Distributors" className="input-admin" />
          </div>
        </div>

        <div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
            <input type="checkbox" name="publicListing" defaultChecked={defaults?.publicListing} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
            <Tag className="h-4 w-4" /> Show on public catalog (no login required)
          </label>
        </div>
      </Section>

      {/* ── 4. Inventory settings ── */}
      <Section title="4. Inventory settings" icon={Package}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label-admin">Current stock</label>
            <div className="relative">
              <Package className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input name="currentStock" type="number" min="0" defaultValue={defaults?.currentStock || "0"} className="input-admin pl-9" />
            </div>
          </div>
          <div>
            <label className="label-admin">Low stock threshold</label>
            <input name="lowStockThreshold" type="number" min="0" defaultValue={defaults?.lowStockThreshold || "10"} className="input-admin" />
          </div>
          <div>
            <label className="label-admin">SKU</label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input name="sku" defaultValue={defaults?.sku || ""} placeholder="PARA-500" className="input-admin pl-9 font-mono" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-admin">Shelf location</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input name="shelfLocation" defaultValue={defaults?.shelfLocation || ""} placeholder="Aisle 3, Shelf B-12" className="input-admin pl-9" />
            </div>
          </div>
          <div>
            <label className="label-admin">Promotions</label>
            <input name="promotions" defaultValue={defaults?.promotions || ""} placeholder="Buy 2 get 1 free" className="input-admin" />
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-[var(--admin-inset)] p-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
            <input type="checkbox" name="overTheCounter" checked={otc} onChange={(e) => setOtcChecked(e.target.checked)} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
            <Boxes className="h-4 w-4" /> Available over the counter (no prescription needed)
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
            <input type="checkbox" name="prescriptionRequired" checked={rxRequired} onChange={(e) => setRxChecked(e.target.checked)} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
            <FileText className="h-4 w-4" /> Prescription required
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
            <input type="hidden" name="active" value="off" />
            <input type="checkbox" name="active" value="on" defaultChecked={defaults?.active ?? true} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
            Active (visible in catalog)
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
            <input type="checkbox" name="requiresRefrigeration" defaultChecked={defaults?.requiresRefrigeration} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
            <Snowflake className="h-4 w-4" /> Requires refrigeration
          </label>
        </div>
      </Section>

      {/* ── 5. Media & relationships ── */}
      <Section title="5. Media & relationships" icon={ImageIcon}>
        <ImageUploadField
          name="imageUrl"
          label="Main image"
          folder="medications"
          defaultValue={defaults?.imageUrl}
          hint="Upload to Cloudflare R2, or paste a public URL / local path."
        />
        <ImageUploadField
          mode="multi"
          name="imageUrls"
          label="Gallery images"
          folder="medications/gallery"
          defaultValue={defaults?.imageUrls}
          max={8}
          hint="Extra product photos. Upload files or paste public URLs."
        />

        <div>
          <label className="label-admin">Alternative medication IDs</label>
          <input
            name="alternativeIds"
            defaultValue={defaults?.alternativeIds || ""}
            placeholder="Comma-separated UUIDs of equivalent meds"
            className="input-admin font-mono text-xs"
          />
          <p className="mt-1 text-[10px] admin-soft">
            Optional list of MedicationMaster IDs shown as alternatives on the public detail page.
          </p>
        </div>

        <div>
          <label className="label-admin">Clinical tags</label>
          <ClinicalTagPicker
            options={clinicalTags}
            selected={selectedTagIds}
            onChange={setSelectedTagIds}
          />
          <p className="mt-1 text-[10px] admin-soft">
            Multi-select (Antibiotic, NSAID, etc.). {selectedTagIds.length} selected.
          </p>
        </div>

        <div>
          <label className="label-admin">Description (short summary)</label>
          <textarea name="description" rows={2} defaultValue={defaults?.description || ""} placeholder="Short one-line summary shown on the catalog card." className="input-admin resize-y" />
        </div>
      </Section>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? (
          <><span className="typing-dot" /> {needsConfirmation ? "Confirming…" : "Saving…"}</>
        ) : (
          <><Save className="h-4 w-4" /> {needsConfirmation ? "Confirm & Save medication" : "Save medication"}</>
        )}
      </button>
    </form>
  );
}

/** Multi-select picker for active ingredients (renders hidden inputs). */
function ActiveIngredientPicker({
  options,
  selected,
  onChange,
}: {
  options: ActiveIngredientOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 50);
  }, [options, query]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search active ingredients…"
        className="input-admin"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const opt = options.find((o) => o.id === id);
            if (!opt) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-accent-soft)] px-2 py-0.5 text-[10px] font-semibold admin-accent-text">
                {opt.name}
                <button type="button" onClick={() => toggle(id)} className="hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <div className="max-h-32 overflow-y-auto rounded-lg border border-[var(--admin-border-2)] bg-[var(--admin-inset)]">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-[10px] admin-soft">No active ingredients found. Add some via the lookup admin.</p>
        ) : (
          filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition hover:bg-[var(--admin-hover)] ${
                selected.includes(o.id) ? "admin-accent-text font-semibold" : "admin-muted"
              }`}
            >
              <span>{o.name}</span>
              {selected.includes(o.id) && <Check className="h-3 w-3" />}
            </button>
          ))
        )}
      </div>
      {/* Hidden inputs so the server action receives the selected ids */}
      {selected.map((id) => (
        <input key={id} type="hidden" name="activeIngredientIds" value={id} />
      ))}
    </div>
  );
}

/** Multi-select picker for clinical tags (renders hidden inputs). */
function ClinicalTagPicker({
  options,
  selected,
  onChange,
}: {
  options: ClinicalTagOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((t) => {
          const active = selected.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(active ? selected.filter((x) => x !== t.id) : [...selected, t.id])}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                active
                  ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] admin-accent-text"
                  : "border-[var(--admin-border-2)] admin-muted hover:border-[var(--admin-accent)]"
              }`}
            >
              {active && <Check className="h-3 w-3" />}
              {t.name}
            </button>
          );
        })}
      </div>
      {selected.map((id) => (
        <input key={id} type="hidden" name="clinicalTagIds" value={id} />
      ))}
    </div>
  );
}
