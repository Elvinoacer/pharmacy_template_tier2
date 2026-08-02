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
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.error}</span>
        </div>
      )}
      {state?.success && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{state.success}</span>
        </div>
      )}

      <div>
        <label className="label-admin">Coupon code *</label>
        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
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
            <option value="percent" className="bg-[#122620]">Percent (%)</option>
            <option value="fixed" className="bg-[#122620]">Fixed amount ($)</option>
            <option value="points" className="bg-[#122620]">Bonus points</option>
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
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
            <input name="pointsCost" type="number" min="0" placeholder="100" className="input-admin pl-9" />
          </div>
        </div>
        <div>
          <label className="label-admin">Max redemptions</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
            <input name="maxRedemptions" type="number" min="0" placeholder="Unlimited" className="input-admin pl-9" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-admin">Valid until</label>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#ecfdf5]/30" />
          <input name="validUntil" type="date" className="input-admin pl-9" />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#ecfdf5]/70 hover:text-white">
        <input type="hidden" name="active" value="off" />
        <input name="active" type="checkbox" value="on" defaultChecked className="h-4 w-4 rounded border-white/20 bg-white/[0.04] text-[#2dd4bf] focus:ring-[#2dd4bf]" />
        Active (customers can redeem immediately)
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#0f766e] px-4 py-2.5 text-sm font-semibold text-[#042f2e] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> Create coupon</>}
      </button>
    </form>
  );
}
