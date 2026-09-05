"use client";

import { useId } from "react";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Sparkles, FileText, AlertCircle, Check, Save, Wand2 } from "lucide-react";
import { CustomerPicker } from "@/app/components/CustomerPicker";
import { toast } from "@/app/components/Toaster";

export default function LoyaltyForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");

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
        <p className="mt-1 text-xs admin-soft">
          Searchable by name, email, or phone. Only customer accounts appear.
        </p>
      </div>

      <div>
        <label htmlFor={`${fieldPrefix}-1`} className="label-admin">Points adjustment *</label>
        <div className="relative">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input id={`${fieldPrefix}-1`}
            name="points"
            type="number"
            required
            placeholder="+50 or -25"
            className="input-admin pl-9"
          />
        </div>
        <p className="mt-1 text-xs admin-soft">
          Use positive numbers to add, negative to subtract.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="label-admin">Reason</label>
          <button
            type="button"
            onClick={() => {
              if (!customerId) {
                toast.info("Pick a customer first.");
                return;
              }
              setDescription("Manual adjustment — compensation for delayed refill");
              toast.success("Reason template filled.");
            }}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2 py-0.5 text-xs font-semibold text-white hover:brightness-110"
            title="Use a reason template"
          >
            <Wand2 className="h-2.5 w-2.5" /> Template
          </button>
        </div>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Compensation for delayed refill"
            className="input-admin pl-9"
          />
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
