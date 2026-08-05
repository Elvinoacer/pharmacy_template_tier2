"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/app/components/Toaster";
import { Check, Loader2, RotateCcw, Smartphone, X } from "lucide-react";

type Phase = "idle" | "sending" | "waiting" | "success" | "failed";

type StatusPayload = {
  ok?: boolean;
  pending?: boolean;
  settled?: boolean;
  dispatched?: boolean;
  paymentStatus?: string;
  orderStatus?: string;
  mpesaReceipt?: string | null;
  failureReason?: string | null;
  message?: string;
  error?: string;
};

/**
 * Shared M-Pesa STK UX: send push → long-poll status (webhook + Daraja query) → retry.
 * Used by portal customers, guests, and admin counter sales.
 */
export function MpesaStkPanel({
  orderId,
  defaultPhone = "",
  /** Staff can forceRetry after timeout. */
  staffMode = false,
  /** Guest pay must send phone on status polls for authz. */
  guestMode = false,
  autoStart = false,
  onSuccess,
  onClose,
  compact = false,
  className = "",
}: {
  orderId: string;
  defaultPhone?: string;
  staffMode?: boolean;
  guestMode?: boolean;
  autoStart?: boolean;
  onSuccess?: (info: { paymentId: string; orderStatus: string; receipt?: string | null }) => void;
  onClose?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [phase, setPhase] = useState<Phase>(autoStart && defaultPhone ? "sending" : "idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const startedRef = useRef(false);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (pid: string, p: string) => {
      attemptsRef.current += 1;
      // Every 3rd tick, also query Daraja (heavier); otherwise local only.
      const queryProvider = attemptsRef.current % 3 === 0;
      const qs = new URLSearchParams({
        paymentId: pid,
        query: queryProvider ? "1" : "0",
      });
      if (guestMode || staffMode) qs.set("phone", p);
      try {
        const r = await fetch(`/api/payments/daraja/status?${qs.toString()}`, {
          cache: "no-store",
        });
        const j = (await r.json()) as StatusPayload;
        if (!r.ok) return;

        if (j.settled || j.paymentStatus === "completed") {
          stopPoll();
          setPhase("success");
          setReceipt(j.mpesaReceipt ?? null);
          setMessage(
            j.dispatched
              ? "Payment confirmed — marked dispatched."
              : "Payment confirmed. Order reserved until collection.",
          );
          onSuccess?.({
            paymentId: pid,
            orderStatus: j.orderStatus || "paid",
            receipt: j.mpesaReceipt,
          });
          toast.success("M-Pesa payment confirmed");
          return;
        }

        if (j.paymentStatus === "failed") {
          stopPoll();
          setPhase("failed");
          setMessage(j.failureReason || "Payment failed or was cancelled on the phone.");
        }
      } catch {
        /* keep polling */
      }
    },
    [guestMode, staffMode, onSuccess, stopPoll],
  );

  const startPoll = useCallback(
    (pid: string, p: string) => {
      stopPoll();
      attemptsRef.current = 0;
      setPhase("waiting");
      // Immediate check, then every 3s up to ~2 min.
      void pollStatus(pid, p);
      let ticks = 0;
      pollRef.current = setInterval(() => {
        ticks += 1;
        if (ticks > 40) {
          stopPoll();
          setPhase("failed");
          setMessage("Still waiting for confirmation. You can retry STK, or check again in a moment.");
          return;
        }
        void pollStatus(pid, p);
      }, 3000);
    },
    [pollStatus, stopPoll],
  );

  const sendStk = useCallback(
    async (forceRetry = false) => {
      if (!phone.trim()) {
        toast.error("Enter the customer’s M-Pesa number.");
        return;
      }
      setPhase("sending");
      setMessage("");
      setReceipt(null);
      try {
        const r = await fetch("/api/payments/daraja/stk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            phone: phone.trim(),
            // Allow retry after client timeout / failed attempt (staff or guest).
            forceRetry: Boolean(forceRetry),
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) {
          if (j.error === "daraja_not_configured") {
            setPhase("failed");
            setMessage(j.message || "M-Pesa is not configured on this environment.");
            toast.info("M-Pesa not configured — use cash/mark paid.");
            return;
          }
          if (j.error === "pending_payment_exists" && j.paymentId) {
            setPaymentId(j.paymentId);
            setMessage(j.message || "Payment already in progress on the phone.");
            startPoll(j.paymentId, phone.trim());
            return;
          }
          setPhase("failed");
          setMessage(j.message || j.error || "Could not start M-Pesa payment.");
          toast.error(j.message || "STK push failed");
          return;
        }
        setPaymentId(j.paymentId);
        setMessage(j.message || "STK push sent — enter PIN on the phone.");
        toast.success("STK push sent");
        startPoll(j.paymentId, phone.trim());
      } catch {
        setPhase("failed");
        setMessage("Network error starting payment.");
        toast.error("Network error starting payment.");
      }
    },
    [orderId, phone, staffMode, startPoll],
  );

  useEffect(() => {
    if (autoStart && defaultPhone && !startedRef.current) {
      startedRef.current = true;
      void sendStk(false);
    }
    return () => stopPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPhone(defaultPhone);
  }, [defaultPhone]);

  if (phase === "success") {
    return (
      <div
        className={`rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left ${className}`}
      >
        <div className="flex items-start gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-900">Payment confirmed</p>
            <p className="mt-0.5 text-xs text-emerald-800">{message}</p>
            {receipt && (
              <p className="mt-1 font-mono text-[10px] text-emerald-700">Receipt: {receipt}</p>
            )}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-emerald-700 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-2 rounded-xl border border-[#e3ebe6] bg-white p-3 text-left ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`font-semibold text-[#0c1a14] ${compact ? "text-xs" : "text-sm"}`}>
          <Smartphone className="mr-1 inline h-3.5 w-3.5 text-[#0d6e5a]" />
          {staffMode ? "Counter M-Pesa" : "Pay with M-Pesa"}
        </p>
        {onClose && phase === "idle" && (
          <button type="button" onClick={onClose} className="text-[#5a6b62]">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="07XX XXX XXX"
        disabled={phase === "sending" || phase === "waiting"}
        className="w-full rounded-lg border border-[#e3ebe6] px-2.5 py-1.5 text-xs disabled:opacity-60"
      />

      {message && (
        <p
          className={`text-[11px] ${
            phase === "failed" ? "text-rose-700" : "text-[#5a6b62]"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(phase === "idle" || phase === "failed") && (
          <button
            type="button"
            onClick={() => void sendStk(phase === "failed")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#084c3f]"
          >
            {phase === "failed" ? (
              <>
                <RotateCcw className="h-3 w-3" /> Retry STK
              </>
            ) : (
              <>
                <Smartphone className="h-3 w-3" /> Send STK push
              </>
            )}
          </button>
        )}

        {(phase === "sending" || phase === "waiting") && (
          <div className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#e6f4ef] px-3 py-1.5 text-[11px] font-semibold text-[#0d6e5a]">
            <Loader2 className="h-3 w-3 animate-spin" />
            {phase === "sending" ? "Sending…" : "Waiting for PIN…"}
          </div>
        )}

        {phase === "waiting" && staffMode && (
          <button
            type="button"
            onClick={() => void sendStk(true)}
            className="rounded-full border border-[#e3ebe6] px-2 py-1.5 text-[10px] font-semibold text-[#5a6b62] hover:bg-[#f4f7f4]"
            title="Force a new STK if the first one timed out"
          >
            Force retry
          </button>
        )}

        {phase === "waiting" && paymentId && (
          <button
            type="button"
            onClick={() => void pollStatus(paymentId, phone.trim())}
            className="rounded-full border border-[#e3ebe6] px-2 py-1.5 text-[10px] font-semibold text-[#5a6b62] hover:bg-[#f4f7f4]"
          >
            Check now
          </button>
        )}
      </div>

      {staffMode && (
        <p className="text-[10px] text-[#8a9a92]">
          Customer only needs to enter their M-Pesa PIN. Confirmation arrives via webhook or status poll.
        </p>
      )}
    </div>
  );
}
