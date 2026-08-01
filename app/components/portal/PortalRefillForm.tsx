"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/portal";

type Rx = { id: string; medicineName: string; rxReference: string | null };

export default function PortalRefillForm({
  action,
  prescriptions,
  defaults,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  prescriptions: Rx[];
  defaults: { prescriptionId: string; medicineName: string; rxReference: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [medicine, setMedicine] = useState(defaults.medicineName);
  const [rx, setRx] = useState(defaults.rxReference);
  const [prescriptionId, setPrescriptionId] = useState(defaults.prescriptionId);

  function onSelectRx(id: string) {
    setPrescriptionId(id);
    const p = prescriptions.find((x) => x.id === id);
    if (p) {
      setMedicine(p.medicineName);
      setRx(p.rxReference || "");
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {state.error}
        </div>
      )}

      <input type="hidden" name="prescriptionId" value={prescriptionId} />

      {prescriptions.length > 0 && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Select prescription (optional)</span>
          <select
            className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
            value={prescriptionId}
            onChange={(e) => onSelectRx(e.target.value)}
          >
            <option value="">Enter manually</option>
            {prescriptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.medicineName} {p.rxReference ? `(${p.rxReference})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Medicine name *</span>
        <input
          name="medicineName"
          required
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Prescription reference</span>
        <input
          name="rxReference"
          value={rx}
          onChange={(e) => setRx(e.target.value)}
          className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
          placeholder="e.g. RX-2024-88421"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Phone</span>
          <input
            name="phone"
            defaultValue={defaults.phone}
            className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Pickup preference</span>
          <select
            name="pickupPreference"
            className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
            defaultValue="pickup"
          >
            <option value="pickup">Store pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Preferred date</span>
          <input
            name="preferredDate"
            type="date"
            className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Preferred time</span>
          <input
            name="preferredTime"
            placeholder="e.g. Morning"
            className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Notes</span>
        <textarea
          name="notes"
          rows={3}
          className="w-full rounded-2xl border border-teal-900/10 bg-white px-4 py-3 text-sm"
          placeholder="Anything the pharmacy should know?"
        />
      </label>

      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? "Submitting…" : "Submit refill request"}
      </button>
    </form>
  );
}
