"use client";

import { useEffect } from "react";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[platform boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center bg-[var(--admin-bg)] px-3 py-8 text-[var(--admin-text)] sm:px-6 sm:py-10">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 text-center shadow-[var(--admin-shadow)] sm:rounded-3xl sm:p-7">
        <h1 className="text-lg font-semibold leading-tight sm:text-xl">Platform workspace could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
          No changes were submitted from this failed view. Retry the request; if it keeps failing, check platform health and job status.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-card)] sm:w-auto"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
