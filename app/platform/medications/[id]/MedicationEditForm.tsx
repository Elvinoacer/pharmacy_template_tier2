"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import ImageUploadField from "@/app/components/admin/ImageUploadField";

type LookupOption = { id: string; value: string };
type ManufacturerOption = { id: string; name: string };

type Props = {
  master: any;
  dosageForms: LookupOption[];
  routes: LookupOption[];
  pregnancyCategories: LookupOption[];
  manufacturers: ManufacturerOption[];
};

export function MedicationEditForm({
  master,
  dosageForms,
  routes,
  pregnancyCategories,
  manufacturers,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: master.name || "",
    genericName: master.genericName || "",
    brandName: master.brandName || "",
    strengthDisplay: master.strengthDisplay || "",
    strengthValue: master.strengthValue !== null ? String(master.strengthValue) : "",
    strengthUnit: master.strengthUnit || "",
    packSize: master.packSize || "",
    dosageFormId: master.dosageFormId || "",
    routeId: master.routeId || "",
    pregnancyCategoryId: master.pregnancyCategoryId || "",
    manufacturerId: master.manufacturerId || "",
    countryOfOrigin: master.countryOfOrigin || "",
    barcode: master.barcode || "",
    category: master.category || "general",
    status: master.status || "active",
    controlledDrug: Boolean(master.controlledDrug),
    controlledDrugSchedule: master.controlledDrugSchedule || "",
    pediatricUse: Boolean(master.pediatricUse),
    requiresRefrigeration: Boolean(master.requiresRefrigeration),
    description: master.description || "",
    indications: master.indications || "",
    dosage: master.dosage || "",
    sideEffects: master.sideEffects || "",
    contraindications: master.contraindications || "",
    storage: master.storage || "",
    clinicalNotes: master.clinicalNotes || "",
    imageUrl: master.imageUrl || "",
    imageUrls: master.imageUrls || "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.genericName.trim()) {
      toast.error("Name and generic name are required.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          name: formData.name.trim(),
          genericName: formData.genericName.trim(),
          brandName: formData.brandName.trim() || null,
          strengthDisplay: formData.strengthDisplay.trim() || null,
          strengthValue: formData.strengthValue ? Number(formData.strengthValue) : null,
          strengthUnit: formData.strengthUnit.trim() || null,
          packSize: formData.packSize.trim() || null,
          dosageFormId: formData.dosageFormId || null,
          routeId: formData.routeId || null,
          pregnancyCategoryId: formData.pregnancyCategoryId || null,
          manufacturerId: formData.manufacturerId || null,
          countryOfOrigin: formData.countryOfOrigin.trim() || null,
          barcode: formData.barcode.trim() || null,
          category: formData.category.trim() || "general",
          status: formData.status,
          controlledDrug: formData.controlledDrug,
          controlledDrugSchedule: formData.controlledDrug ? formData.controlledDrugSchedule.trim() || null : null,
          pediatricUse: formData.pediatricUse,
          requiresRefrigeration: formData.requiresRefrigeration,
          description: formData.description.trim() || null,
          indications: formData.indications.trim() || null,
          dosage: formData.dosage.trim() || null,
          sideEffects: formData.sideEffects.trim() || null,
          contraindications: formData.contraindications.trim() || null,
          storage: formData.storage.trim() || null,
          clinicalNotes: formData.clinicalNotes.trim() || null,
          imageUrl: formData.imageUrl.trim() || null,
          imageUrls: formData.imageUrls.trim() || null,
        };

        const res = await fetch(`/api/platform/medications/${master.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to update medication.");
        }

        toast.success("Canonical medication updated successfully.");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Update failed.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Primary Clinical Identity */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-shadow)]">
        <h3 className="text-base font-semibold text-[var(--admin-text)]">Canonical Clinical Identity</h3>
        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
          Standardized pharmacology details used across the whole platform.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Medicine Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Generic Name (INN) *</label>
            <input
              type="text"
              name="genericName"
              required
              value={formData.genericName}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Brand Name / Equivalents</label>
            <input
              type="text"
              name="brandName"
              value={formData.brandName}
              onChange={handleChange}
              placeholder="e.g. Panadol, Calpol"
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Dosage Form</label>
            <select
              name="dosageFormId"
              value={formData.dosageFormId}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="">Select dosage form...</option>
              {dosageForms.map((df) => (
                <option key={df.id} value={df.id}>
                  {df.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Route of Administration</label>
            <select
              name="routeId"
              value={formData.routeId}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="">Select route...</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Strength Display</label>
            <input
              type="text"
              name="strengthDisplay"
              value={formData.strengthDisplay}
              onChange={handleChange}
              placeholder="e.g. 500 mg, 10 mg/5ml"
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Numeric Strength Value</label>
            <input
              type="number"
              step="any"
              name="strengthValue"
              value={formData.strengthValue}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Strength Unit</label>
            <input
              type="text"
              name="strengthUnit"
              value={formData.strengthUnit}
              onChange={handleChange}
              placeholder="mg, ml, mcg"
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Pack Size</label>
            <input
              type="text"
              name="packSize"
              value={formData.packSize}
              onChange={handleChange}
              placeholder="e.g. 10 tablets, 100ml"
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Barcode (GTIN / EAN)</label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              placeholder="Barcode digits"
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Manufacturer</label>
            <select
              name="manufacturerId"
              value={formData.manufacturerId}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="">Select manufacturer...</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Category Key</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Lifecycle & Safety Governance */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-shadow)]">
        <h3 className="text-base font-semibold text-[var(--admin-text)]">Lifecycle & Regulatory Governance</h3>
        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
          Canonical lifecycle status and controlled-substance classifications.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Canonical Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm font-semibold text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="active">Active (available for pharmacy adoption)</option>
              <option value="needs_review">Needs review (flagged / ambiguous match)</option>
              <option value="deprecated">Deprecated (phasing out)</option>
              <option value="archived">Archived (historical / merged)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Pregnancy Category</label>
            <select
              name="pregnancyCategoryId"
              value={formData.pregnancyCategoryId}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            >
              <option value="">Select category...</option>
              {pregnancyCategories.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.value}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--admin-text)]">
              <input
                type="checkbox"
                name="controlledDrug"
                checked={formData.controlledDrug}
                onChange={handleChange}
                className="rounded border-[var(--admin-border)]"
              />
              Controlled drug (Requires schedule)
            </label>

            {formData.controlledDrug && (
              <input
                type="text"
                name="controlledDrugSchedule"
                value={formData.controlledDrugSchedule}
                onChange={handleChange}
                placeholder="Schedule (e.g. Schedule 2, Schedule 3)"
                className="w-full rounded-xl border border-amber-500/40 bg-[var(--admin-panel)] px-3 py-1.5 text-xs text-[var(--admin-text)]"
              />
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--admin-text)]">
              <input
                type="checkbox"
                name="requiresRefrigeration"
                checked={formData.requiresRefrigeration}
                onChange={handleChange}
                className="rounded border-[var(--admin-border)]"
              />
              Requires refrigeration (Cold chain)
            </label>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--admin-text)]">
              <input
                type="checkbox"
                name="pediatricUse"
                checked={formData.pediatricUse}
                onChange={handleChange}
                className="rounded border-[var(--admin-border)]"
              />
              Pediatric formulation / use
            </label>
          </div>
        </div>
      </div>

      {/* Clinical Notes & Pharmacology Text */}
      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-shadow)]">
        <h3 className="text-base font-semibold text-[var(--admin-text)]">Clinical Texts & Leaflet Information</h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Indications</label>
            <textarea
              name="indications"
              rows={3}
              value={formData.indications}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-2.5 text-xs text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Dosage & Administration</label>
            <textarea
              name="dosage"
              rows={3}
              value={formData.dosage}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-2.5 text-xs text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Side Effects</label>
            <textarea
              name="sideEffects"
              rows={3}
              value={formData.sideEffects}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-2.5 text-xs text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Contraindications</label>
            <textarea
              name="contraindications"
              rows={3}
              value={formData.contraindications}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-2.5 text-xs text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text)]">Storage Instructions</label>
            <textarea
              name="storage"
              rows={2}
              value={formData.storage}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-2.5 text-xs text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <ImageUploadField
              name="imageUrl"
              label="Main medicine image"
              folder="medications"
              defaultValue={formData.imageUrl}
              onChange={(imageUrl) => setFormData((prev) => ({ ...prev, imageUrl }))}
              hint="Upload a medicine pack image to R2, paste an http(s) image URL, or use a site-relative /images/... path."
            />
          </div>

          <div className="sm:col-span-2">
            <ImageUploadField
              mode="multi"
              name="imageUrls"
              label="Medicine gallery"
              folder="medications"
              defaultValue={formData.imageUrls}
              onChange={(imageUrls) => setFormData((prev) => ({ ...prev, imageUrls }))}
              hint="Optional additional pack or leaflet images. Up to 8 images."
            />
          </div>
        </div>
      </div>

      {/* Form Submission */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-2 text-sm font-medium text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--admin-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Canonical Record
        </button>
      </div>
    </form>
  );
}
