"use client";

import Link from "next/link";
import { tenantHref, useTenantSlug } from "./TenantLink";

type Crumb = { label: string; href?: string };

export default function PageHero({
  eyebrow,
  title,
  description,
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
}) {
  const slug = useTenantSlug();
  const homeHref = tenantHref(slug, "/");

  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-28 text-[var(--foreground)] transition-colors duration-300 sm:px-6 sm:pb-12 sm:pt-36">
      {/* Ambient glass depth — same family as the storefront hero mesh */}
      <div className="hero-mesh-bg absolute inset-0 -z-10 opacity-45" aria-hidden />
      <div className="hero-glow -left-20 top-10 opacity-60" aria-hidden />
      <div
        className="hero-glow right-0 top-24 opacity-50"
        style={{ background: "radial-gradient(circle, rgba(201,162,39,0.18) 0%, transparent 70%)" }}
        aria-hidden
      />

      <div className="page-hero-glass relative mx-auto max-w-6xl border border-[var(--line-2)]">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4 sm:mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)] sm:text-xs">
              <li>
                <Link href={homeHref} className="transition-colors hover:text-[var(--brand)]">
                  Home
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex min-w-0 items-center gap-1.5">
                  <span aria-hidden className="text-[var(--muted-2)]">/</span>
                  {c.href && i < crumbs.length - 1 ? (
                    <Link
                      href={tenantHref(slug, c.href)}
                      className="min-w-0 truncate transition-colors hover:text-[var(--brand)]"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="min-w-0 truncate font-medium text-[var(--foreground)]">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
            {eyebrow}
          </p>
        )}

        <h1
          className="mt-2 max-w-3xl text-balance text-[2rem] font-semibold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-4xl lg:text-[2.75rem]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h1>

        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-lg sm:leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
