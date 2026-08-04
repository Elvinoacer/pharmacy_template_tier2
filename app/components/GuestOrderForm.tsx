"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { guestCreateOrderAction, type GuestOrderState } from "@/app/actions/guest-order";
import { toast } from "@/app/components/Toaster";
import { AlertCircle, Check, Hash, Phone, User, Mail, Send, ShoppingBag } from "lucide-react";

type Med = { id: string; name: string; price: number; stockQty: number; slug: string };

export function GuestOrderForm({
  medications,
  defaultMedicationId,
}: {
  medications: Med[];
  defaultMedicationId?: string;
}) {
  const [state, formAction, pending] = useActionState(guestCreateOrderAction, {} as GuestOrderState);
  const [medicationId, setMedicationId] = useState(
    defaultMedicationId || medications[0]?.id || "",
  );
  const [quantity, setQuantity] = useState(1);
  const selected = medications.find((m) => m.id === medicationId);
  const total = selected ? selected.price * quantity : 0;

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (state?.success && state.orderId) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[#0c1a14]">Order reserved</h3>
        <p className="mt-2 text-sm text-[#5a6b62]">{state.success}</p>
        <p className="mt-3 font-mono text-sm font-bold text-emerald-800">
          Ref: {state.orderId.slice(0, 8).toUpperCase()}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/medicines" className="btn-primary !py-2 text-sm">
            Browse more
          </Link>
          <Link href="/register" className="btn-ghost !py-2 text-sm">
            Create account for faster reorders
          </Link>
        </div>
      </div>
    );
  }

  if (medications.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        No OTC products are currently listed for online order. Please visit the pharmacy or call us.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label className="label-premium">Product *</label>
        <select
          name="medicationId"
          required
          value={medicationId}
          onChange={(e) => setMedicationId(e.target.value)}
          className="input-premium"
        >
          {medications.map((m) => (
            <option key={m.id} value={m.id} disabled={m.stockQty <= 0}>
              {m.name} — KES {m.price.toLocaleString()} ({m.stockQty} left)
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">Quantity *</label>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="quantity"
              type="number"
              min={1}
              max={Math.min(20, selected?.stockQty || 20)}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="input-premium !pl-10"
              required
            />
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <p className="rounded-xl bg-[#f0faf6] px-4 py-3 text-sm font-semibold text-[#0c1a14]">
            Est. total: KES {total.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <label className="label-premium">Full name *</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
          <input name="fullName" required className="input-premium !pl-10" placeholder="Jane Wanjiku" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-premium">Phone *</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="phone"
              type="tel"
              required
              className="input-premium !pl-10"
              placeholder="07xx xxx xxx"
            />
          </div>
        </div>
        <div>
          <label className="label-premium">Email (optional)</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input name="email" type="email" className="input-premium !pl-10" placeholder="you@email.com" />
          </div>
        </div>
      </div>

      <div>
        <label className="label-premium">Pickup or delivery</label>
        <select name="pickupPreference" className="input-premium" defaultValue="pickup">
          <option value="pickup">Collect in store</option>
          <option value="delivery">Home delivery (we&apos;ll confirm fee)</option>
        </select>
      </div>

      <div>
        <label className="label-premium">Notes (optional)</label>
        <textarea
          name="notes"
          rows={2}
          className="input-premium"
          placeholder="Landmark, preferred time, etc."
        />
      </div>

      <p className="text-xs text-[#5a6b62]">
        No account needed. We reserve stock and confirm by phone. Pay in store or when the rider arrives.
        For M-Pesa online pay and refill history,{" "}
        <Link href="/register" className="font-semibold text-teal-800 underline">
          create a free account
        </Link>
        .
      </p>

      <button type="submit" disabled={pending || !selected || selected.stockQty <= 0} className="btn-primary w-full">
        {pending ? (
          "Reserving…"
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" /> Reserve order
            <Send className="h-4 w-4 opacity-70" />
          </>
        )}
      </button>
    </form>
  );
}
