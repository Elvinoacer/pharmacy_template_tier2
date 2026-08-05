"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function MedicinesFilterBar({
  q,
  category,
  dbCategorySlugs,
  trailing,
}: {
  q?: string;
  category?: string;
  dbCategorySlugs: string[];
  /** Optional action after Search (e.g. photo search button). */
  trailing?: ReactNode;
}) {
  const router = useRouter();

  function onCategoryChange(v: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (v && v !== "all") params.set("category", v);
    const qs = params.toString();
    router.push(qs ? `/medicines?${qs}` : "/medicines");
  }

  return (
    <form className="flex flex-wrap items-center gap-2" action="/medicines" method="GET">
      <div className="relative min-w-[200px] flex-1">
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="Search medications by name or description…"
          className="w-full rounded-full border border-[#e3ebe6] bg-white py-2.5 pl-4 pr-4 text-sm text-[#0c1a14] shadow-sm outline-none focus:border-[#0d6e5a]/40 focus:ring-2 focus:ring-[#0d6e5a]/20"
        />
      </div>
      <select
        name="category"
        defaultValue={category || "all"}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded-full border border-[#e3ebe6] bg-white py-2.5 pl-4 pr-8 text-sm text-[#0c1a14]"
      >
        <option value="all">All categories</option>
        {dbCategorySlugs.map((c) => (
          <option key={c} value={c}>
            {c.replace(/-/g, " ")}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#084c3f]"
      >
        Search
      </button>
      {trailing}
    </form>
  );
}
