"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[public route error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-5 py-16">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">We couldn&apos;t load this page</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your request was not completed. You can retry safely; no payment or health action should be repeated unless the page confirms it succeeded.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-primary btn-primary-sm inline-flex items-center gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
          <Link href="/" className="btn-ghost btn-ghost-sm">Home</Link>
        </div>
        {error.digest && <p className="mt-5 text-xs text-slate-400">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
