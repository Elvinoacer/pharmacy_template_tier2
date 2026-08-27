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
  const categories = useMemo(
    () => Array.from(new Set(items.map((f) => f.category))),
    [items]
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory || "All");
  const [openId, setOpenId] = useState<number | null>(0);

  const filtered = useMemo(() => {
    let list = items;
    if (category !== "All") list = list.filter((f) => f.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }
    if (limit) list = list.slice(0, limit);
    return list;
  }, [items, category, query, limit]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6b62]"
            width="16"
            height="16"
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
            className="w-full rounded-xl border border-teal-900/10 bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-teal-600/40 focus:ring-2 focus:ring-teal-500/20"
            aria-label="Search FAQs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("All")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              category === "All"
                ? "bg-[#0d6e5a] text-white"
                : "bg-white text-[#3d4f46] border border-teal-900/10 hover:bg-teal-50"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                category === c
                  ? "bg-[#0d6e5a] text-white"
                  : "bg-white text-[#3d4f46] border border-teal-900/10 hover:bg-teal-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3" role="list">
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-teal-900/5 bg-white/80 px-5 py-8 text-center text-sm text-[#5a6b62]">
            No questions match your search. Try another term or{" "}
            <TenantLink href="/contact" className="font-semibold text-teal-800 underline">
              contact us
            </TenantLink>
            .
          </p>
        )}
        {filtered.map((faq, i) => {
          const id = items.indexOf(faq);
          const open = openId === id;
          return (
            <div
              key={`${faq.question}-${i}`}
              className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm"
              role="listitem"
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setOpenId(open ? null : id)}
                aria-expanded={open}
              >
                <span>
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-teal-700">
                    {faq.category}
                  </span>
                  <span className="text-sm font-semibold text-[#0c1a14] sm:text-base">
                    {faq.question}
                  </span>
                </span>
                <span
                  className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800 transition ${
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
                <div className="border-t border-teal-900/5 px-5 pb-5 pt-3">
                  <p className="text-sm leading-relaxed text-[#5a6b62]">{faq.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
