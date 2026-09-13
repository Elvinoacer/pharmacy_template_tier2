"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import styles from "./OnboardSurface.module.css";

export default function PaymentStatusRefresh({ pending }: { pending: boolean }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  useEffect(() => {
    if (!pending) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        startTransition(() => router.refresh());
      }
    };

    const timer = setInterval(refresh, 4000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pending, router]);

  return (
    <div className="mt-5">
      {pending ? (
        <p role="status" className="mb-3 text-sm text-[var(--muted)]">
          Waiting for Safaricom confirmation. Payment status updates automatically every few seconds.
        </p>
      ) : null}
      <button
        type="button"
        className={styles.quietLink}
        disabled={refreshing}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RefreshCw size={14} aria-hidden />
        {refreshing ? "Checking…" : "Check payment status"}
      </button>
    </div>
  );
}
