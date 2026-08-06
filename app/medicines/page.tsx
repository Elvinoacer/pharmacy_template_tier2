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
import { pharmacy } from "../lib/data";
import { prisma } from "../lib/db";
import { listPublicCategories } from "../lib/medication-categories";

export const metadata: Metadata = {
  title: "Medicines & Health Categories",
  description: `Browse OTC health categories at ${pharmacy.name}. Educational guidance plus live stock for OTC products. Search by name or snap a pack photo.`,
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

  // Filter options: public categories + any DB slugs in use.
  const filterOptions = publicCategories.map((c) => ({
    slug: c.slug,
    name: c.name,
  }));

  return (
    <div>
      <PageHero
        eyebrow="Medicines & health"
        title="Categories to help you find the right care"
        description="Browse stocked OTC products and educational categories. Search by name, or snap a pack photo — we’ll match it to live stock. Reserve OTC online with no account, or sign in for M-Pesa checkout, refills, and loyalty."
        crumbs={[{ label: "Medicines" }]}
      />

      <section className="px-4 pb-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <MedicinesBrowseTools
            q={q}
            category={category}
            categoryOptions={filterOptions}
            initialPhotoOpen={initialPhotoOpen}
          />
        </div>
      </section>

      {catalogItems.length > 0 && (
        <section className="px-4 pb-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2
              className="mb-4 text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Available now ({total})
            </h2>
            <MedicineCatalogGrid items={catalogItems} />

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

      {catalogItems.length === 0 && (q || category) && (
        <section className="px-4 pb-12 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-2xl border border-[#e3ebe6] bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#0c1a14]">No medicines matched that search</p>
            <p className="mt-1 text-xs text-[#5a6b62]">
              Try another name, clear filters, or use photo search above to match a pack you have at home.
            </p>
          </div>
        </section>
      )}

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2
            className="mb-4 text-xl font-semibold text-[#0c1a14]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Browse by category
          </h2>
          {publicCategories.length === 0 ? (
            <div className="rounded-2xl border border-[#e3ebe6] bg-white px-6 py-10 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#0c1a14]">Categories coming soon</p>
              <p className="mt-1 text-xs text-[#5a6b62]">
                Ask our pharmacists for guidance, or search products above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {publicCategories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/medicines/${c.slug}`}
                  className="card-lift group overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm"
                >
                  <div className="relative h-40 overflow-hidden bg-[#eef5f1]">
                    {c.imageUrl ? (
                      <Image
                        src={c.imageUrl}
                        alt={c.name}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl opacity-30">
                        💊
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <h3
                      className="absolute bottom-3 left-3 right-3 text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {c.name}
                    </h3>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-3 text-sm leading-relaxed text-[#5a6b62]">
                      {c.description || "Browse products and pharmacist guidance in this category."}
                    </p>
                    {c.publicMedCount > 0 && (
                      <p className="mt-2 text-xs font-semibold text-teal-800">
                        {c.publicMedCount} product{c.publicMedCount === 1 ? "" : "s"} listed
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBanner
        title="Need help choosing an OTC product?"
        description="Our pharmacists are happy to recommend safe options that fit your health history — or snap a pack photo above and we’ll check the shelves with you."
      />
    </div>
  );
}
