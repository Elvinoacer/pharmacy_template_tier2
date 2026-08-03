"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Pill, FileText, Calendar, DollarSign, AlertCircle, Check, Save, Hash, Boxes, Tag } from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { MedicationPicker, type MedicationOption } from "@/app/components/MedicationPicker";

/**
 * Prescription creation / edit form.
 *
 * Per the spec, prescriptions are created by admins (never customers) and
 * must be linked to the medication catalogue so we don't duplicate medicine
 * entries. Selecting a medication auto-populates medicine name, Rx reference
 * (from SKU), dosage, and unit price.
 *
 * Stock is NOT deducted on prescription creation — only when an admin
 * explicitly dispatches the prescription from the detail page.
 */
export default function PrescriptionForm({
  action,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: {
    id: string;
    customerId: string;
    medicationId: string | null;
    medicineName: string;
    rxReference: string | null;
    dosage: string | null;
    schedule: string | null;
    quantity: number | null;
    daysSupply: number | null;
    refillsRemaining: number | null;
    unitPrice: number | null;
    status: string;
    nextRefillDue: string | null;
    endDate: string | null;
    prescriber: string | null;
    notes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [medicationId, setMedicationId] = useState(initial?.medicationId ?? "");
  const [medicineName, setMedicineName] = useState(initial?.medicineName ?? "");
  const [rxReference, setRxReference] = useState(initial?.rxReference ?? "");
  const [dosage, setDosage] = useState(initial?.dosage ?? "");
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice?.toString() ?? "");

  function onMedicationSelected(m: MedicationOption | null) {
    if (!m) {
      setMedicationId("");
      return;
    }
    setMedicationId(m.id);
    // Auto-populate fields from the medication catalogue row.
    if (!medicineName || medicineName !== m.name) setMedicineName(m.name);
    // Use SKU as Rx reference if the prescription doesn't already have one.
    if (!rxReference && m.sku) setRxReference(m.sku);
    if (!dosage && m.dosage) setDosage(m.dosage);
    if (!unitPrice) setUnitPrice(m.price.toString());
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

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label className="label-admin">Customer *</label>
        <CustomerPicker
          name="customerId"
          value={customerId}
          onChange={setCustomerId}
          variant="admin"
          required
        />
      </div>

      {/* Medication picker — replaces free-text medicineName. */}
      <div>
        <label className="label-admin">Medication from catalogue *</label>
        <MedicationPicker
          name="medicationId"
          value={medicationId}
          onChange={onMedicationSelected}
          variant="admin"
          required
          placeholder="Search medication by name, SKU, or category…"
        />
        <p className="mt-1 text-[10px] admin-soft">
          Selecting a medication auto-fills medicine name, Rx reference, dosage, and unit price
          from the catalogue. Stock is <strong>not</strong> deducted at this stage — only when
          you dispatch the prescription from its detail page.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Medicine name *</label>
          <div className="relative">
            <Pill className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="medicineName"
              required
              value={medicineName}
              onChange={(e) => setMedicineName(e.target.value)}
              placeholder="Lisinopril 10mg"
              className="input-admin pl-9"
            />
          </div>
          <p className="mt-1 text-[10px] admin-soft">
            Auto-filled from the catalogue. Edit only if you need a custom label.
          </p>
        </div>
        <div>
          <label className="label-admin">Rx reference</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="rxReference"
              value={rxReference}
              onChange={(e) => setRxReference(e.target.value)}
              placeholder="RX-2024-88421"
              className="input-admin pl-9 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Dosage</label>
          <input
            name="dosage"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="10mg tablet"
            className="input-admin"
          />
        </div>
        <div>
          <label className="label-admin">Schedule</label>
          <input name="schedule" defaultValue={initial?.schedule ?? ""} placeholder="1 tablet twice daily after meals" className="input-admin" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label-admin">Quantity</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="quantity" type="number" min="0" defaultValue={initial?.quantity ?? ""} placeholder="30" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Days supply</label>
          <input name="daysSupply" type="number" min="0" defaultValue={initial?.daysSupply ?? ""} placeholder="30" className="input-admin" />
        </div>
        <div>
          <label className="label-admin">Refills remaining</label>
          <input name="refillsRemaining" type="number" min="0" defaultValue={initial?.refillsRemaining ?? 0} className="input-admin" />
        </div>
        <div>
          <label className="label-admin">Unit price (KES)</label>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="500"
              className="input-admin pl-9"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-admin">Status</label>
          <select name="status" className="input-admin" defaultValue={initial?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="expired">Expired</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
        <div>
          <label className="label-admin">Next refill due</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="nextRefillDue" type="date" defaultValue={initial?.nextRefillDue?.slice(0, 10) ?? ""} className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">End date (course termination)</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="endDate" type="date" defaultValue={initial?.endDate?.slice(0, 10) ?? ""} className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Prescriber</label>
        <input name="prescriber" defaultValue={initial?.prescriber ?? ""} placeholder="Dr. Jane Doe" className="input-admin" />
      </div>

      <div>
        <label className="label-admin">Notes</label>
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} placeholder="Internal notes (visible to staff only)…" className="input-admin resize-y" />
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3 text-[10px] admin-soft">
        <p className="mb-1 font-semibold admin-text">
          <Boxes className="mr-1 inline h-3 w-3" /> Stock workflow
        </p>
        Creating a prescription does <strong>not</strong> affect inventory. After the customer
        collects, open the prescription detail page and click{" "}
        <Tag className="inline h-2.5 w-2.5" /> Dispatch — only then will stock be deducted.
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> {initial?.id ? "Update prescription" : "Create prescription"}</>}
      </button>
    </form>
  );
}
