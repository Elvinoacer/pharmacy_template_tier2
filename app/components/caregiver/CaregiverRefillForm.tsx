"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill, Truck, Store, Send, Loader2 } from "lucide-react";
import { toast } from "@/app/components/Toaster";

type Prescription = {
  id: string;
  medicineName: string;
  dosage: string | null;
  rxReference: string | null;
  refillsRemaining: number | null;
};

/**
 * Caregiver refill request form. Submits via /api/caregiver/refill.
 * The caregiver never approves the refill — they only submit it on the patient's behalf.
 */
export function CaregiverRefillForm({
  customerId,
  customerName,
  prescriptions,
  initialPrescriptionId,
}: {
  customerId: string;
  customerName: string;
  prescriptions: Prescription[];
  initialPrescriptionId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rxId, setRxId] = useState(() =>
    initialPrescriptionId && prescriptions.some((p) => p.id === initialPrescriptionId)
      ? initialPrescriptionId
      : (prescriptions[0]?.id ?? ""),
  );
  const [pickup, setPickup] = useState<"pickup" | "delivery">("pickup");
  const [notes, setNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rxId) {
      toast.error("Please select a prescription.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/caregiver/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          prescriptionId: rxId,
          pickupPreference: pickup,
          notes: notes.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Could not submit refill request.");
      }
      toast.success(`Refill request submitted for ${customerName}.`);
      router.push("/caregiver/refills");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit refill.");
    } finally {
      setBusy(false);
    }
  }

  if (prescriptions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e3ebe6] bg-white px-4 py-8 text-center sm:px-6 sm:py-10">
        <Pill className="mx-auto h-8 w-8 text-[#8a9a92]" />
        <p className="mt-2 text-sm font-semibold text-[#0c1a14]">No active prescriptions</p>
        <p className="mt-1 text-sm text-[#5a6b62]">
          {customerName} has no active prescriptions on file. The patient should contact the pharmacy to have one added.
        </p>
      </div>
    );
  }

  const selected = prescriptions.find((p) => p.id === rxId);

  return (
    <form onSubmit={submit} className="min-w-0 space-y-5">
      <div>
        <label className="label-premium">Prescription *</label>
        <select
          value={rxId}
          onChange={(e) => setRxId(e.target.value)}
          className="input-premium min-h-11 w-full min-w-0 text-sm"
          required
        >
          {prescriptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.medicineName}
              {p.dosage ? ` — ${p.dosage}` : ""}
              {typeof p.refillsRemaining === "number" ? ` (${p.refillsRemaining} refills left)` : ""}
            </option>
          ))}
        </select>
        {selected && (
          <p className="mt-1.5 text-sm text-[#5a6b62]">
            {selected.rxReference ? `Rx: ${selected.rxReference} · ` : ""}
            {(selected.refillsRemaining ?? 0) > 0
              ? `${selected.refillsRemaining} refills remaining.`
              : "No refills remaining — contact the pharmacy."}
          </p>
        )}
      </div>

      <div>
        <label className="label-premium">Pickup preference</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPickup("pickup")}
            className={`flex min-h-11 w-full min-w-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
              pickup === "pickup"
                ? "border-[#0d6e5a] bg-[#e6f4ef] text-[#0c1a14]"
                : "border-[#e3ebe6] bg-white text-[#5a6b62] hover:border-[#0d6e5a]/30"
            }`}
          >
            <Store className="h-4 w-4" /> Pickup at pharmacy
          </button>
          <button
            type="button"
            onClick={() => setPickup("delivery")}
            className={`flex min-h-11 w-full min-w-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
              pickup === "delivery"
                ? "border-[#0d6e5a] bg-[#e6f4ef] text-[#0c1a14]"
                : "border-[#e3ebe6] bg-white text-[#5a6b62] hover:border-[#0d6e5a]/30"
            }`}
          >
            <Truck className="h-4 w-4" /> Home delivery
          </button>
        </div>
      </div>

      <div>
        <label className="label-premium">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any context the pharmacist should know (e.g. patient travelling next week)"
          className="input-premium min-h-28 w-full min-w-0 resize-none text-sm"
          maxLength={500}
        />
      </div>

      <div className="rounded-xl bg-[#e6f4ef] px-3 py-2.5 text-sm text-[#0d6e5a]">
        Submitting on behalf of <strong>{customerName}</strong>. A pharmacist will review the request before it is prepared —
        you cannot approve it yourself.
      </div>

      <button
        type="submit"
        disabled={busy || (selected?.refillsRemaining ?? 0) <= 0}
        className="btn-primary min-h-11 w-full min-w-11 text-sm disabled:opacity-60"
      >
        {busy ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
        ) : (
          <><Send className="h-4 w-4" /> Submit refill request</>
        )}
      </button>
    </form>
  );
}
