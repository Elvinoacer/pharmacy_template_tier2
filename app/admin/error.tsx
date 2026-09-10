"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full flex-1 items-center justify-center bg-[var(--admin-bg)] px-3 py-10 text-center text-[var(--admin-text)] sm:px-6 sm:py-16">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-5 shadow-[var(--admin-shadow)] sm:rounded-3xl sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--admin-accent)]">
          Admin
        </p>
        <h1
          className="mt-3 text-2xl font-semibold leading-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--admin-text-muted)]">
          The admin area hit an unexpected error. This is usually temporary — try again, or head back and sign in fresh.
          {error.digest ? (
            <span className="mt-1 block break-all text-xs text-[var(--admin-text-soft)]">
              Reference: {error.digest}
            </span>
          ) : null}
        </p>
        <div className="mt-7 grid gap-2.5 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--admin-btn-fg)] transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-card)] sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/login?next=/admin"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--admin-border-2)] bg-[var(--admin-inset)] px-5 py-2.5 text-sm font-semibold text-[var(--admin-text)] transition hover:bg-[var(--admin-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] sm:w-auto"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
