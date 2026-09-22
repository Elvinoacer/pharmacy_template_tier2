import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import SearchPanel, { type SearchCorpus, type SearchResults } from "../components/SearchPanel";
import { prismaUnscoped } from "@/app/lib/db";
import { listPublicServices } from "@/app/lib/services/pharmacy-services";
import { listPublicVaccines } from "@/app/lib/services/vaccination-service";
import { searchVaccines } from "@/app/lib/vaccination-catalog";
import { listPublicCategories } from "@/app/lib/medication-categories";
import { buildPublicInventoryWhere } from "@/app/lib/services/public-medication-visibility";

export const metadata: Metadata = {
  title: "Search",
  description: "Search live medicines, services, vaccines, and medication categories across the Afyvia network.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const base = "";

  let hasError = false;
  let rawMedicines: Array<{
    slug: string;
    overTheCounter: boolean;
    prescriptionRequired: boolean;
    medicationMaster: { name: string; description: string | null; imageUrl: string | null };
  }> = [];
  let rawServices: Array<{ slug: string; title: string; short: string; imageUrl: string | null }> = [];
  let rawVaccines: Array<{ slug: string; name: string; visSummary: string | null; category: string }> = [];
  let rawCategories: Array<{ slug: string; name: string; description: string | null }> = [];

  try {
    const [meds, srvs, vax, cats] = await Promise.all([
      query
        ? prismaUnscoped.pharmacyInventory.findMany({
            where: {
              ...buildPublicInventoryWhere(),
              OR: [
                { medicationMaster: { name: { contains: query, mode: "insensitive" } } },
                { medicationMaster: { genericName: { contains: query, mode: "insensitive" } } },
                { medicationMaster: { brandName: { contains: query, mode: "insensitive" } } },
                { medicationMaster: { description: { contains: query, mode: "insensitive" } } },
                { slug: { contains: query, mode: "insensitive" } },
              ],
            },
            select: {
              slug: true,
              overTheCounter: true,
              prescriptionRequired: true,
              medicationMaster: { select: { name: true, description: true, imageUrl: true } },
            },
            take: 30,
          })
        : prismaUnscoped.pharmacyInventory.findMany({
            where: buildPublicInventoryWhere(),
            select: {
              slug: true,
              overTheCounter: true,
              prescriptionRequired: true,
              medicationMaster: { select: { name: true, description: true, imageUrl: true } },
            },
            take: 12,
          }),
      query
        ? prismaUnscoped.pharmacyService.findMany({
            where: {
              active: true,
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { short: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
              ],
            },
            select: { slug: true, title: true, short: true, imageUrl: true },
            take: 12,
          })
        : listPublicServices().then((list) => list.slice(0, 8)),
      query
        ? Promise.resolve(
            searchVaccines(query).map((v) => ({
              slug: v.slug,
              name: v.name,
              visSummary: v.visSummary || null,
              category: v.category,
            })),
          )
        : listPublicVaccines().then((list) =>
            list.slice(0, 8).map((v) => ({
              slug: v.slug,
              name: v.name,
              visSummary: v.visSummary || null,
              category: v.category,
            })),
          ),
      listPublicCategories().then((list) =>
        query
          ? list
              .filter(
                (c) =>
                  c.name.toLowerCase().includes(query.toLowerCase()) ||
                  (c.description || "").toLowerCase().includes(query.toLowerCase()),
              )
              .slice(0, 8)
          : list.slice(0, 8),
      ),
    ]);

    rawMedicines = meds;
    rawServices = srvs;
    rawVaccines = vax;
    rawCategories = cats;
  } catch (err) {
    console.error("[SearchPage] database query failed", err);
    hasError = true;
  }

  const corpus: SearchCorpus = {
    medicines: rawMedicines.map((m) => ({
      slug: m.slug,
      title: m.medicationMaster.name,
      body: m.medicationMaster.description || "",
      meta: m.prescriptionRequired && !m.overTheCounter ? "Prescription" : "OTC",
      imageUrl: m.medicationMaster.imageUrl,
    })),
    services: rawServices.map((s) => ({ slug: s.slug, title: s.title, body: s.short, imageUrl: s.imageUrl })),
    vaccines: rawVaccines.map((v) => ({
      slug: v.slug,
      title: v.name,
      body: v.visSummary || "",
      meta: v.category.replace(/_/g, " "),
    })),
    categories: rawCategories.map((c) => ({
      slug: c.slug,
      title: c.name,
      body: c.description || "",
    })),
    articles: [],
    faqs: [],
  };

  const initial: SearchResults = {
    medicines: corpus.medicines.map((m) => ({ ...m, href: `/medicines/${m.slug}` })),
    services: corpus.services.map((s) => ({ ...s, href: `/services/${s.slug}` })),
    vaccines: corpus.vaccines.map((v) => ({ ...v, href: `/vaccinations/${v.slug}` })),
    categories: corpus.categories.map((c) => ({ ...c, href: `/medicines/${c.slug}` })),
    articles: [],
  };

  return (
    <div className="afyvia-route-surface min-h-screen overflow-x-hidden bg-transparent text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Search"
        title="Search Medicines & Services"
        description="Search live medicines, services, vaccines, and medication categories across the network."
        crumbs={[{ label: "Search" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto w-full max-w-3xl min-w-0">
          {hasError && (
            <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
              <p className="font-semibold">Search is experiencing temporary database issues</p>
              <p className="mt-1 text-xs">Some items could not be loaded. Please refresh or try again shortly.</p>
            </div>
          )}
          <SearchPanel
            base={base}
            corpus={corpus}
            initial={initial}
            initialQuery={query}
          />
        </div>
      </section>
    </div>
  );
}
