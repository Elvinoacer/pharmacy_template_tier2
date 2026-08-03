"use client";

import { useActionState, useState, useEffect } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Pill, Tag, Hash, DollarSign, Package, AlertCircle, Check, Save, FileText, Boxes } from "lucide-react";

const CATEGORIES = [
  "general", "pain-relief", "antibiotics", "cardiovascular", "diabetes", "respiratory",
  "vitamins", "first-aid", "cold-flu", "skin-care", "baby-care", "womens-health",
  "mens-health", "mental-health", "digestive", "allergy",
];

type Defaults = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  description: string;
  indications: string;
  dosage: string;
  sideEffects: string;
  contraindications: string;
  storage: string;
  price: string;
  overTheCounter: boolean;
  publicListing: boolean;
  prescriptionRequired: boolean;
  stockQty: string;
  lowStockThreshold: string;
  imageUrl: string;
  active: boolean;
};

export default function MedicationFormWithDefaults({
  action,
  defaults,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: Defaults;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [name, setName] = useState(defaults.name);

  // Auto-update slug when name changes (only if slug is empty or matches the previous auto-derived value).
  const [slug, setSlug] = useState(defaults.slug);
  useEffect(() => {
    const auto = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || slug === defaults.slug) {
      setSlug(auto);
    }
  }, [name, slug, defaults.slug]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={defaults.id} />

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Medicine name *</label>
          <div className="relative">
            <Pill className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="name" required value={name} onChange={(e) => setName(e.target.value)} className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Slug</label>
          <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="input-admin font-mono" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">SKU</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="sku" defaultValue={defaults.sku} className="input-admin pl-9 font-mono" />
          </div>
        </div>
        <div>
          <label className="label-admin">Category</label>
          <select name="category" defaultValue={defaults.category} className="input-admin">
            {CATEGORIES.map((c) => (<option key={c} value={c}>{c.replace(/-/g, " ")}</option>))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-admin">Price (KES) *</label>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="price" type="number" min="0" step="0.01" required defaultValue={defaults.price} className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Stock qty</label>
          <div className="relative">
            <Package className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="stockQty" type="number" min="0" defaultValue={defaults.stockQty} className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Low stock threshold</label>
          <input name="lowStockThreshold" type="number" min="0" defaultValue={defaults.lowStockThreshold} className="input-admin" />
        </div>
      </div>

      <div>
        <label className="label-admin">Description</label>
        <textarea name="description" rows={2} defaultValue={defaults.description} className="input-admin resize-y" />
      </div>

      <div>
        <label className="label-admin">Indications (what it treats)</label>
        <textarea name="indications" rows={3} defaultValue={defaults.indications} className="input-admin resize-y" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Dosage</label>
          <input name="dosage" defaultValue={defaults.dosage} className="input-admin" />
        </div>
        <div>
          <label className="label-admin">Storage</label>
          <input name="storage" defaultValue={defaults.storage} className="input-admin" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Side effects</label>
          <textarea name="sideEffects" rows={2} defaultValue={defaults.sideEffects} className="input-admin resize-y" />
        </div>
        <div>
          <label className="label-admin">Contraindications</label>
          <textarea name="contraindications" rows={2} defaultValue={defaults.contraindications} className="input-admin resize-y" />
        </div>
      </div>

      <div>
        <label className="label-admin">Image URL</label>
        <input name="imageUrl" defaultValue={defaults.imageUrl} className="input-admin" />
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input type="checkbox" name="overTheCounter" defaultChecked={defaults.overTheCounter} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
          <Boxes className="h-4 w-4" /> Available over the counter
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input type="checkbox" name="publicListing" defaultChecked={defaults.publicListing} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
          <Tag className="h-4 w-4" /> Show on public catalog
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input type="checkbox" name="prescriptionRequired" defaultChecked={defaults.prescriptionRequired} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
          <FileText className="h-4 w-4" /> Prescription required
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input type="hidden" name="active" value="off" />
          <input type="checkbox" name="active" value="on" defaultChecked={defaults.active} className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
          Active
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Update medication</>}
      </button>
    </form>
  );
}
