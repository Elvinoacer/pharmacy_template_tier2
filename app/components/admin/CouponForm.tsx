"use client";

import { useId } from "react";

import { useActionState, useState, useTransition } from "react";
import type { ActionState } from "@/app/actions/admin";
import { Tag, Sparkles, Hash, Calendar, AlertCircle, Check, Save, RefreshCw, Pencil, Trash2, X } from "lucide-react";
import { toast } from "@/app/components/Toaster";
import { formatDateTime } from "@/app/lib/time";

type ExistingCoupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: string;
  pointsCost: number;
  maxRedemptions: number | null;
  redemptions: number;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
  updatedAt: string;
};

/**
 * Generate a random pronounceable coupon code (e.g. "WELL-SUMMER-7Q2").
 * Checks against the existing coupon codes passed in to avoid collisions.
 */
function generateUniqueCode(existing: string[]): string {
  const adjectives = ["WELL", "CARE", "HEALTH", "FRESH", "DAILY", "VITAL", "BLOOM", "SPRING", "SUMMER", "AUTUMN", "WINTER"];
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 50; attempt++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    let suffix = "";
    for (let i = 0; i < 3; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    const code = `${adj}-${suffix}`;
    if (!existing.includes(code)) return code;
  }
  // Fallback: timestamp-based.
  return `CPN-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export default function CouponForm({
  action,
  coupons = [],
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  coupons?: ExistingCoupon[];
}) {
  const fieldPrefix = useId();
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function generateCode() {
    const next = generateUniqueCode(coupons.map((c) => c.code));
    setCode(next);
    toast.success(`Generated code: ${next}`);
  }

  async function deleteCoupon(id: string, code: string) {
    if (!confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    try {
      const r = await fetch("/api/admin/coupons/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      toast.success(`Coupon ${code} deleted.`);
      window.location.reload();
    } catch {
      toast.error("Could not delete coupon.");
    }
  }

  async function toggleActive(c: ExistingCoupon) {
    startTransition(async () => {
      try {
        const r = await fetch("/api/admin/coupons/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: c.id, active: !c.active }),
        });
        if (!r.ok) throw new Error();
        // Archive = deactivate (active=false). Reactivate restores it.
        toast.success(
          !c.active
            ? `Coupon ${c.code} restored.`
            : `Coupon ${c.code} archived (inactive).`,
        );
        window.location.reload();
      } catch {
        toast.error("Could not update coupon.");
      }
    });
  }

  return (
    <div className="space-y-4">
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

        {editingId && <input type="hidden" name="id" value={editingId} />}

        <div>
          <div className="flex items-center justify-between">
            <label className="label-admin">Coupon code *</label>
            <button
              type="button"
              onClick={generateCode}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d6e5a] px-2 py-0.5 text-xs font-semibold text-white hover:brightness-110"
              title="Auto-generate a unique code"
            >
              <RefreshCw className="h-2.5 w-2.5" /> Generate unique
            </button>
          </div>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input
              name="code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER25"
              className="input-admin pl-9 font-mono uppercase"
            />
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldPrefix}-1`} className="label-admin">Description</label>
          <input id={`${fieldPrefix}-1`} name="description" placeholder="25% off summer essentials" className="input-admin" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldPrefix}-2`} className="label-admin">Discount type</label>
            <select id={`${fieldPrefix}-2`} name="discountType" className="input-admin" defaultValue="percent">
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed amount ($)</option>
              <option value="points">Bonus points</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-3`} className="label-admin">Discount value *</label>
            <input id={`${fieldPrefix}-3`} name="discountValue" type="number" min="0" step="0.01" required placeholder="25" className="input-admin" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${fieldPrefix}-4`} className="label-admin">Points cost</label>
            <div className="relative">
              <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input id={`${fieldPrefix}-4`} name="pointsCost" type="number" min="0" placeholder="100" className="input-admin pl-9" />
            </div>
          </div>
          <div>
            <label htmlFor={`${fieldPrefix}-5`} className="label-admin">Max redemptions</label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
              <input id={`${fieldPrefix}-5`} name="maxRedemptions" type="number" min="0" placeholder="Unlimited" className="input-admin pl-9" />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldPrefix}-6`} className="label-admin">Valid until</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 admin-soft" />
            <input id={`${fieldPrefix}-6`} name="validUntil" type="date" className="input-admin pl-9" />
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
          {pending ? <><span className="typing-dot" /> Saving…</> : <><Save className="h-4 w-4" /> {editingId ? "Update coupon" : "Create coupon"}</>}
        </button>
      </form>

      {/* Coupon management list — edit/delete/toggle */}
      {coupons.length > 0 && (
        <div className="border-t border-[var(--admin-border)] pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide admin-soft">Manage existing</p>
          <ul className="space-y-2">
            {coupons.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold admin-accent-text">{c.code}</span>
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      className={`rounded-full px-1.5 py-0.5 text-xs font-semibold transition ${
                        c.active
                          ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25"
                          : "bg-slate-500/15 text-slate-500 hover:bg-slate-500/25"
                      }`}
                      title={c.active ? "Archive coupon" : "Restore archived coupon"}
                    >
                      {c.active ? "active" : "archived"}
                    </button>
                  </div>
                  <p className="mt-0.5 truncate text-xs admin-muted">{c.description || "No description"}</p>
                  <p className="mt-0.5 text-xs admin-soft">
                    Updated {formatDateTime(c.updatedAt)} · {c.redemptions}
                    {c.maxRedemptions ? `/${c.maxRedemptions}` : ""} redeemed
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(c.id);
                      setCode(c.code);
                      toast.info(`Editing ${c.code} — update fields above and submit.`);
                    }}
                    className="rounded-full p-1 admin-soft transition hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {editingId === c.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setCode("");
                      }}
                      className="rounded-full p-1 admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
                      title="Cancel edit"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteCoupon(c.id, c.code)}
                    className="rounded-full p-1 admin-soft transition hover:bg-rose-500/10 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
