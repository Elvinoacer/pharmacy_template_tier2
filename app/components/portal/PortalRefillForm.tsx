"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/portal";
import {
  Pill,
  FileText,
  Phone,
  Store,
  Truck,
  Calendar,
  Clock,
  StickyNote,
  AlertCircle,
  Send,
  Check,
} from "lucide-react";

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
  const [pickup, setPickup] = useState<"pickup" | "delivery">("pickup");

  function onSelectRx(id: string) {
    setPrescriptionId(id);
    const p = prescriptions.find((x) => x.id === id);
    if (p) {
      setMedicine(p.medicineName);
      setRx(p.rxReference || "");
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
        </div>
      )}

      <input type="hidden" name="prescriptionId" value={prescriptionId} />

      {prescriptions.length > 0 && (
        <div>
          <label className="label-premium">Prescription on file</label>
          <select
            className="input-premium"
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
          <p className="mt-1 text-xs text-[#5a6b62]">
            Pick a prescription to auto-fill the medication details.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">
            Medicine name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Pill className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="medicineName"
              required
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
              placeholder="e.g. Lisinopril 10mg"
              className="input-premium pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label-premium">Rx reference</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="rxReference"
              value={rx}
              onChange={(e) => setRx(e.target.value)}
              placeholder="RX-2024-88421"
              className="input-premium pl-9"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label-premium">Pickup preference</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPickup("pickup")}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-left transition ${
              pickup === "pickup"
                ? "border-[#0d6e5a] bg-[#e6f4ef] text-[#084c3f]"
                : "border-[#e3ebe6] hover:border-[#0d6e5a]/40"
            }`}
          >
            <Store className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Store pickup</p>
              <p className="text-[10px] text-[#5a6b62]">At any branch</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPickup("delivery")}
            className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-3 text-left transition ${
              pickup === "delivery"
                ? "border-[#0d6e5a] bg-[#e6f4ef] text-[#084c3f]"
                : "border-[#e3ebe6] hover:border-[#0d6e5a]/40"
            }`}
          >
            <Truck className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Home delivery</p>
              <p className="text-[10px] text-[#5a6b62]">To your address</p>
            </div>
          </button>
        </div>
        <input type="hidden" name="pickupPreference" value={pickup} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">Phone</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="phone"
              defaultValue={defaults.phone}
              placeholder="+1 (555) 555-5555"
              className="input-premium pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label-premium">Preferred date</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="preferredDate"
              type="date"
              className="input-premium pl-9"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label-premium">Preferred time</label>
        <div className="relative">
          <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
          <input
            name="preferredTime"
            placeholder="e.g. Morning, 9-12"
            className="input-premium pl-9"
          />
        </div>
      </div>

      <div>
        <label className="label-premium">
          Notes <span className="text-[#8a9a92]">(optional)</span>
        </label>
        <div className="relative">
          <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8a9a92]" />
          <textarea
            name="notes"
            rows={3}
            placeholder="Anything the pharmacy should know? Allergies, generic substitutions, etc."
            className="input-premium resize-y pl-9"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="typing-dot" /> Submitting…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Submit refill request
          </>
        )}
      </button>
    </form>
  );
}
