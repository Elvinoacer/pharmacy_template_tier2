"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CaregiverError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error("[caregiver route error]", error), [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-3 py-10 sm:px-5 sm:py-16">
      <div className="w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] sm:rounded-3xl sm:p-8">
        <h1 className="text-xl font-bold leading-tight text-[var(--foreground)] sm:text-2xl">
          Caregiver workspace couldn&apos;t load
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          No dose, refill, or patient update has been repeated automatically. Retry the page or return to the caregiver dashboard.
        </p>
        <div className="mt-6 grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn-primary btn-primary-sm min-h-11 w-full justify-center sm:w-auto"
          >
            Retry
          </button>
          <Link href="/caregiver" className="btn-ghost btn-ghost-sm min-h-11 w-full justify-center sm:w-auto">
            Caregiver home
          </Link>
        </div>
        {error.digest && <p className="mt-5 break-all text-xs text-[var(--muted-2)]">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
