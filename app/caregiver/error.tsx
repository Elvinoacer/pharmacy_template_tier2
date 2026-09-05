"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CaregiverError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error("[caregiver route error]", error), [error]);
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Caregiver workspace couldn&apos;t load</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No dose, refill, or patient update has been repeated automatically. Retry the page or return to the caregiver dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-primary btn-primary-sm">Retry</button>
          <Link href="/caregiver" className="btn-ghost btn-ghost-sm">Caregiver home</Link>
        </div>
        {error.digest && <p className="mt-5 text-xs text-slate-400">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
