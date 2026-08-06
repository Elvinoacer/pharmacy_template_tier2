"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function MedicinesFilterBar({
  q,
  category,
  categoryOptions,
  /** @deprecated use categoryOptions */
  dbCategorySlugs,
  trailing,
}: {
  q?: string;
  category?: string;
  categoryOptions?: Array<{ slug: string; name: string }>;
  dbCategorySlugs?: string[];
  /** Optional action after Search (e.g. photo search button). */
  trailing?: ReactNode;
}) {
  const router = useRouter();

  const options =
    categoryOptions && categoryOptions.length > 0
      ? categoryOptions
      : (dbCategorySlugs || []).map((slug) => ({
          slug,
          name: slug.replace(/-/g, " "),
        }));

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
        className="rounded-full border border-[#e3ebe6] bg-white py-2.5 pl-4 pr-8 text-sm text-[#0c1a14] capitalize"
      >
        <option value="all">All categories</option>
        {options.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
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
