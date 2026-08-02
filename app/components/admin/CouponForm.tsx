"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Tag, Sparkles, Hash, Calendar, AlertCircle, Check, Save } from "lucide-react";

export default function CouponForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
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
        <label className="label-admin">Coupon code *</label>
        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="code" required placeholder="SUMMER25" className="input-admin pl-9 font-mono uppercase" />
        </div>
      </div>

      <div>
        <label className="label-admin">Description</label>
        <input name="description" placeholder="25% off summer essentials" className="input-admin" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Discount type</label>
          <select name="discountType" className="input-admin" defaultValue="percent">
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed amount ($)</option>
            <option value="points">Bonus points</option>
          </select>
        </div>
        <div>
          <label className="label-admin">Discount value *</label>
          <input name="discountValue" type="number" min="0" step="0.01" required placeholder="25" className="input-admin" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-admin">Points cost</label>
          <div className="relative">
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="pointsCost" type="number" min="0" placeholder="100" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Max redemptions</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input name="maxRedemptions" type="number" min="0" placeholder="Unlimited" className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Valid until</label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
          <input name="validUntil" type="date" className="input-admin pl-9" />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm admin-muted hover:text-[var(--admin-text)]">
        <input type="hidden" name="active" value="off" />
        <input name="active" type="checkbox" value="on" defaultChecked className="h-4 w-4 rounded border-[var(--admin-border-2)] bg-[var(--admin-inset)] admin-accent-text focus:ring-[var(--admin-accent)]" />
        Active (customers can redeem immediately)
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn-admin w-full !rounded-xl py-2.5 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Create coupon</>}
      </button>
    </form>
  );
}
