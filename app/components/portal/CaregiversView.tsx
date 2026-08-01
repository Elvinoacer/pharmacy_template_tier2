"use client";

import { useActionState } from "react";
import { addCaregiverAction, removeCaregiverAction, type ActionState } from "@/app/actions/portal";

type Caregiver = {
  id: string;
  caregiverName: string;
  caregiverEmail: string | null;
  caregiverPhone: string | null;
  relationship: string | null;
  canRequestRefills: boolean;
  canReceivePickupNotifications: boolean;
  status: string;
};

export function CaregiversView({ caregivers }: { caregivers: Caregiver[] }) {
  const [state, formAction, pending] = useActionState(addCaregiverAction, {} as ActionState);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-teal-900/8 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Authorised caregivers</h2>
        {caregivers.filter((c) => c.status === "active").length === 0 ? (
          <p className="text-sm text-[#5a6b62]">No caregivers added yet.</p>
        ) : (
          <ul className="space-y-3">
            {caregivers
              .filter((c) => c.status === "active")
              .map((c) => (
                <li key={c.id} className="rounded-2xl border border-teal-900/8 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{c.caregiverName}</p>
                      <p className="text-xs text-[#5a6b62]">
                        {c.relationship || "Caregiver"} · {c.caregiverPhone || c.caregiverEmail || "—"}
                      </p>
                      <p className="mt-1 text-xs text-[#5a6b62]">
                        Refills: {c.canRequestRefills ? "Yes" : "No"} · Pickup alerts:{" "}
                        {c.canReceivePickupNotifications ? "Yes" : "No"}
                      </p>
                    </div>
                    <form action={removeCaregiverAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-xs text-rose-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-teal-900/8 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Add caregiver</h2>
        {state?.error && <p className="mb-3 text-sm text-rose-700">{state.error}</p>}
        {state?.success && <p className="mb-3 text-sm text-teal-700">{state.success}</p>}
        <form action={formAction} className="space-y-3">
          <input
            name="caregiverName"
            required
            placeholder="Full name"
            className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm"
          />
          <input
            name="relationship"
            placeholder="Relationship (e.g. Spouse)"
            className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm"
          />
          <input
            name="caregiverEmail"
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm"
          />
          <input
            name="caregiverPhone"
            type="tel"
            placeholder="Phone"
            className="w-full rounded-2xl border border-teal-900/10 px-4 py-3 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="canRequestRefills" defaultChecked /> Authorise refill requests
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="canReceivePickupNotifications" defaultChecked /> Pickup
            notifications
          </label>
          <button
            type="submit"
            disabled={pending}
            className="btn-primary !py-2.5 text-sm disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add caregiver"}
          </button>
        </form>
      </section>
    </div>
  );
}
