"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SearchAssistFallback from "./assist/SearchAssistFallback";

export type SearchCorpus = {
  medicines: Array<{ slug: string; title: string; body: string; meta?: string }>;
  services: Array<{ slug: string; title: string; body: string }>;
  vaccines: Array<{ slug: string; title: string; body: string; meta?: string }>;
  categories: Array<{ slug: string; title: string; body: string }>;
  articles: Array<{ slug: string; title: string; body: string; meta?: string }>;
  faqs: Array<{ question: string; answer: string; category?: string }>;
};

export type SearchResults = {
  medicines: Array<{ slug: string; title: string; body: string; meta?: string; href: string }>;
  services: Array<{ slug: string; title: string; body: string; href: string }>;
  vaccines: Array<{ slug: string; title: string; body: string; meta?: string; href: string }>;
  categories: Array<{ slug: string; title: string; body: string; href: string }>;
  articles: Array<{ slug: string; title: string; body: string; meta?: string; href: string }>;
};

function matches(haystacks: Array<string | undefined | null>, q: string): boolean {
  const needle = q.toLowerCase();
  return haystacks.some((h) => (h || "").toLowerCase().includes(needle));
}

function search(corpus: SearchCorpus, base: string, q: string): SearchResults {
  const query = q.trim();
  if (!query) {
    return {
      medicines: corpus.medicines.slice(0, 8).map((m) => ({ ...m, href: `${base}/medicines/${m.slug}` })),
      services: corpus.services.slice(0, 6).map((s) => ({ ...s, href: `${base}/services/${s.slug}` })),
      vaccines: corpus.vaccines.slice(0, 6).map((v) => ({ ...v, href: `${base}/vaccinations/${v.slug}` })),
      categories: corpus.categories.slice(0, 6).map((c) => ({ ...c, href: `${base}/medicines/${c.slug}` })),
      articles: corpus.articles.slice(0, 4).map((a) => ({ ...a, href: `${base}/health/${a.slug}` })),
    };
  }
  return {
    medicines: corpus.medicines
      .filter((m) => matches([m.title, m.body, m.meta], query))
      .slice(0, 10)
      .map((m) => ({ ...m, href: `${base}/medicines/${m.slug}` })),
    services: corpus.services
      .filter((s) => matches([s.title, s.body], query))
      .slice(0, 6)
      .map((s) => ({ ...s, href: `${base}/services/${s.slug}` })),
    vaccines: corpus.vaccines
      .filter((v) => matches([v.title, v.body, v.meta], query))
      .slice(0, 6)
      .map((v) => ({ ...v, href: `${base}/vaccinations/${v.slug}` })),
    categories: corpus.categories
      .filter((c) => matches([c.title, c.body], query))
      .slice(0, 6)
      .map((c) => ({ ...c, href: `${base}/medicines/${c.slug}` })),
    articles: corpus.articles
      .filter((a) => matches([a.title, a.body, a.meta], query))
      .slice(0, 5)
      .map((a) => ({ ...a, href: `${base}/health/${a.slug}` })),
  };
}

export default function SearchPanel({
  base,
  corpus,
  initial,
  initialQuery = "",
}: {
  base: string;
  corpus: SearchCorpus;
  initial: SearchResults;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [touched, setTouched] = useState(false);
  const results = useMemo(
    () => (touched ? search(corpus, base, query) : initial),
    [corpus, base, query, touched, initial],
  );
  const faqHits = useMemo(
    () =>
      query.trim()
        ? corpus.faqs.filter((f) => matches([f.question, f.answer, f.category], query)).slice(0, 5)
        : [],
    [corpus.faqs, query],
  );
  const total =
    results.medicines.length +
    results.services.length +
    results.vaccines.length +
    results.categories.length +
    results.articles.length +
    faqHits.length;

  return (
    <div>
      <form
        action={`${base}/search`}
        method="GET"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
        }}
      >
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
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setTouched(true);
            }}
            placeholder="Search medicines, services, vaccines, articles…"
            className="w-full rounded-2xl border border-teal-900/10 bg-white py-4 pl-12 pr-28 text-base shadow-sm outline-none focus:border-teal-600/40 focus:ring-2 focus:ring-teal-500/20"
            aria-label="Search this pharmacy"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-[#0d6e5a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#084c3f]"
          >
            Search
          </button>
        </div>
      </form>

      {!query.trim() && (
        <p className="mt-6 text-sm text-[#5a6b62]">
          Try “refill”, “vaccination”, “delivery”, “blood pressure”, or a medicine name — results come
          from this pharmacy&apos;s live catalogue.
        </p>
      )}

      {query.trim() && (
        <p className="mt-6 text-sm text-[#5a6b62]" role="status" aria-live="polite">
          {total === 0 ? "No results for" : `${total} result${total === 1 ? "" : "s"} for`}{" "}
          <span className="font-semibold text-[#0c1a14]">“{query}”</span>
        </p>
      )}

      {query.trim() && total === 0 && (
        <SearchAssistFallback query={query} base={base} />
      )}

      {(query.trim() || !touched) && total > 0 && (
        <div className="mt-8 space-y-10">
          {results.medicines.length > 0 && (
            <ResultGroup title="Medicines">
              {results.medicines.map((m) => (
                <ResultCard key={m.slug} href={m.href} title={m.title} body={m.body} meta={m.meta} />
              ))}
            </ResultGroup>
          )}
          {results.services.length > 0 && (
            <ResultGroup title="Services">
              {results.services.map((s) => (
                <ResultCard key={s.slug} href={s.href} title={s.title} body={s.body} />
              ))}
            </ResultGroup>
          )}
          {results.vaccines.length > 0 && (
            <ResultGroup title="Vaccines">
              {results.vaccines.map((v) => (
                <ResultCard key={v.slug} href={v.href} title={v.title} body={v.body} meta={v.meta} />
              ))}
            </ResultGroup>
          )}
          {results.categories.length > 0 && (
            <ResultGroup title="Medicine categories">
              {results.categories.map((c) => (
                <ResultCard key={c.slug} href={c.href} title={c.title} body={c.body} />
              ))}
            </ResultGroup>
          )}
          {results.articles.length > 0 && (
            <ResultGroup title="Health articles">
              {results.articles.map((a) => (
                <ResultCard key={a.slug} href={a.href} title={a.title} body={a.body} meta={a.meta} />
              ))}
            </ResultGroup>
          )}
          {faqHits.length > 0 && (
            <ResultGroup title="FAQs">
              {faqHits.map((f) => (
                <ResultCard
                  key={f.question}
                  href={`${base}/faq`}
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
