"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full min-w-0 items-start justify-center overflow-x-clip px-4 py-6 sm:items-center sm:px-6 sm:py-8 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 text-center shadow-sm sm:rounded-3xl sm:p-6 lg:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300">
          Something broke
        </p>
        <h1
          className="mt-2 text-2xl font-semibold leading-tight text-[var(--foreground)] sm:text-3xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          We couldn&apos;t load this page
        </h1>
        <p className="mt-3 text-base leading-6 text-[var(--muted)]">
          Your data is safe. Try again, or head back to the dashboard. If it keeps happening, message
          your pharmacy team.
        </p>
        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="btn-primary min-h-11 w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Try again</span>
          </button>
          <Link href="/portal" className="btn-ghost min-h-11 w-full sm:w-auto">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
