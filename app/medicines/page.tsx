import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Layers3, Pill, Store } from "lucide-react";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import MedicinesBrowseTools from "../components/MedicinesBrowseTools";
import { MedicineCatalogGrid, type MedicineCatalogItem } from "../components/MedicineCatalogCard";
import { Pagination } from "../components/Pagination";
import { parsePageParam } from "../lib/pagination";
import { platform } from "../lib/data";
import { listNetworkMedicineListings } from "../lib/services/network-catalog";

export const metadata: Metadata = {
  title: "Medicines",
  description: `Browse medicines listed by active pharmacies across ${platform.name}. Compare availability, price and pharmacy before choosing where to continue.`,
  alternates: { canonical: "/medicines" },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

function categoryEmoji(slug: string) {
  const emojis: Record<string, string> = {
    "pain-relief": "🧠",
    "cold-flu": "🫁",
    "allergy-treatments": "🌿",
    "digestive-health": "🫄",
    "first-aid": "🩹",
    "topical-treatments": "🧴",
    "skin-care": "✨",
    antiseptics: "🧪",
    "wound-care": "🩹",
    "oral-care": "🦷",
    "feminine-hygiene": "🌸",
    "baby-care": "👶",
    "medical-consumables": "🩺",
    "nutritional-products": "⚡",
  };
  return emojis[slug] || "💊";
}

function medicinesHref(params: { q?: string; category?: string; pharmacy?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.category && params.category !== "all") sp.set("category", params.category);
  if (params.pharmacy) sp.set("pharmacy", params.pharmacy);
  const query = sp.toString();
  return query ? `/medicines?${query}` : "/medicines";
}

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; pharmacy?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const category = sp.category?.trim() || undefined;
  const pharmacySlug = sp.pharmacy?.trim().toLowerCase() || undefined;
  const requestedPage = Math.max(1, Number.parseInt(sp.page || "1", 10) || 1);

  let catalogue = await listNetworkMedicineListings({
    q,
    category,
    pharmacySlug,
    skip: (requestedPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }).catch(() => ({ total: 0, items: [], categories: [], selectedPharmacy: null }));

  const page = parsePageParam(sp.page, catalogue.total, PAGE_SIZE);
  if (page !== requestedPage && catalogue.total > 0) {
    catalogue = await listNetworkMedicineListings({
      q,
      category,
      pharmacySlug,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }).catch(() => catalogue);
  }

  const { total, categories, selectedPharmacy } = catalogue;
  const catalogItems: MedicineCatalogItem[] = catalogue.items;
  const hasFilters = Boolean(q || (category && category !== "all") || pharmacySlug);
  const selectedCategory = categories.find((item) => item.slug === category)?.name;
  const location = selectedPharmacy
    ? [selectedPharmacy.city, selectedPharmacy.county].filter(Boolean).join(", ")
    : "";

  return (
    <div>
      <PageHero
        eyebrow="Aether medicine marketplace"
        title="Browse medicine first. Choose the pharmacy second."
        description="Compare public medicine listings across the network without picking a pharmacy up front. Every listing shows the pharmacy behind it, so you always know where price and stock are coming from."
        crumbs={[{ label: "Medicines" }]}
      />

      <section className="px-4 pb-5 sm:px-6 sm:pb-7">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Marketplace shortcuts" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <Link href="/medicines" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-3 text-xs font-semibold text-white shadow-sm">
              <Pill className="h-4 w-4" aria-hidden /> Medicines
            </Link>
            <Link href="/services" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]">
              <Layers3 className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Services
            </Link>
            <Link href="/pharmacies" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]">
              <Store className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Pharmacies
            </Link>
          </nav>
        </div>
      </section>

      {pharmacySlug ? (
        <section className="px-4 pb-5 sm:px-6 sm:pb-7">
          <div className="mx-auto max-w-6xl">
            {selectedPharmacy ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--brand-tint)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--card)] text-[var(--brand)] shadow-sm">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">Shopping this pharmacy</p>
                    <p className="truncate text-sm font-bold text-[var(--foreground)] sm:text-base">{selectedPharmacy.name}</p>
                    {location ? <p className="mt-0.5 text-xs text-[var(--muted)]">{location}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/p/${selectedPharmacy.slug}`} className="inline-flex min-h-10 items-center rounded-xl bg-[var(--brand)] px-3.5 text-xs font-semibold text-white">
                    View pharmacy
                  </Link>
                  <Link href={medicinesHref({ q, category })} className="inline-flex min-h-10 items-center rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--foreground)]">
                    Browse all pharmacies
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-[var(--foreground)]">
                That pharmacy is not currently available in the public marketplace. <Link href={medicinesHref({ q, category })} className="font-semibold text-[var(--brand)] underline underline-offset-4">Browse all medicine listings</Link>.
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section id="medicine-search" className="scroll-mt-28 px-4 pb-8 sm:px-6 sm:pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.7fr)] lg:items-start">
            <article className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">Search the network</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                  Find a medicine by name, brand or category
                </h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)] sm:text-sm">
                  Results are separate pharmacy listings, so the same medicine can appear more than once when multiple pharmacies stock it.
                </p>
              </div>
              <MedicinesBrowseTools
                q={q}
                category={category}
                categoryOptions={categories}
                photoSearchEnabled={false}
                preserveParams={{ pharmacy: selectedPharmacy?.slug }}
              />
            </article>

            <aside className="rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">Prefer a pharmacy?</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
                Shop by pharmacy instead
              </h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Open the pharmacy directory to search by area, delivery, medicine category or pharmacy name, then browse that pharmacy directly.
              </p>
              <Link href="/pharmacies" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white shadow-sm">
                Browse pharmacies <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <section id="medicine-categories" className="scroll-mt-28 px-4 pb-9 sm:px-6 sm:pb-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">Browse by need</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                  Health categories across the network
                </h2>
              </div>
              {category ? (
                <Link href={medicinesHref({ q, pharmacy: selectedPharmacy?.slug })} className="shrink-0 text-xs font-semibold text-[var(--brand)] hover:underline">
                  Clear category
                </Link>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((item) => {
                const active = item.slug === category;
                return (
                  <Link
                    key={item.slug}
                    href={medicinesHref({ category: item.slug, pharmacy: selectedPharmacy?.slug })}
                    className={`group flex min-w-0 items-center gap-2.5 rounded-2xl border p-3 transition sm:p-3.5 ${active ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-sm" : "border-[var(--line-2)] bg-[var(--card)] hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-sm"}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--card-elev)] text-lg" aria-hidden>{categoryEmoji(item.slug)}</span>
                    <span className="line-clamp-2 text-xs font-semibold leading-tight text-[var(--foreground)] sm:text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section id="medicine-stock" className="scroll-mt-28 px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">{selectedPharmacy ? selectedPharmacy.name : "Aether network"}</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl" style={{ fontFamily: "var(--font-display), serif" }}>
                {hasFilters ? "Medicine results" : "Available medicine listings"}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm">
                {total} {total === 1 ? "public listing" : "public listings"}{q ? ` matching “${q}”` : ""}{selectedCategory ? ` · ${selectedCategory}` : ""}. Pharmacy and location are shown on every card.
              </p>
            </div>
            {hasFilters ? (
              <Link href={selectedPharmacy ? `/medicines?pharmacy=${selectedPharmacy.slug}` : "/medicines"} className="inline-flex min-h-10 w-fit items-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]">
                Clear search filters
              </Link>
            ) : null}
          </div>

          {catalogItems.length > 0 ? (
            <>
              <MedicineCatalogGrid items={catalogItems} />
              <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/medicines" queryParams={{ q, category, pharmacy: selectedPharmacy?.slug }} variant="portal" />
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--line-2)] bg-[var(--card)] px-5 py-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-2xl" aria-hidden>🔎</div>
              <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">No medicine listings matched</p>
              <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-[var(--muted)]">Try a shorter medicine or brand name, switch category, or browse pharmacies directly.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/medicines" className="inline-flex min-h-10 items-center rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white">Browse all medicines</Link>
                <Link href="/pharmacies" className="inline-flex min-h-10 items-center rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--foreground)]">Browse pharmacies</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <CtaBanner
        title="Want to shop from one pharmacy only?"
        description="Use the pharmacy directory to choose by location, delivery or services, then open that pharmacy's storefront."
        primaryHref="/pharmacies"
        primaryLabel="Shop by pharmacy"
        secondaryHref="/services"
        secondaryLabel="Browse services"
      />
    </div>
  );
}
