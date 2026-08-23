import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import SearchPanel, { type SearchCorpus, type SearchResults } from "../components/SearchPanel";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";
import { prisma } from "@/app/lib/db";
import { articles, faqs } from "@/app/lib/data";
import { listPublicServices } from "@/app/lib/services/pharmacy-services";
import { listPublicVaccines } from "@/app/lib/services/vaccination-service";
import { listPublicCategories } from "@/app/lib/medication-categories";

export const metadata: Metadata = {
  title: "Search",
  description: "Search this pharmacy's medicines, services, vaccines, health articles, and FAQs.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/search" />;

  const base = `/p/${pharmacy.slug}`;
  const { q } = await searchParams;

  // Live tenant catalogue + network editorial content. Queries are
  // tenant-scoped by the Prisma extension, so only this pharmacy's rows
  // are searched.
  const [services, vaccines, medicines, categories] = await Promise.all([
    listPublicServices().catch(() => []),
    listPublicVaccines().catch(() => []),
    prisma.pharmacyInventory
      .findMany({
        where: { active: true, publicListing: true },
        select: {
          slug: true,
          overTheCounter: true,
          prescriptionRequired: true,
          medicationMaster: { select: { name: true, description: true } },
        },
        take: 400,
      })
      .catch(() => []),
    listPublicCategories().catch(() => []),
  ]);

  const corpus: SearchCorpus = {
    medicines: medicines.map((m) => ({
      slug: m.slug,
      title: m.medicationMaster.name,
      body: m.medicationMaster.description || "",
      meta: m.prescriptionRequired && !m.overTheCounter ? "Prescription" : "OTC",
    })),
    services: services.map((s) => ({ slug: s.slug, title: s.title, body: s.short })),
    vaccines: vaccines.map((v) => ({
      slug: v.slug,
      title: v.name,
      body: v.visSummary || "",
      meta: v.category.replace(/_/g, " "),
    })),
    categories: categories.map((c) => ({
      slug: c.slug,
      title: c.name,
      body: c.description || "",
    })),
    articles: articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      body: a.excerpt,
      meta: a.category,
    })),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer, category: f.category })),
  };

  const initial: SearchResults = {
    medicines: corpus.medicines.slice(0, 8).map((m) => ({ ...m, href: `${base}/medicines/${m.slug}` })),
    services: corpus.services.slice(0, 6).map((s) => ({ ...s, href: `${base}/services/${s.slug}` })),
    vaccines: corpus.vaccines.slice(0, 6).map((v) => ({ ...v, href: `${base}/vaccinations/${v.slug}` })),
    categories: corpus.categories.slice(0, 6).map((c) => ({ ...c, href: `${base}/medicines/${c.slug}` })),
    articles: corpus.articles.slice(0, 4).map((a) => ({ ...a, href: `${base}/health/${a.slug}` })),
  };

  return (
    <div>
      <PageHero
        eyebrow="Search"
        title={`Search ${pharmacy.name}`}
        description="This pharmacy's medicines, services and vaccines, plus network health articles and FAQs."
        crumbs={[{ label: "Search" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SearchPanel base={base} corpus={corpus} initial={initial} initialQuery={q || ""} />
        </div>
      </section>
    </div>
  );
}
