"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/app/components/Toaster";
import { publicApiErrorMessage, publicErrorMessage } from "@/app/lib/public-error";
import { Check, Copy, CreditCard, ExternalLink, Loader2, RotateCcw, ShieldCheck, Smartphone, X } from "lucide-react";

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

type StkPayload = {
  ok?: boolean;
  error?: string;
  message?: string;
  paymentId?: string;
  checkoutUrl?: string;
  invoiceId?: string;
};

/** Shared payment UX for customers, guests, and staff counter sales powered by IntaSend. */
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
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
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
        if (!response.ok) return;

        if (payload.settled || payload.paymentStatus === "completed") {
          stopPoll();
          setPhase("success");
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
          toast.success("Payment confirmed via IntaSend");
          return;
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
          setPhase("failed");
          setMessage("Waiting for confirmation timed out. You can retry the payment request or check again in a moment.");
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
      try {
        const redirectUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname}?order=${orderId}&payment=success`
            : undefined;

        const response = await fetch("/api/payments/mobile/stk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            accessToken,
            phone: phone.trim() || undefined,
            forceRetry: Boolean(forceRetry),
            redirectUrl,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as StkPayload;
        if (!response.ok || payload.ok === false) {
          const safeMessage = publicApiErrorMessage(
            payload,
            "Could not initiate payment session. Please check connection and try again.",
          );
          setPhase("failed");
          setMessage(safeMessage);
          toast.error(safeMessage);
          return;
        }

        if (payload.checkoutUrl) {
          setCheckoutUrl(payload.checkoutUrl);
        }

        if (payload.paymentId) {
          setPaymentId(payload.paymentId);
        }

        if (!staffMode && payload.checkoutUrl) {
          // Direct customer or guest: redirect immediately to IntaSend checkout
          setMessage("Redirecting to IntaSend secure payment...");
          window.location.href = payload.checkoutUrl;
          return;
        }

        // Staff mode: provide link and start status listener
        setPhase("waiting");
        setMessage("IntaSend payment session active. Customer can pay with M-PESA, Visa, Mastercard, or Bank.");
        toast.success("Payment session created");
        if (payload.paymentId) {
          startPoll(payload.paymentId, phone.trim());
        }
      } catch {
        setPhase("failed");
        setMessage("Could not connect to the payment service. Check your connection and try again.");
        toast.error("Could not start payment.");
      }
    },
    [accessToken, orderId, phone, staffMode, startPoll],
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
            <p className="text-sm font-semibold text-emerald-900">Payment confirmed</p>
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
          <ShieldCheck className="h-4 w-4 text-[#0d6e5a]" />
          <p className={`font-semibold text-[#0c1a14] ${compact ? "text-xs" : "text-sm"}`}>
            {staffMode ? "IntaSend Counter Collection" : "Pay with IntaSend"}
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-[#5a6b62]">
          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-800">
            <Smartphone className="h-2.5 w-2.5" /> M-PESA
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-800">
            <CreditCard className="h-2.5 w-2.5" /> Card
          </span>
        </div>
        {onClose && phase === "idle" && (
          <button type="button" onClick={onClose} className="text-[#5a6b62] hover:text-[#0c1a14]" aria-label="Close payment panel">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <label className="sr-only" htmlFor={`payment-phone-${orderId}`}>
        Customer phone number
      </label>
      <input
        id={`payment-phone-${orderId}`}
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Customer phone (e.g. 07XX XXX XXX)"
        disabled={phase === "sending" || phase === "waiting"}
        className="w-full rounded-lg border border-[#e3ebe6] px-2.5 py-1.5 text-xs text-[#0c1a14] placeholder:text-[#8a9a92] disabled:opacity-60"
      />

      {message && (
        <p
          className={`text-[11px] leading-relaxed ${
            phase === "failed" ? "text-rose-700" : "text-[#5a6b62]"
          }`}
        >
          {message}
        </p>
      )}

      {checkoutUrl && (
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={checkoutUrl}
            target={staffMode ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0d6e5a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#084c3f]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {staffMode ? "Open Customer Checkout" : "Continue to IntaSend"}
          </a>
          {staffMode && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(checkoutUrl);
                toast.success("Payment link copied to clipboard");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e3ebe6] px-2.5 py-2 text-xs font-semibold text-[#5a6b62] hover:bg-[#f4f7f4]"
              title="Copy checkout link to send via SMS or WhatsApp"
            >
              <Copy className="h-3.5 w-3.5" /> Link
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(phase === "idle" || phase === "failed") && !checkoutUrl && (
          <button
            type="button"
            onClick={() => void initiatePayment(phase === "failed")}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0d6e5a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#084c3f]"
          >
            {phase === "failed" ? (
              <>
                <RotateCcw className="h-3 w-3" /> Retry IntaSend Checkout
              </>
            ) : (
              <>
                <Smartphone className="h-3 w-3" /> Pay with M-Pesa / Card
              </>
            )}
          </button>
        )}

        {phase === "sending" && (
          <div className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#e6f4ef] px-3 py-1.5 text-[11px] font-semibold text-[#0d6e5a]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Creating secure checkout…
          </div>
        )}

        {phase === "waiting" && (
          <div className="flex w-full items-center justify-between gap-2 rounded-lg bg-[#f0faf6] px-2.5 py-1.5 text-[11px] text-[#0d6e5a]">
            <span className="flex items-center gap-1.5 font-medium">
              <Loader2 className="h-3 w-3 animate-spin text-[#0d6e5a]" />
              Awaiting customer payment…
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
          IntaSend allows the customer to pay using M-Pesa STK push, Debit/Credit Card, or PesaLink. Confirmation updates automatically.
        </p>
      )}
    </div>
  );
}
