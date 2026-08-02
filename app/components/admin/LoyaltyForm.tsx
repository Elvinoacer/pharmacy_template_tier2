"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Users, Sparkles, FileText, AlertCircle, Check, Save } from "lucide-react";

export default function LoyaltyForm({
  action,
  customers,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  customers: { id: string; fullName: string; points: number }[];
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

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
        <div className="relative">
          <Users className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <select name="customerId" required className="input-admin pl-9" defaultValue="">
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.points} pts)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label-admin">Points adjustment *</label>
        <div className="relative">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="points"
            type="number"
            required
            placeholder="+50 or -25"
            className="input-admin pl-9"
          />
        </div>
        <p className="mt-1 text-[10px] admin-soft">
          Use positive numbers to add, negative to subtract.
        </p>
      </div>

      <div>
        <label className="label-admin">Reason</label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="description" placeholder="e.g. Compensation for delayed refill" className="input-admin pl-9" />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Adjust points</>}
      </button>
    </form>
  );
}
