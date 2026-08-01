"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { searchContent } from "../lib/data";

export default function SearchPanel({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const results = useMemo(() => searchContent(query), [query]);
  const total =
    results.services.length +
    results.articles.length +
    results.faqs.length +
    results.categories.length;

  return (
    <div>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5a6b62]"
          width="18"
          height="18"
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
          placeholder="Search services, articles, FAQs…"
          className="w-full rounded-2xl border border-teal-900/10 bg-white py-4 pl-12 pr-4 text-base shadow-sm outline-none focus:border-teal-600/40 focus:ring-2 focus:ring-teal-500/20"
          aria-label="Site search"
          autoFocus
        />
      </div>

      {!query.trim() && (
        <p className="mt-6 text-sm text-[#5a6b62]">
          Try searching for “refill”, “vaccination”, “delivery”, “blood pressure”, or “insurance”.
        </p>
      )}

      {query.trim() && (
        <p className="mt-6 text-sm text-[#5a6b62]">
          {total === 0 ? "No results for" : `${total} result${total === 1 ? "" : "s"} for`}{" "}
          <span className="font-semibold text-[#0c1a14]">“{query}”</span>
        </p>
      )}

      {query.trim() && total > 0 && (
        <div className="mt-8 space-y-10">
          {results.services.length > 0 && (
            <ResultGroup title="Services">
              {results.services.map((s) => (
                <ResultCard
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  title={s.title}
                  body={s.short}
                />
              ))}
            </ResultGroup>
          )}
          {results.categories.length > 0 && (
            <ResultGroup title="Medicine categories">
              {results.categories.map((c) => (
                <ResultCard
                  key={c.slug}
                  href={`/medicines/${c.slug}`}
                  title={c.title}
                  body={c.description}
                />
              ))}
            </ResultGroup>
          )}
          {results.articles.length > 0 && (
            <ResultGroup title="Health articles">
              {results.articles.map((a) => (
                <ResultCard
                  key={a.slug}
                  href={`/health/${a.slug}`}
                  title={a.title}
                  body={a.excerpt}
                  meta={a.category}
                />
              ))}
            </ResultGroup>
          )}
          {results.faqs.length > 0 && (
            <ResultGroup title="FAQs">
              {results.faqs.map((f) => (
                <ResultCard
                  key={f.question}
                  href="/faq"
                  title={f.question}
                  body={f.answer}
                  meta={f.category}
                />
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ResultCard({
  href,
  title,
  body,
  meta,
}: {
  href: string;
  title: string;
  body: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="card-lift block rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm transition hover:border-teal-700/15"
    >
      {meta && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">{meta}</p>
      )}
      <p
        className="mt-1 text-base font-semibold text-[#0c1a14]"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </p>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#5a6b62]">{body}</p>
    </Link>
  );
}
