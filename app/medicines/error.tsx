"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MedicinesError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => console.error("[medicines]", error), [error]);
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 pt-32">
      <div className="max-w-md rounded-3xl border border-[#e3ebe6] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
          The catalogue didn&apos;t load
        </h1>
        <p className="mt-2 text-sm text-[#5a6b62]">
          This is usually temporary. Retry, or contact the pharmacy and they will help you find what
          you need.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={reset} className="btn-primary btn-primary-sm">Try again</button>
          <Link href="/contact" className="btn-ghost btn-ghost-sm">Contact</Link>
        </div>
      </div>
    </div>
  );
}
