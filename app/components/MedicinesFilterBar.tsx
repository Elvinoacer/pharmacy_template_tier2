"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTenantHref } from "./TenantLink";

export default function MedicinesFilterBar({
  q,
  category,
  categoryOptions,
  /** @deprecated use categoryOptions */
  dbCategorySlugs,
  trailing,
  preserveParams,
}: {
  q?: string;
  category?: string;
  categoryOptions?: Array<{ slug: string; name: string }>;
  dbCategorySlugs?: string[];
  /** Optional action after Search (e.g. photo search button). */
  trailing?: ReactNode;
  /** Extra GET params that should survive search/category changes (e.g. pharmacy). */
  preserveParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const medicinesHref = useTenantHref("/medicines");

  const options =
    categoryOptions && categoryOptions.length > 0
      ? categoryOptions
      : (dbCategorySlugs || []).map((slug) => ({
          slug,
          name: slug.replace(/-/g, " "),
        }));

  const appendPreserved = (params: URLSearchParams) => {
    for (const [key, value] of Object.entries(preserveParams || {})) {
      if (value) params.set(key, value);
    }
  };

  function onCategoryChange(v: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (v && v !== "all") params.set("category", v);
    appendPreserved(params);
    const qs = params.toString();
    router.push(qs ? `${medicinesHref}?${qs}` : medicinesHref);
  }

  return (
    <form className="flex flex-wrap items-center gap-2" action={medicinesHref} method="GET">
      {Object.entries(preserveParams || {}).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
      <div className="relative min-w-[200px] flex-1">
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="Search medicine, generic or brand…"
          className="min-h-11 w-full rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] shadow-sm outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
        />
      </div>
      <select
        name="category"
        defaultValue={category || "all"}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="min-h-11 rounded-full border border-[var(--line-2)] bg-[var(--card)] py-2.5 pl-4 pr-8 text-sm capitalize text-[var(--foreground)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
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
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--brand)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 active:scale-[0.98]"
      >
        Search
      </button>
      {trailing}
    </form>
  );
}
