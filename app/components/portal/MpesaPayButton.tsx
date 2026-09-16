"use client";

import { useState } from "react";
import { CreditCard, Loader2, Smartphone } from "lucide-react";
import { MpesaStkPanel } from "@/app/components/payments/MpesaStkPanel";

export function MpesaPayButton({
  orderId,
  accessToken,
  defaultPhone,
  guestMode = false,
}: {
  orderId: string;
  accessToken?: string;
  defaultPhone?: string;
  /** Public/guest checkout — uses an order access token for payment authorization. */
  guestMode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-semibold text-emerald-800">
        Paid ✓
      </span>
    );
  }

  const handlePayClick = async () => {
    setLoading(true);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}?order=${orderId}&payment=success`
          : undefined;

      const res = await fetch("/api/payments/intasend/order-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          accessToken,
          phone: defaultPhone,
          redirectUrl,
        }),
      });

      const data = await res.json();
      if (data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
    } catch (err) {
      console.warn("[MpesaPayButton] checkout redirect failed, opening panel:", err);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void handlePayClick()}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0d6e5a] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#084c3f] disabled:opacity-75"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Connecting IntaSend…</span>
          </>
        ) : (
          <>
            <Smartphone className="h-3.5 w-3.5 text-emerald-200" />
            <span className="text-white/40">/</span>
            <CreditCard className="h-3.5 w-3.5 text-emerald-200" />
            <span>Pay with M-Pesa / Card</span>
          </>
        )}
      </button>
    );
  }

  return (
    <MpesaStkPanel
      orderId={orderId}
      accessToken={accessToken}
      defaultPhone={defaultPhone}
      guestMode={guestMode}
      compact
      onClose={() => setOpen(false)}
      onSuccess={() => {
        setDone(true);
        // Soft refresh so order badges update.
        setTimeout(() => {
          if (!guestMode && typeof window !== "undefined") window.location.reload();
        }, 1200);
      }}
    />
  );
}
