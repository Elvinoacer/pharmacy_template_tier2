"use client";

import { useMemo, useState } from "react";
import TenantLink from "./TenantLink";
import { faqs } from "../lib/data";

export type FaqEntry = { category: string; question: string; answer: string };

export default function FaqAccordion({
  initialCategory,
  limit,
  /** Per-tenant list from the storefront template layer; defaults to the shared template corpus. */
  items = faqs,
}: {
  initialCategory?: string;
  limit?: number;
  items?: FaqEntry[];
}) {
  const categories = useMemo(() => Array.from(new Set(items.map((f) => f.category))), [items]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory || "All");
  const [openId, setOpenId] = useState<number | null>(0);

  const filtered = useMemo(() => {
    let list = items;
    if (category !== "All") list = list.filter((f) => f.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
      );
    }
    if (limit) list = list.slice(0, limit);
    return list;
  }, [items, category, query, limit]);

  const filterClass = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:text-xs ${
      active
        ? "border-[var(--brand)] bg-[var(--brand)] text-white"
        : "border-[var(--line-2)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="min-w-0">
      <div className="space-y-3 sm:space-y-4">
        <div className="relative min-w-0">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="h-12 w-full min-w-0 rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] pl-10 pr-4 text-base text-[var(--foreground)] shadow-sm outline-none transition-colors placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_16%,transparent)] sm:text-sm"
            aria-label="Search FAQs"
          />
        </div>

        <div
          className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          aria-label="Filter FAQs by topic"
        >
          <button type="button" onClick={() => setCategory("All")} className={filterClass(category === "All")}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={filterClass(category === c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3" role="list">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--line-2)] bg-[var(--card)] px-4 py-8 text-center sm:px-6 sm:py-10">
            <p className="text-sm leading-6 text-[var(--muted)]">
              No questions match your search. Try another term or{" "}
              <TenantLink href="/contact" className="font-semibold text-[var(--brand)] underline underline-offset-2">
                contact us
              </TenantLink>
              .
            </p>
          </div>
        )}

        {filtered.map((faq, i) => {
          const id = items.indexOf(faq);
          const open = openId === id;
          return (
            <div
              key={`${faq.question}-${i}`}
              className={`overflow-hidden rounded-2xl border transition-colors ${
                open
                  ? "border-[color-mix(in_srgb,var(--brand)_34%,var(--line-2))] bg-[var(--card)]"
                  : "border-[var(--line-2)] bg-[var(--card)]"
              }`}
              role="listitem"
            >
              <button
                type="button"
                className="flex min-h-[68px] w-full min-w-0 items-start justify-between gap-3 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)] sm:min-h-[76px] sm:gap-4 sm:px-5"
                onClick={() => setOpenId(open ? null : id)}
                aria-expanded={open}
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--brand)] sm:text-[10px] sm:tracking-wider">
                    {faq.category}
                  </span>
                  <span className="block break-words text-[13px] font-semibold leading-5 text-[var(--foreground)] sm:text-base sm:leading-6">
                    {faq.question}
                  </span>
                </span>
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--brand-tint)] text-[var(--brand)] transition-transform ${
                    open ? "rotate-45" : ""
                  }`}
                  aria-hidden
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </button>

              {open && (
                <div className="border-t border-[var(--line)] bg-[var(--card-elev)] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                  <p className="break-words text-[13px] leading-6 text-[var(--muted)] sm:text-sm sm:leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
