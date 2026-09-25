"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/app/components/Toaster";
import { publicApiErrorMessage, publicErrorMessage } from "@/app/lib/public-error";
import { Check, Loader2, RotateCcw, Smartphone, X } from "lucide-react";

type Phase = "idle" | "sending" | "waiting" | "uncertain" | "success" | "failed";

type StatusPayload = {
  providerReportedSuccess?: boolean;
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

type StkPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  paymentId?: string;
  phone?: string;
  attemptCount?: number;
};

/** Direct M-Pesa STK payment UX for customers, guests, and staff counter sales. */
export function MpesaStkPanel({
  orderId,
  accessToken,
  defaultPhone = "",
  staffMode = false,
  guestMode = false,
  autoStart = false,
  onSuccess,
  onClose,
  compact = false,
  className = "",
}: {
  orderId: string;
  accessToken?: string;
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
  const [notConfigured, setNotConfigured] = useState<boolean>(false);
  const [paidByMpesa, setPaidByMpesa] = useState(false);
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
      const queryProvider = attemptsRef.current % 2 === 0;
      const qs = new URLSearchParams({
        paymentId: pid,
        orderId,
        query: queryProvider ? "1" : "0",
      });
      if (guestMode || staffMode) qs.set("phone", p);
      try {
        const response = await fetch(`/api/payments/mobile/status?${qs.toString()}`, {
          cache: "no-store",
          headers: accessToken ? { "x-order-access-token": accessToken } : undefined,
        });
        const payload = (await response.json()) as StatusPayload;
        if (!response.ok) {
          setMessage("Payment status is temporarily unavailable. Do not pay again until this attempt is confirmed or declined.");
          return;
        }

        if (payload.paymentStatus === "completed") {
          stopPoll();
          setPhase("success");
          setPaidByMpesa(true);
          setReceipt(payload.mpesaReceipt ?? null);
          setMessage(
            payload.dispatched
              ? "Payment confirmed — marked dispatched."
              : "Payment confirmed. Order reserved until collection.",
          );
          onSuccess?.({
            paymentId: pid,
            orderStatus: payload.orderStatus || "paid",
            receipt: payload.mpesaReceipt,
          });
          toast.success("M-Pesa payment confirmed");
          return;
        }

        if (payload.settled) {
          stopPoll();
          setPhase("success");
          setPaidByMpesa(false);
          setMessage("This order was settled by another method. This M-Pesa attempt has not been confirmed.");
          return;
        }

        if (payload.providerReportedSuccess) {
          setMessage("M-Pesa reports success, but receipt confirmation is pending. Do not pay again. Check status shortly or contact support with this payment reference.");
        }

        if (payload.paymentStatus === "failed") {
          stopPoll();
          setPhase("failed");
          setMessage(
            publicErrorMessage(
              payload.failureReason,
              "Payment was not completed. Please retry or choose another payment method.",
            ),
          );
        }
      } catch {
        /* keep polling */
      }
    },
    [orderId, guestMode, staffMode, onSuccess, stopPoll, accessToken],
  );

  const startPoll = useCallback(
    (pid: string, p: string) => {
      stopPoll();
      attemptsRef.current = 0;
      setPhase("waiting");
      void pollStatus(pid, p);
      let ticks = 0;
      pollRef.current = setInterval(() => {
        ticks += 1;
        if (ticks > 50) {
          stopPoll();
          setPhase("uncertain");
          setMessage(
            "Confirmation is taking longer than expected. Do not pay again until this attempt is confirmed or declined. Check its status or contact support.",
          );
          return;
        }
        void pollStatus(pid, p);
      }, 3000);
    },
    [pollStatus, stopPoll],
  );

  const initiatePayment = useCallback(
    async (forceRetry = false) => {
      setPhase("sending");
      setMessage("");
      setReceipt(null);
      setPaidByMpesa(false);
      setNotConfigured(false);
      try {
        const response = await fetch("/api/payments/mobile/stk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            accessToken,
            phone: phone.trim() || undefined,
            forceRetry: Boolean(forceRetry),
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as StkPayload;
        if (!response.ok || payload.ok === false) {
          if (payload.error === "daraja_not_configured" || response.status === 503) {
            setNotConfigured(true);
            setPhase("failed");
            const notReadyMsg =
              payload.message ||
              "Online payment isn't available for this pharmacy yet. Please pay in person at collection.";
            setMessage(notReadyMsg);
            toast.error(notReadyMsg);
            return;
          }

          if (payload.error === "pending_payment_exists") {
            if (payload.paymentId) setPaymentId(payload.paymentId);
            setPhase("uncertain");
            setMessage(payload.message || "An M-Pesa attempt is still being verified. Do not pay again.");
            return;
          }

          const safeMessage = publicApiErrorMessage(
            payload,
            "Could not initiate M-Pesa prompt. Please check your phone number and try again.",
          );
          setPhase("failed");
          setMessage(safeMessage);
          toast.error(safeMessage);
          return;
        }

        if (payload.paymentId) {
          setPaymentId(payload.paymentId);
        }

        setPhase("waiting");
        setMessage(payload.message || "Enter your M-Pesa PIN on your phone to complete payment.");
        toast.success("M-Pesa prompt sent to phone");
        if (payload.paymentId) {
          startPoll(payload.paymentId, phone.trim());
        }
      } catch {
        setPhase("uncertain");
        setMessage("Could not confirm whether the payment request was sent. Check your phone and the order status before trying again.");
        toast.error("Could not start payment.");
      }
    },
    [accessToken, orderId, phone, startPoll],
  );

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      void initiatePayment(false);
    }
    return () => stopPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (defaultPhone) {
      const frame = requestAnimationFrame(() => setPhone(defaultPhone));
      return () => cancelAnimationFrame(frame);
    }
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
            <p className="text-sm font-semibold text-emerald-900">{paidByMpesa ? "M-Pesa payment confirmed" : "Order settled"}</p>
            <p className="mt-0.5 text-xs text-emerald-800">{message}</p>
            {receipt && (
              <p className="mt-1 font-mono text-[10px] text-emerald-700">Receipt: {receipt}</p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Close payment status"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-2.5 rounded-xl border border-[#e3ebe6] bg-white p-3.5 text-left shadow-2xs ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Smartphone className="h-4 w-4 text-[#0d6e5a]" />
          <p className={`font-semibold text-[#0c1a14] ${compact ? "text-xs" : "text-sm"}`}>
            {staffMode ? "Counter M-Pesa" : "Pay with M-Pesa"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-[#5a6b62]">
          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
            Direct to Pharmacy Till / PayBill
          </span>
        </div>
        {onClose && phase === "idle" && (
          <button
            type="button"
            onClick={onClose}
            className="text-[#5a6b62] hover:text-[#0c1a14]"
            aria-label="Close payment panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!notConfigured && (
        <>
          <label className="sr-only" htmlFor={`mpesa-phone-${orderId}`}>
            M-Pesa phone number
          </label>
          <input
            id={`mpesa-phone-${orderId}`}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="07XX XXX XXX"
            disabled={phase === "sending" || phase === "waiting"}
            className="w-full rounded-lg border border-[#e3ebe6] px-2.5 py-1.5 text-xs text-[#0c1a14] placeholder:text-[#8a9a92] disabled:opacity-60"
          />
        </>
      )}

      {message && (
        <p
          className={`text-[11px] leading-relaxed ${
            phase === "failed" ? "text-rose-700" : "text-[#5a6b62]"
          }`}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(phase === "idle" || (phase === "failed" && !notConfigured)) && (
          <button
            type="button"
            onClick={() => void initiatePayment(phase === "failed")}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0d6e5a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#084c3f]"
          >
            {phase === "failed" ? (
              <>
                <RotateCcw className="h-3 w-3" /> Retry M-Pesa Prompt
              </>
            ) : (
              <>
                <Smartphone className="h-3 w-3" /> Send M-Pesa Prompt
              </>
            )}
          </button>
        )}

        {notConfigured && (
          <p className="rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-800 border border-amber-200 w-full">
            Online payment is not yet connected for this pharmacy. You can pay with cash or card upon collection.
          </p>
        )}

        {phase === "sending" && (
          <div className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#e6f4ef] px-3 py-1.5 text-[11px] font-semibold text-[#0d6e5a]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sending M-Pesa prompt…
          </div>
        )}

        {(phase === "waiting" || phase === "uncertain") && (
          <div className="flex w-full items-center justify-between gap-2 rounded-lg bg-[#f0faf6] px-2.5 py-1.5 text-[11px] text-[#0d6e5a]">
            <span className="flex items-center gap-1.5 font-medium">
              {phase === "waiting" ? <Loader2 className="h-3 w-3 animate-spin text-[#0d6e5a]" /> : null}
              {phase === "waiting" ? "Check phone for M-Pesa PIN prompt…" : "Payment outcome awaiting confirmation"}
            </span>
            {paymentId && (
              <button
                type="button"
                onClick={() => void pollStatus(paymentId, phone.trim())}
                className="font-semibold underline hover:text-[#084c3f]"
              >
                Check status
              </button>
            )}
          </div>
        )}
      </div>

      {staffMode && (
        <p className="text-[10px] text-[#8a9a92]">
          The customer only needs to enter their M-Pesa PIN on their phone. Funds settle directly into your pharmacy shortcode.
        </p>
      )}
    </div>
  );
}
