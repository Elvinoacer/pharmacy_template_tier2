"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState } from "react";
import type { SharedMedicationActionState } from "@/app/actions/shared-medications";
import { toast } from "@/app/components/Toaster";
import ImageUploadField from "@/app/components/admin/ImageUploadField";
import type { ValidationResult } from "@/app/lib/services/medication-validation";
import {
  AlertCircle,
  Barcode,
  Boxes,
  Check,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  MapPin,
  Package,
  Pill,
  Save,
  Sparkles,
} from "lucide-react";

type LookupOption = { id: string; value: string; slug: string };
type CategoryOption = { slug: string; name: string };

type Props = {
  action: (
    prev: SharedMedicationActionState,
    formData: FormData,
  ) => Promise<SharedMedicationActionState>;
  dosageForms?: LookupOption[];
  categories?: CategoryOption[];
};

type Access = "otc" | "rx";

/**
 * The high-frequency medication entry path. It submits the same complete
 * medication payload as MedicationForm, but only asks staff for the fields
 * needed to get a medicine onto the shelf quickly.
 */
export default function QuickMedicationForm({ action, dosageForms = [], categories = [] }: Props) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as SharedMedicationActionState);
  const [access, setAccess] = useState<Access>("rx");
  const validation = state?.validation as unknown as ValidationResult | undefined;
  const needsConfirmation = Boolean(state?.needsConfirmation);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="acquisitionMethod" value="manual" />
      <input type="hidden" name="active" value="on" />
      <input type="hidden" name="lowStockThreshold" value="10" />
      {needsConfirmation && <input type="hidden" name="confirmed" value="true" />}

      {state?.error && (
        <div className="admin-alert-error">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="admin-alert-success">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      {needsConfirmation && validation && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" /> Review before saving
          </p>
          <p className="mt-1 text-sm leading-5 text-amber-700/80 dark:text-amber-400/80">
            We found {validation.counts.flag} possible issue(s). Confirm below if this is the correct pack.
          </p>
          <ul className="mt-3 space-y-1.5">
            {validation.checks
              .filter((check) => check.severity === "flag")
              .map((check) => (
                <li key={check.rule} className="text-sm text-[var(--admin-text)]">
                  <strong>{check.label}:</strong> {check.message}
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="admin-eyebrow mb-1 text-emerald-700 dark:text-emerald-300">Fast entry</p>
            <h2 className="text-lg font-bold admin-text">Add the essentials, fill in the rest later</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 admin-muted">
              This creates the medicine and your stock record in one step. Duplicate checks still run before save.
            </p>
          </div>
          <Link
            href="/admin/medications/new?mode=full"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] px-3 text-sm font-semibold admin-muted transition hover:border-emerald-500/40 hover:admin-text"
          >
            Full details <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,.85fr)]">
        <section className="space-y-4 rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 sm:p-5" aria-labelledby={`${fieldPrefix}-details-heading`}>
          <div className="flex items-center gap-2 border-b border-[var(--admin-border-2)] pb-3">
            <Pill className="h-4 w-4 admin-accent-text" />
            <h2 id={`${fieldPrefix}-details-heading`} className="text-sm font-bold admin-text">Medicine details</h2>
            <span className="ml-auto text-sm admin-soft">* required</span>
          </div>

          <div>
            <label htmlFor={`${fieldPrefix}-name`} className="label-admin !text-sm">Medicine name *</label>
            <input
              id={`${fieldPrefix}-name`}
              name="name"
              required
              autoFocus
              autoComplete="off"
              placeholder="e.g. Panadol 500mg"
              className="input-admin min-h-12 text-base"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${fieldPrefix}-generic`} className="label-admin !text-sm">Generic / active ingredient *</label>
              <input
                id={`${fieldPrefix}-generic`}
                name="genericName"
                required
                placeholder="e.g. Paracetamol"
                className="input-admin"
              />
            </div>
            <div>
              <label htmlFor={`${fieldPrefix}-form`} className="label-admin !text-sm">Dosage form *</label>
              <select id={`${fieldPrefix}-form`} name="dosageFormId" required className="input-admin">
                <option value="">Choose form…</option>
                {dosageForms.map((form) => (
                  <option key={form.id} value={form.id}>{form.value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={`${fieldPrefix}-strength`} className="label-admin !text-sm">Strength</label>
              <input id={`${fieldPrefix}-strength`} name="strengthDisplay" placeholder="500 mg" className="input-admin" />
            </div>
            <div>
              <label htmlFor={`${fieldPrefix}-pack`} className="label-admin !text-sm">Pack size</label>
              <input id={`${fieldPrefix}-pack`} name="packSize" placeholder="20 tablets" className="input-admin" />
            </div>
            <div>
              <label htmlFor={`${fieldPrefix}-price`} className="label-admin !text-sm">Selling price (KES)</label>
              <input id={`${fieldPrefix}-price`} name="price" type="number" min="0" step="0.01" defaultValue="0" className="input-admin" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${fieldPrefix}-stock`} className="label-admin !text-sm">Opening stock</label>
              <div className="relative">
                <Package className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
                <input id={`${fieldPrefix}-stock`} name="currentStock" type="number" min="0" defaultValue="0" className="input-admin pl-9" />
              </div>
            </div>
            <fieldset>
              <legend className="label-admin !text-sm">Access</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${access === "otc" ? "border-emerald-500/50 bg-emerald-500/10 admin-accent-text" : "border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-muted"}`}>
                  <input type="radio" name="access" value="otc" checked={access === "otc"} onChange={() => setAccess("otc")} className="sr-only" />
                  <Boxes className="h-3.5 w-3.5" /> OTC
                </label>
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${access === "rx" ? "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300" : "border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-muted"}`}>
                  <input type="radio" name="access" value="rx" checked={access === "rx"} onChange={() => setAccess("rx")} className="sr-only" />
                  <FileText className="h-3.5 w-3.5" /> Prescription
                </label>
              </div>
              <input type="hidden" name="overTheCounter" value={access === "otc" ? "on" : "off"} />
              <input type="hidden" name="prescriptionRequired" value={access === "rx" ? "on" : "off"} />
            </fieldset>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)] p-4 sm:p-5" aria-labelledby={`${fieldPrefix}-image-heading`}>
          <div className="flex items-center gap-2 border-b border-[var(--admin-border-2)] pb-3">
            <ImageIcon className="h-4 w-4 admin-accent-text" />
            <h2 id={`${fieldPrefix}-image-heading`} className="text-sm font-bold admin-text">Pack image</h2>
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">Recommended</span>
          </div>
          <p className="text-sm leading-5 admin-muted">Take a photo of the pack or upload one now so staff and patients can recognise it faster.</p>
          <ImageUploadField
            name="imageUrl"
            label="Medicine image"
            folder="medications"
            hint="Upload a pack photo or paste an image URL."
          />
        </section>
      </div>

      <details className="group rounded-2xl border border-[var(--admin-border-2)] bg-[var(--admin-card)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold admin-text">
          <Sparkles className="h-4 w-4 admin-accent-text" /> Optional details for later
          <ChevronDown className="ml-auto h-4 w-4 admin-soft transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 border-t border-[var(--admin-border-2)] p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <label htmlFor={`${fieldPrefix}-barcode`} className="label-admin !text-sm">Barcode</label>
            <div className="relative">
              <Barcode className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input id={`${fieldPrefix}-barcode`} name="barcode" inputMode="numeric" placeholder="Scan or type EAN/GTIN" className="input-admin pl-9 font-mono" />
            </div>
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-brand`} className="label-admin !text-sm">Brand name</label>
            <input id={`${fieldPrefix}-brand`} name="brandName" placeholder="e.g. Panadol" className="input-admin" />
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-sku`} className="label-admin !text-sm">Internal SKU</label>
            <input id={`${fieldPrefix}-sku`} name="sku" placeholder="Optional stock code" className="input-admin" />
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-shelf`} className="label-admin !text-sm">Shelf location</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input id={`${fieldPrefix}-shelf`} name="shelfLocation" placeholder="Aisle 3 / B-12" className="input-admin pl-9" />
            </div>
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-supplier`} className="label-admin !text-sm">Supplier</label>
            <input id={`${fieldPrefix}-supplier`} name="supplier" placeholder="Optional supplier" className="input-admin" />
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-category`} className="label-admin !text-sm">Category</label>
            <select id={`${fieldPrefix}-category`} name="category" defaultValue="general" className="input-admin">
              {(categories.length ? categories : [{ slug: "general", name: "General" }]).map((category) => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--admin-inset)] px-3 text-sm font-medium admin-muted sm:col-span-2">
            <input type="checkbox" name="publicListing" className="h-4 w-4 rounded border-[var(--admin-border-2)] admin-accent-text" />
            List this medicine on the public catalogue now
          </label>
        </div>
      </details>

      <button type="submit" disabled={pending} className="btn-admin !text-sm w-full !rounded-xl py-3 text-sm disabled:opacity-50">
        {pending ? <><span className="typing-dot" /> Saving medicine…</> : <><Save className="h-4 w-4" /> {needsConfirmation ? "Confirm & save medicine" : "Save medicine"}</>}
      </button>
    </form>
  );
}
