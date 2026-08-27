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
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-3xl border border-[#e3ebe6] bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600">Something broke</p>
        <h1 className="mt-2 text-xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
          We couldn&apos;t load this page
        </h1>
        <p className="mt-2 text-sm text-[#5a6b62]">
          Your data is safe. Try again, or head back to the dashboard. If it keeps happening, message
          your pharmacy team.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="btn-primary btn-primary-sm"
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> Try again
          </button>
          <Link href="/portal" className="btn-ghost btn-ghost-sm">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
