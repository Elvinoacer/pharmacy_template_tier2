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
    <section className="relative overflow-hidden px-4 pb-10 pt-32 sm:px-6 sm:pt-36 sm:pb-12">
      <div className="hero-glow -left-20 top-10 opacity-60" />
      <div className="relative mx-auto max-w-6xl">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[#5a6b62]">
              <li>
                <Link href={homeHref} className="hover:text-teal-800">
                  Home
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  <span aria-hidden>/</span>
                  {c.href && i < crumbs.length - 1 ? (
                    <Link href={tenantHref(slug, c.href)} className="hover:text-teal-800">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-[#0c1a14]">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">{eyebrow}</p>
        )}
        <h1
          className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl lg:text-[2.75rem]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#5a6b62] sm:text-lg">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
