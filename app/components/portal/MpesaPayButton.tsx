"use client";

import { useState } from "react";
import { toast } from "@/app/components/Toaster";
import { Loader2, Smartphone } from "lucide-react";

export function MpesaPayButton({
  orderId,
  defaultPhone,
}: {
  orderId: string;
  defaultPhone?: string;
}) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function pay() {
    if (!phone.trim()) {
      toast.error("Enter the M-Pesa phone number.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/payments/daraja/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, phone: phone.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.error === "pending_payment_exists") {
          toast.error("A payment is already in progress for this order.");
        } else {
          toast.error(j.message || j.error || "Could not start M-Pesa payment.");
        }
        return;
      }
      if (j.error === "daraja_not_configured") {
        toast.info("M-Pesa is not configured on this environment. Pay at the counter.");
        return;
      }
      toast.success("STK push sent — check your phone to complete payment.");
      setOpen(false);
    } catch {
      toast.error("Network error starting payment.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#084c3f]"
      >
        <Smartphone className="h-3 w-3" /> Pay with M-Pesa
      </button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-[#e3ebe6] bg-white p-2 text-left">
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="07XX XXX XXX"
        className="w-full rounded border border-[#e3ebe6] px-2 py-1 text-xs"
      />
      <div className="flex gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={pay}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#0d6e5a] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Smartphone className="h-3 w-3" />}
          Send STK
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-2 py-1 text-[10px] text-[#5a6b62]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
