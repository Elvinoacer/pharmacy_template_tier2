"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import styles from "./OnboardSurface.module.css";

export default function PaymentStatusRefresh({ pending }: { pending: boolean }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const [providerPending, setProviderPending] = useState(pending);
  const [checkError, setCheckError] = useState<string | null>(null);
  const checkingRef = useRef(false);

  const check = useCallback(async () => {
    if (checkingRef.current || document.visibilityState !== "visible") return;
    checkingRef.current = true;
    setChecking(true);

    try {
      const response = await fetch("/api/payments/billing/status", {
        method: "POST",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as { pending?: number } | null;
      if (response.ok && typeof data?.pending === "number") {
        setProviderPending(data.pending > 0);
        setCheckError(null);
      } else if (!response.ok) {
        setCheckError(
          "We couldn't confirm payment status right now. You can retry in a moment.",
        );
      }
    } catch {
      setCheckError("Payment status is temporarily unavailable. Please retry shortly.");
    } finally {
      startTransition(() => router.refresh());
      setChecking(false);
      checkingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (!pending && !providerPending) return;

    const timer = setInterval(() => void check(), 4000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [check, pending, providerPending]);

  const waiting = pending || providerPending;
  return (
    <div className="mt-5">
      {waiting ? (
        <p role="status" className="mb-3 text-sm text-[var(--muted)]">
          Confirming your payment. You can stay on this page; the status updates automatically.
        </p>
      ) : null}
      {checkError ? (
        <p role="alert" className="mb-3 text-sm text-rose-600 dark:text-rose-400">
          {checkError}
        </p>
      ) : null}
      <button
        type="button"
        className={styles.quietLink}
        disabled={checking || refreshing}
        onClick={() => void check()}
      >
        <RefreshCw size={14} aria-hidden />
        {checking || refreshing ? "Checking payment…" : "Check payment status"}
      </button>
    </div>
  );
}
