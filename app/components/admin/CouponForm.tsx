"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions/admin";

export default function CouponForm({
  action,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {} as ActionState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {state?.success && <p className="text-sm text-teal-300">{state.success}</p>}
      <input name="code" required placeholder="Code" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <input name="description" placeholder="Description" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <div className="grid gap-3 sm:grid-cols-2">
        <select name="discountType" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <option value="percent" className="text-black">Percent</option>
          <option value="fixed" className="text-black">Fixed amount</option>
          <option value="points" className="text-black">Points</option>
        </select>
        <input name="discountValue" type="number" min="0" step="0.01" required placeholder="Discount value" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="pointsCost" type="number" min="0" placeholder="Points cost" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
        <input name="maxRedemptions" type="number" min="0" placeholder="Max redemptions" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      </div>
      <input name="validUntil" type="date" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm text-teal-100/70">
        <input type="hidden" name="active" value="off" />
        <input name="active" type="checkbox" value="on" defaultChecked className="h-4 w-4 accent-teal-400" />
        Active
      </label>
      <button type="submit" disabled={pending} className="rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-[#042f2e] disabled:opacity-50">
        {pending ? "Saving..." : "Create coupon"}
      </button>
    </form>
  );
}
