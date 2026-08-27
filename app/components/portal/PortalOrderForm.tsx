"use client";

import { useActionState, useEffect, useState } from "react";
import { portalCreateOrderAction, type ActionState } from "@/app/actions/portal";
import { toast } from "@/app/components/Toaster";
import { AlertCircle, Check, Hash, Tag, Phone, Send } from "lucide-react";

type Med = { id: string; name: string; price: number; stockQty: number };

export function PortalOrderForm({
  medications,
  defaultMedicationId,
  defaultPhone,
}: {
  medications: Med[];
  defaultMedicationId?: string;
  defaultPhone?: string;
}) {
  const [state, formAction, pending] = useActionState(portalCreateOrderAction, {} as ActionState);
  const [medicationId, setMedicationId] = useState(defaultMedicationId || medications[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [coupon, setCoupon] = useState("");
  const selected = medications.find((m) => m.id === medicationId);
  const total = selected ? selected.price * quantity : 0;

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (medications.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        No OTC products are currently available for online order. Please visit the pharmacy or browse the catalogue later.
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
      {state?.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.success}</span>
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
              max={selected?.stockQty || 99}
              required
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="input-premium pl-9"
            />
          </div>
        </div>
        <div>
          <label className="label-premium">Coupon code</label>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
            <input
              name="couponCode"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="Optional"
              className="input-premium pl-9 font-mono uppercase"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="label-premium">Reason for this medication *</label>
        <select name="reason" required className="input-premium" defaultValue="">
          <option value="" disabled>
            Select a reason…
          </option>
          <option value="for known condition">For a known condition</option>
          <option value="recommended by pharmacist">Recommended by pharmacist</option>
          <option value="returning customer">Returning customer / refill of OTC</option>
          <option value="self care">Self-care / minor symptom</option>
          <option value="other">Other</option>
        </select>
        <p className="mt-1 text-xs text-[#5a6b62]">
          Our pharmacist reviews this before dispatch.
        </p>
      </div>

      <div>
        <label className="label-premium">M-Pesa phone (for STK push)</label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a92]" />
          <input
            name="phone"
            type="tel"
            defaultValue={defaultPhone}
            placeholder="07XX XXX XXX"
            className="input-premium pl-9"
          />
        </div>
        <p className="mt-1 text-xs text-[#5a6b62]">
          After placing the order you can trigger M-Pesa payment from your orders list, or pay in store.
        </p>
      </div>

      <div className="rounded-xl bg-[#f4f7f4] p-3 flex items-center justify-between">
        <span className="text-sm text-[#5a6b62]">Estimated total</span>
        <span className="text-lg font-bold text-[#0c1a14]">KES {total.toLocaleString()}</span>
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? (
          <><span className="typing-dot" /> Placing order…</>
        ) : (
          <><Send className="h-4 w-4" /> Place order</>
        )}
      </button>
    </form>
  );
}
