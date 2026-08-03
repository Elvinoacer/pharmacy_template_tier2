"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Pill, FileText, Calendar, DollarSign, AlertCircle, Check, Save, Hash } from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";

export default function PrescriptionForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState("");

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Medicine name *</label>
          <div className="relative">
            <Pill className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="medicineName" required placeholder="Lisinopril 10mg" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Rx reference</label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="rxReference" placeholder="RX-2024-88421" className="input-admin pl-9 font-mono" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Dosage</label>
          <input name="dosage" placeholder="10mg tablet" className="input-admin" />
        </div>
        <div>
          <label className="label-admin">Schedule</label>
          <input name="schedule" placeholder="1 tablet twice daily after meals" className="input-admin" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label-admin">Quantity</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="quantity" type="number" min="0" placeholder="30" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Days supply</label>
          <input name="daysSupply" type="number" min="0" placeholder="30" className="input-admin" />
        </div>
        <div>
          <label className="label-admin">Refills remaining</label>
          <input name="refillsRemaining" type="number" min="0" defaultValue={0} className="input-admin" />
        </div>
        <div>
          <label className="label-admin">Unit price (KES)</label>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="unitPrice" type="number" min="0" step="0.01" placeholder="500" className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-admin">Status</label>
          <select name="status" className="input-admin" defaultValue="active">
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
            <input name="nextRefillDue" type="date" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">End date (course termination)</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="endDate" type="date" className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Prescriber</label>
        <input name="prescriber" placeholder="Dr. Jane Doe" className="input-admin" />
      </div>

      <div>
        <label className="label-admin">Notes</label>
        <textarea name="notes" rows={3} placeholder="Internal notes (visible to staff only)…" className="input-admin resize-y" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Create prescription</>}
      </button>
    </form>
  );
}

