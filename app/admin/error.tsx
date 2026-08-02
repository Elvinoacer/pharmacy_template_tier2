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
    // Server-side errors are already logged where they're thrown (e.g.
    // admin/layout.tsx). This also logs client-side so the digest — Next's
    // reference id for the matching server log line — is visible here too.
    console.error("[admin] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-32 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
        Admin
      </p>
      <h1
        className="mt-3 text-3xl font-semibold text-[#0c1a14] sm:text-4xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-[#5a6b62]">
        The admin area hit an unexpected error. This is usually temporary —
        try again, or head back and sign in fresh.
        {error.digest ? (
          <span className="mt-1 block text-xs text-[#8a9a92]">
            Reference: {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary !py-2.5 text-sm">
          Try again
        </button>
        <Link href="/login?next=/admin" className="btn-ghost !py-2.5 text-sm">
          Back to login
        </Link>
      </div>
    </div>
  );
}
