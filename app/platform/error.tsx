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
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-7 text-center">
        <h1 className="text-xl font-semibold">Platform workspace could not load</h1>
        <p className="mt-2 text-sm text-white/70">
          No changes were submitted from this failed view. Retry the request; if it keeps failing, check platform health and job status.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-xl bg-white px-5 py-2 text-sm font-semibold text-slate-950"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
