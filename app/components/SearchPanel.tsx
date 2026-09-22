"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import SearchAssistFallback from "./assist/SearchAssistFallback";

export type SearchCorpus = {
  medicines: Array<{ slug: string; title: string; body: string; meta?: string; imageUrl?: string | null }>;
  services: Array<{ slug: string; title: string; body: string; imageUrl?: string | null }>;
  vaccines: Array<{ slug: string; title: string; body: string; meta?: string }>;
  categories: Array<{ slug: string; title: string; body: string }>;
  articles: Array<{ slug: string; title: string; body: string; meta?: string }>;
  faqs: Array<{ question: string; answer: string; category?: string }>;
};

export type SearchResults = {
  medicines: Array<{ slug: string; title: string; body: string; meta?: string; imageUrl?: string | null; href: string }>;
  services: Array<{ slug: string; title: string; body: string; imageUrl?: string | null; href: string }>;
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

const suggestions = ["refill", "vaccination", "delivery", "blood pressure"];

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

  useEffect(() => {
    if (!touched) return;
    const t = setTimeout(() => {
      const path = query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search";
      window.history.replaceState(null, "", path);
    }, 250);
    return () => clearTimeout(t);
  }, [query, touched]);

  const results = useMemo(
    () => (touched || initialQuery.trim() ? search(corpus, base, query) : initial),
    [corpus, base, query, touched, initial, initialQuery],
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
    <div className="min-w-0">
      <form
        action={`${base}/search`}
        method="GET"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
        }}
        className="liquid-glass care-glass rounded-2xl border !border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] p-3 shadow-sm backdrop-blur-xl sm:rounded-3xl sm:p-4"
      >
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
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
              placeholder="Search medicines, services, vaccines…"
              className="min-h-12 w-full min-w-0 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card)] py-3 pl-10 pr-3 text-base text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand)_16%,transparent)] sm:text-sm"
              aria-label={base ? "Search this pharmacy" : "Search medicines, services, and vaccines"}
            />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:w-auto"
          >
            Search
          </button>
        </div>
      </form>

      {!query.trim() && (
        <div className="mt-4 sm:mt-5">
          <p className="text-xs leading-5 text-[var(--muted)]">Popular searches</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuery(suggestion);
                  setTouched(true);
                }}
                className="min-h-11 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] px-3.5 text-xs font-semibold capitalize text-[var(--foreground)] backdrop-blur-md transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            Results come from this pharmacy&apos;s live catalogue plus network health information.
          </p>
        </div>
      )}

      {query.trim() && (
        <div className="mt-5 flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] px-3.5 py-3 sm:mt-6 sm:px-4">
          <p className="min-w-0 text-sm text-[var(--muted)]" role="status" aria-live="polite">
            {total === 0 ? "No results for" : `${total} result${total === 1 ? "" : "s"} for`}{" "}
            <span className="break-words font-semibold text-[var(--foreground)]">“{query}”</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTouched(true);
            }}
            className="inline-flex min-h-11 shrink-0 items-center px-2 text-xs font-semibold text-[var(--brand)] hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {query.trim() && total === 0 && <SearchAssistFallback query={query} base={base} />}

      {(query.trim() || !touched) && total > 0 && (
        <div className="mt-7 space-y-8 sm:mt-8 sm:space-y-10">
          {results.medicines.length > 0 && (
            <ResultGroup title="Medicines" count={results.medicines.length}>
              {results.medicines.map((m) => (
                <ResultCard key={m.slug} href={m.href} title={m.title} body={m.body} meta={m.meta} imageUrl={m.imageUrl} imageKind="medicine" />
              ))}
              {query.trim() && (
                <div className="pt-2 text-right">
                  <Link
                    href={`/medicines?q=${encodeURIComponent(query.trim())}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    View all matching medicines in catalogue →
                  </Link>
                </div>
              )}
            </ResultGroup>
          )}
          {results.services.length > 0 && (
            <ResultGroup title="Services" count={results.services.length}>
              {results.services.map((s) => (
                <ResultCard key={s.slug} href={s.href} title={s.title} body={s.body} imageUrl={s.imageUrl} imageKind="service" />
              ))}
            </ResultGroup>
          )}
          {results.vaccines.length > 0 && (
            <ResultGroup title="Vaccines" count={results.vaccines.length}>
              {results.vaccines.map((v) => (
                <ResultCard key={v.slug} href={v.href} title={v.title} body={v.body} meta={v.meta} />
              ))}
            </ResultGroup>
          )}
          {results.categories.length > 0 && (
            <ResultGroup title="Medicine categories" count={results.categories.length}>
              {results.categories.map((c) => (
                <ResultCard key={c.slug} href={c.href} title={c.title} body={c.body} />
              ))}
            </ResultGroup>
          )}
          {results.articles.length > 0 && (
            <ResultGroup title="Health articles" count={results.articles.length}>
              {results.articles.map((a) => (
                <ResultCard key={a.slug} href={a.href} title={a.title} body={a.body} meta={a.meta} />
              ))}
            </ResultGroup>
          )}
          {faqHits.length > 0 && (
            <ResultGroup title="FAQs" count={faqHits.length}>
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

function ResultGroup({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-[0.18em]">
          {title}
        </h2>
        <span className="rounded-full border border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--brand-deep)]">
          {count}
        </span>
      </div>
      <div className="mt-3 grid gap-2.5 sm:gap-3">{children}</div>
    </section>
  );
}

function ResultCard({
  href,
  title,
  body,
  meta,
  imageUrl,
  imageKind,
}: {
  href: string;
  title: string;
  body: string;
  meta?: string;
  imageUrl?: string | null;
  imageKind?: "medicine" | "service";
}) {
  return (
    <Link
      href={href}
      className="liquid-glass care-glass group block min-w-0 rounded-2xl border !border-[color-mix(in_srgb,var(--foreground)_48%,var(--card))] bg-[var(--card-elev)] p-4 shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:p-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        {imageKind && (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--card)] sm:h-20 sm:w-20">
            <Image
              unoptimized
              src={imageUrl || (imageKind === "medicine" ? "/images/care/medicine-still-life.png" : "/images/care/editorial-pharmacy.png")}
              alt={imageUrl ? title : ""}
              fill
              sizes="80px"
              className={imageKind === "medicine" && imageUrl ? "object-contain p-2" : "object-cover"}
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {meta && <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">{meta}</p>}
          <p
            className={`${meta ? "mt-1" : ""} break-words text-[15px] font-semibold leading-5 text-[var(--foreground)] sm:text-base`}
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {title}
          </p>
          {body && <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-relaxed">{body}</p>}
        </div>
        <span className="mt-1 shrink-0 text-lg leading-none text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]" aria-hidden>
          →
        </span>
      </div>
    </Link>
  );
}
