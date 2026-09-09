import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import MedicinesBrowseTools from "../components/MedicinesBrowseTools";
import {
  MedicineCatalogGrid,
  type MedicineCatalogItem,
} from "../components/MedicineCatalogCard";
import { Pagination } from "../components/Pagination";
import { parsePageParam } from "../lib/pagination";
import { platform } from "../lib/data";
import { prisma } from "../lib/db";
import { listPublicCategories } from "../lib/medication-categories";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";

export const metadata: Metadata = {
  title: "Medicines & Health Categories",
  description: `Browse OTC health categories at ${platform.name}. Educational guidance plus live stock for OTC products. Search by name or snap a pack photo.`,
  alternates: { canonical: "/medicines" },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

function toCatalogItem(m: {
  id: string;
  slug: string;
  price: { toString(): string } | number;
  currentStock: number;
  overTheCounter: boolean;
  prescriptionRequired: boolean;
  medicationMaster: {
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
  } | null;
}): MedicineCatalogItem | null {
  const master = m.medicationMaster;
  if (!master) return null;
  const priceNum =
    typeof m.price === "number" ? m.price : Number(m.price.toString());
  return {
    id: m.id,
    slug: m.slug,
    price: Number.isFinite(priceNum) ? priceNum : 0,
    currentStock: m.currentStock,
    overTheCounter: m.overTheCounter,
    prescriptionRequired: m.prescriptionRequired,
    medicationMaster: {
      name: master.name,
      description: master.description,
      category: master.category,
      imageUrl: master.imageUrl,
    },
  };
}

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; photo?: string }>;
}) {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/medicines" />;

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const category = sp.category || undefined;
  const initialPhotoOpen = sp.photo === "1" || sp.photo === "true";

  const masterWhere: Record<string, unknown> = {};
  if (category && category !== "all") {
    masterWhere.category = category;
  }
  if (q) {
    masterWhere.OR = [
      { name: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ];
  }

  const where = {
    publicListing: true,
    active: true,
    ...(Object.keys(masterWhere).length > 0 ? { medicationMaster: masterWhere } : {}),
  };

  const masterInclude = {
    medicationMaster: {
      select: {
        name: true,
        description: true,
        category: true,
        imageUrl: true,
      },
    },
  };

  const [total, medications, publicCategories] = await Promise.all([
    prisma.pharmacyInventory.count({ where }).catch(() => 0),
    prisma.pharmacyInventory
      .findMany({
        where,
        include: masterInclude,
        orderBy: [{ currentStock: "desc" }],
        take: PAGE_SIZE,
      })
      .catch(() => []),
    listPublicCategories().catch(() => []),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged =
    page === 1
      ? medications
      : await prisma.pharmacyInventory
          .findMany({
            where,
            include: masterInclude,
            orderBy: [{ currentStock: "desc" }],
            take: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE,
          })
          .catch(() => []);

  const catalogItems = paged
    .map(toCatalogItem)
    .filter((x): x is MedicineCatalogItem => x !== null);

  const filterOptions = publicCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  const hasActiveFilters = Boolean(q || (category && category !== "all"));
  const selectedCategoryName = filterOptions.find(
    (option) => option.slug === category,
  )?.name;
  const activeFilterSummary = [q ? `“${q}”` : null, selectedCategoryName]
    .filter(Boolean)
    .join(" · ");

  const categorySection = (
    <section id="medicine-categories" className="scroll-mt-32 px-4 pb-10 sm:px-6 sm:pb-14">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
              Browse by need
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Shop by health category
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
              Start with the health need you recognise, then compare the products currently listed by {pharmacy.name}.
            </p>
          </div>
          <a
            href="#medicine-search"
            className="inline-flex min-h-10 w-fit items-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
          >
            Search by name instead ↑
          </a>
        </div>

        {publicCategories.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-5 py-8 text-center shadow-sm sm:px-6 sm:py-10">
            <p className="text-sm font-semibold text-[var(--foreground)]">Categories coming soon</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Search products above or ask our pharmacists for guidance.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {publicCategories.map((c) => {
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
                "oral-care": "👄",
                "feminine-hygiene": "🌸",
                "baby-care": "👶",
                "medical-consumables": "🩺",
                "nutritional-products": "⚡",
              };
              const emoji = emojis[c.slug] || "💊";

              return (
                <Link
                  key={c.slug}
                  href={`/medicines/${c.slug}`}
                  className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand)_42%,var(--line-2))] hover:shadow-md sm:gap-3 sm:p-3.5"
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-elev)] text-xl sm:h-12 sm:w-12">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt=""
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="48px"
                      />
                    ) : (
                      <span aria-hidden>{emoji}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block line-clamp-2 text-xs font-bold leading-tight text-[var(--foreground)] sm:text-sm"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {c.name}
                    </span>
                    <span className="mt-1 block text-[10px] font-medium text-[var(--muted)] sm:text-[11px]">
                      {c.publicMedCount > 0
                        ? `${c.publicMedCount} ${c.publicMedCount === 1 ? "product" : "products"}`
                        : "View guidance"}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--brand)] transition-transform group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );

  const stockSection = (
    <section id="medicine-stock" className="scroll-mt-32 px-4 pb-12 sm:px-6 sm:pb-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
              Live stock · {pharmacy.name}
            </p>
            <h2
              className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {hasActiveFilters ? "Search results" : "Available medicines"}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
              {hasActiveFilters
                ? `${total} ${total === 1 ? "match" : "matches"}${activeFilterSummary ? ` for ${activeFilterSummary}` : ""}.`
                : `${total} ${total === 1 ? "listed product" : "listed products"}, with in-stock items shown first.`}
            </p>
          </div>
          {hasActiveFilters && (
            <Link
              href="/medicines"
              className="inline-flex min-h-10 w-fit items-center rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
            >
              Clear search
            </Link>
          )}
        </div>

        {catalogItems.length > 0 ? (
          <>
            <MedicineCatalogGrid items={catalogItems} />
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              basePath="/medicines"
              queryParams={{ q, category }}
              variant="portal"
            />
          </>
        ) : (
          <div className="rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-5 py-8 text-center shadow-sm sm:px-6 sm:py-10">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--card-elev)] text-xl" aria-hidden>
              🔎
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              {hasActiveFilters ? "No medicines matched that search" : "No medicines are listed yet"}
            </p>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-[var(--muted)]">
              {hasActiveFilters
                ? "Try a shorter medicine name, choose another category, or use photo search to match a pack you already have."
                : "Check back soon, browse health categories, or contact the pharmacy for help finding a product."}
            </p>
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/medicines" className="btn-primary !min-h-10 !px-4 !py-2 text-xs">
                  Clear search
                </Link>
                <Link href="/medicines?photo=1" className="btn-ghost !min-h-10 !px-4 !py-2 text-xs">
                  Try photo search
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div>
      <PageHero
        eyebrow="Medicines & health"
        title="Find the medicine you need, faster"
        description={`Search live stock at ${pharmacy.name}, browse by health need, or snap a pack photo to find a match. OTC and prescription-required products stay clearly labelled.`}
        crumbs={[{ label: "Medicines" }]}
      />

      <section id="medicine-search" className="scroll-mt-32 px-4 pb-8 sm:px-6 sm:pb-10">
        <div className="mx-auto max-w-6xl">
          <nav
            aria-label="Medicine page sections"
            className="mb-3 flex max-w-full gap-2 overflow-x-auto pb-1 text-xs font-semibold sm:mb-4"
          >
            <a
              href="#medicine-search"
              className="shrink-0 rounded-full bg-[var(--brand)] px-3.5 py-2 text-white shadow-sm"
            >
              Search medicines
            </a>
            <a
              href="#medicine-categories"
              className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-2 text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
            >
              Browse categories
            </a>
            <a
              href="#medicine-stock"
              className="shrink-0 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 py-2 text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
            >
              View live stock
            </a>
          </nav>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)] lg:items-start">
            <article className="min-w-0 rounded-3xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
                    Search live inventory
                  </p>
                  <h2
                    className="mt-1 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    What are you looking for?
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                    Type a medicine name, narrow by category, or use a photo of the pack. Results come from this pharmacy’s public stock list.
                  </p>
                </div>
                <span className="inline-flex min-h-8 w-fit shrink-0 items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-[var(--card-elev)] px-2.5 text-[10px] font-bold uppercase tracking-wide text-[var(--brand-deep)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  {pharmacy.name}
                </span>
              </div>

              <MedicinesBrowseTools
                q={q}
                category={category}
                categoryOptions={filterOptions}
                initialPhotoOpen={initialPhotoOpen}
              />
            </article>

            <aside className="rounded-3xl border border-[var(--line-2)] bg-[linear-gradient(145deg,var(--brand-soft),var(--card)_55%,var(--accent-soft))] p-4 shadow-sm sm:p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)] text-lg text-white shadow-sm" aria-hidden>
                💡
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
                Need guidance?
              </p>
              <h2
                className="mt-1 text-lg font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Not sure what product you need?
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                Start with symptoms and safety guidance instead of guessing a medicine.
              </p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/health/self-care-guide"
                  className="btn-primary !min-h-11 !w-full !justify-center !px-4 !py-2.5 text-xs font-semibold"
                >
                  Self-care vs doctor guide
                </Link>
                <Link
                  href="/how-do-you-feel"
                  className="btn-ghost !min-h-11 !w-full !justify-center !px-4 !py-2.5 text-xs font-semibold"
                >
                  AI symptom check
                </Link>
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted-2)]">
                Educational support only. Urgent or severe symptoms should be assessed by a clinician.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {hasActiveFilters ? (
        <>
          {stockSection}
          {categorySection}
        </>
      ) : (
        <>
          {categorySection}
          {stockSection}
        </>
      )}

      <CtaBanner
        title="Still not sure which medicine is right?"
        description="Ask a pharmacist for help choosing a safe OTC option that fits your symptoms, medicines, and health history."
      />
    </div>
  );
}
