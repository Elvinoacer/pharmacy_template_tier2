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
  Info,
} from "lucide-react";

type Rx = {
  id: string;
  medicineName: string;
  rxReference: string | null;
  refillsRemaining: number | null;
};

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
  const refillable = prescriptions.filter((p) => (p.refillsRemaining ?? 0) > 0);
  const exhausted = prescriptions.filter((p) => (p.refillsRemaining ?? 0) <= 0);

  const initialId =
    defaults.prescriptionId && refillable.some((p) => p.id === defaults.prescriptionId)
      ? defaults.prescriptionId
      : refillable[0]?.id || "";

  const [prescriptionId, setPrescriptionId] = useState(initialId);
  const selected = refillable.find((p) => p.id === prescriptionId) || null;
  const [pickup, setPickup] = useState<"pickup" | "delivery">("pickup");

  // No prescriptions on file at all
  if (prescriptions.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">No prescription on file</p>
            <p className="mt-1 text-xs text-amber-800">
              You need an active prescription recorded by the pharmacy before you can request a refill.
              Please visit the pharmacy or contact us so a pharmacist can add your medication to your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // All prescriptions have 0 refills remaining
  if (refillable.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">No refills remaining</p>
            <p className="mt-1 text-xs text-amber-800">
              All of your prescriptions have 0 refills left. Contact the pharmacy or your doctor for a new prescription.
            </p>
            {exhausted.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {exhausted.map((p) => (
                  <li key={p.id} className="text-amber-800">
                    · {p.medicineName}{p.rxReference ? ` (${p.rxReference})` : ""} — 0 refills
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
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
      {/* Server re-derives medicine details from the prescription — these are display-only snapshots */}
      <input type="hidden" name="medicineName" value={selected?.medicineName || ""} />
      <input type="hidden" name="rxReference" value={selected?.rxReference || ""} />

      <div>
        <label className="label-premium">
          Prescription on file <span className="text-rose-500">*</span>
        </label>
        <select
          className="input-premium"
          value={prescriptionId}
          onChange={(e) => setPrescriptionId(e.target.value)}
          required
        >
          {refillable.map((p) => (
            <option key={p.id} value={p.id}>
              {p.medicineName}
              {p.rxReference ? ` (${p.rxReference})` : ""}
              {` — ${p.refillsRemaining} refill${p.refillsRemaining === 1 ? "" : "s"} left`}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[#5a6b62]">
          Only prescriptions with remaining refills can be selected. Medicine details are locked to the prescription on file.
        </p>
        {exhausted.length > 0 && (
          <p className="mt-1 text-xs text-amber-700">
            {exhausted.length} prescription{exhausted.length === 1 ? "" : "s"} hidden (0 refills remaining).
          </p>
        )}
      </div>

      {selected && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-premium">Medicine</label>
            <div className="relative">
              <Pill className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
              <input
                readOnly
                value={selected.medicineName}
                className="input-premium pl-9 bg-[#f4f7f4] text-[#5a6b62]"
              />
            </div>
          </div>
          <div>
            <label className="label-premium">Rx reference</label>
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
              <input
                readOnly
                value={selected.rxReference || "—"}
                className="input-premium pl-9 bg-[#f4f7f4] text-[#5a6b62]"
              />
            </div>
          </div>
        </div>
      )}

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
              placeholder="+254 7XX XXX XXX"
              className="input-premium pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label-premium">Preferred date</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input name="preferredDate" type="date" className="input-premium pl-9" />
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
        disabled={pending || !prescriptionId}
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
