"use client";

import { useActionState, useEffect, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { toast } from "@/app/components/Toaster";
import { Pill, Tag, Hash, DollarSign, Package, AlertCircle, Check, Save, FileText, Boxes } from "lucide-react";

const CATEGORIES = [
  "general",
  "pain-relief",
  "antibiotics",
  "cardiovascular",
  "diabetes",
  "respiratory",
  "vitamins",
  "first-aid",
  "cold-flu",
  "skin-care",
  "baby-care",
  "womens-health",
  "mens-health",
  "mental-health",
  "digestive",
  "allergy",
];

export default function MedicationForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [otc, setOtc] = useState(false);
  const [rxRequired, setRxRequired] = useState(true);

  // Keep slug in sync with name until the user edits it manually.
  useEffect(() => {
    if (!slugTouched) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [name, slugTouched]);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setName("");
      setSlug("");
      setSlugTouched(false);
      setOtc(false);
      setRxRequired(true);
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  function setOtcChecked(checked: boolean) {
    setOtc(checked);
    // Mutual exclusivity: OTC means no prescription required, and vice versa.
    if (checked) setRxRequired(false);
  }

  function setRxChecked(checked: boolean) {
    setRxRequired(checked);
    if (checked) setOtc(false);
  }

  return (
    <form action={formAction} className="space-y-4">
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
          <label className="label-admin">Slug (auto)</label>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">SKU</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="sku" placeholder="PARA-500" className="input-admin pl-9 font-mono" />
          </div>
        </div>
        <div>
          <label className="label-admin">Category</label>
          <select name="category" className="input-admin" defaultValue="general">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/-/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-admin">Price (KES) *</label>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="price" type="number" min="0" step="0.01" required defaultValue={0} className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Stock qty</label>
          <div className="relative">
            <Package className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="stockQty" type="number" min="0" defaultValue={0} className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Low stock threshold</label>
          <input name="lowStockThreshold" type="number" min="0" defaultValue={10} className="input-admin" />
        </div>
      </div>

      <div>
        <label className="label-admin">Description</label>
        <textarea name="description" rows={2} placeholder="Short one-line summary shown on the catalog card." className="input-admin resize-y" />
      </div>

      <div>
        <label className="label-admin">Indications (what it treats)</label>
        <textarea name="indications" rows={3} placeholder="Markdown supported. e.g. 'Used for mild to moderate pain, fever, headaches…'" className="input-admin resize-y" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Dosage</label>
          <input name="dosage" placeholder="1-2 tablets every 4-6 hours, max 8 in 24h" className="input-admin" />
        </div>
        <div>
          <label className="label-admin">Storage</label>
          <input name="storage" placeholder="Store below 25°C, keep dry" className="input-admin" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Side effects</label>
          <textarea name="sideEffects" rows={2} placeholder="Nausea, rash, liver issues with prolonged use…" className="input-admin resize-y" />
        </div>
        <div>
          <label className="label-admin">Contraindications</label>
          <textarea name="contraindications" rows={2} placeholder="Not for patients with liver disease or taking warfarin…" className="input-admin resize-y" />
        </div>
      </div>

      <div>
        <label className="label-admin">Image URL</label>
        <input name="imageUrl" placeholder="/images/otc/pain-relief.webp or R2 URL" className="input-admin" />
        <p className="mt-1 text-[10px] admin-soft">
          Paste a public image URL (Cloudflare R2, CDN, or /public path). Upload tooling can be wired via R2 env vars.
        </p>
      </div>

      <div>
        <label className="label-admin">Additional image URLs (gallery)</label>
        <input
          name="imageUrls"
          placeholder="Comma-separated extra image URLs"
          className="input-admin"
        />
      </div>

      <div>
        <label className="label-admin">Alternative medication IDs</label>
        <input
          name="alternativeIds"
          placeholder="Comma-separated UUIDs of equivalent/alternative meds"
          className="input-admin font-mono text-xs"
        />
        <p className="mt-1 text-[10px] admin-soft">
          Optional list of catalogue IDs shown as alternatives on the public detail page.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input
            type="checkbox"
            name="overTheCounter"
            checked={otc}
            onChange={(e) => setOtcChecked(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text"
          />
          <Boxes className="h-4 w-4" /> Available over the counter (no prescription needed)
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input type="checkbox" name="publicListing" className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
          <Tag className="h-4 w-4" /> Show on public catalog (no login required)
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input
            type="checkbox"
            name="prescriptionRequired"
            checked={rxRequired}
            onChange={(e) => setRxChecked(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text"
          />
          <FileText className="h-4 w-4" /> Prescription required
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
          <input type="hidden" name="active" value="off" />
          <input type="checkbox" name="active" value="on" defaultChecked className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text" />
          Active (visible in catalog)
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Save medication</>}
      </button>
    </form>
  );
}
