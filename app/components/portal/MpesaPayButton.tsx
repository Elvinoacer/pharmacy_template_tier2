"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
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

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-semibold text-emerald-800">
        Paid ✓
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0d6e5a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084c3f]"
      >
        <Smartphone className="h-3 w-3" /> Pay with M-Pesa
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
