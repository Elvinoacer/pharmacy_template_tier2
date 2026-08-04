import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import PageHero from "../components/PageHero";
import { Pagination } from "../components/Pagination";
import { parsePageParam } from "../lib/pagination";
import { categories, pharmacy } from "../lib/data";
import { prisma } from "../lib/db";
import { formatPrice } from "../lib/format";

export const metadata: Metadata = {
  title: "Medicines & Health Categories",
  description: `Browse OTC health categories at ${pharmacy.name}. Educational guidance plus live stock for OTC products.`,
  alternates: { canonical: "/medicines" },
};

const PAGE_SIZE = 24;

export default async function MedicinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const category = sp.category || undefined;

  // Pull public-listed medications (admin marks these as visible without login).
  // Category + name/description live on MedicationMaster; everything else stays
  // on PharmacyInventory. We build a nested where + include.
  const where = {
    publicListing: true,
    active: true,
    ...(category && category !== "all"
      ? { medicationMaster: { category } }
      : {}),
    ...(q
      ? {
          medicationMaster: {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
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
  } as const;

  const [total, medications] = await Promise.all([
    prisma.pharmacyInventory.count({ where }).catch(() => 0),
    prisma.pharmacyInventory
      .findMany({
        where,
        include: masterInclude,
        orderBy: [{ currentStock: "desc" }, { medicationMaster: { name: "asc" } }],
        take: PAGE_SIZE,
      })
      .catch(() => []),
  ]);

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged =
    page === 1
      ? medications
      : await prisma.pharmacyInventory
          .findMany({
            where,
            include: masterInclude,
            orderBy: [{ currentStock: "desc" }, { medicationMaster: { name: "asc" } }],
            take: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE,
          })
          .catch(() => []);

  // Build the category list from existing categories + any from the DB.
  // Category lives on MedicationMaster; query distinct master categories whose
  // pharmacyInventory is public+active.
  const dbCategories = await prisma.medicationMaster
    .findMany({
      where: { pharmacyInventory: { some: { publicListing: true, active: true } } },
      select: { category: true },
      distinct: ["category"],
    })
    .catch(() => []);
  const dbCategorySlugs = dbCategories.map((c) => c.category);

  return (
    <div>
      <PageHero
        eyebrow="Medicines & health"
        title="Categories to help you find the right care"
        description="Browse stocked OTC products and educational categories. Reserve OTC online with no account, or sign in for M-Pesa checkout, refills, and loyalty."
        crumbs={[{ label: "Medicines" }]}
      />

      {/* Search + filter */}
      <section className="px-4 pb-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <input
                name="q"
                defaultValue={q || ""}
                placeholder="Search medications by name or description…"
                className="w-full rounded-full border border-[#e3ebe6] bg-white py-2.5 pl-4 pr-4 text-sm text-[#0c1a14] shadow-sm outline-none focus:border-[#0d6e5a]/40 focus:ring-2 focus:ring-[#0d6e5a]/20"
              />
            </div>
            <select
              name="category"
              defaultValue={category || "all"}
              onChange={(e) => {
                const v = e.target.value;
                window.location.href = v === "all"
                  ? q ? `/medicines?q=${encodeURIComponent(q)}` : "/medicines"
                  : `/medicines?category=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
              }}
              className="rounded-full border border-[#e3ebe6] bg-white py-2.5 pl-4 pr-8 text-sm text-[#0c1a14]"
            >
              <option value="all">All categories</option>
              {dbCategorySlugs.map((c) => (
                <option key={c} value={c}>{c.replace(/-/g, " ")}</option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0d6e5a] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#084c3f]"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Live OTC catalog */}
      {paged.length > 0 && (
        <section className="px-4 pb-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2
              className="mb-4 text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Available now ({total})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {paged.map((m) => (
                <Link
                  key={m.id}
                  href={`/medicines/${m.slug}`}
                  className="card-lift group overflow-hidden rounded-2xl border border-[#e3ebe6] bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative h-32 overflow-hidden bg-[#f4f7f4]">
                    {m.medicationMaster.imageUrl ? (
                      <Image
                        src={m.medicationMaster.imageUrl}
                        alt={m.medicationMaster.name}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">💊</div>
                    )}
                    {m.overTheCounter && (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                        OTC
                      </span>
                    )}
                    {m.prescriptionRequired && !m.overTheCounter && (
                      <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                        Rx required
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#0d6e5a]">
                      {m.medicationMaster.category.replace(/-/g, " ")}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-[#0c1a14]">{m.medicationMaster.name}</h3>
                    {m.medicationMaster.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#5a6b62]">{m.medicationMaster.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-[#0c1a14]">KES {formatPrice(Number(m.price))}</span>
                      <span className={`text-[10px] ${m.currentStock > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {m.currentStock > 0 ? `${m.currentStock} in stock` : "out of stock"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              basePath="/medicines"
              queryParams={{ q, category }}
              variant="portal"
            />
          </div>
        </section>
      )}

      {/* Educational categories */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2
            className="mb-4 text-xl font-semibold text-[#0c1a14]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Browse by category
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/medicines/${c.slug}`}
                className="card-lift group overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm"
              >
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={c.image}
                    alt={c.title}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <h3
                    className="absolute bottom-3 left-3 right-3 text-lg font-semibold text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {c.title}
                  </h3>
                </div>
                <p className="p-4 text-sm leading-relaxed text-[#5a6b62] line-clamp-3">{c.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        title="Need help choosing an OTC product?"
        description="Our pharmacists are happy to recommend safe options that fit your health history."
      />
    </div>
  );
}
