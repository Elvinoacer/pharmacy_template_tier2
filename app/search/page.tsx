import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import SearchPanel, { type SearchCorpus, type SearchResults } from "../components/SearchPanel";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";
import { prisma, prismaUnscoped } from "@/app/lib/db";
import { listPublicServices } from "@/app/lib/services/pharmacy-services";
import { listPublicVaccines } from "@/app/lib/services/vaccination-service";
import { listPublicCategories } from "@/app/lib/medication-categories";

export const metadata: Metadata = {
  title: "Search",
  description: "Search live medicines, services, vaccines, and medication categories.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

import { buildPublicInventoryWhere } from "@/app/lib/services/public-medication-visibility";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const pharmacy = await loadStorefront().catch(() => null);
  const base = pharmacy ? `/p/${pharmacy.slug}` : "";
  const { q } = await searchParams;

  const [services, vaccines, medicines, categories] = await Promise.all([
    listPublicServices().catch(() => []),
    listPublicVaccines().catch(() => []),
    prismaUnscoped.pharmacyInventory
      .findMany({
        where: buildPublicInventoryWhere({
          pharmacyId: pharmacy?.id,
          pharmacySlug: pharmacy?.slug,
        }),
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

  // The storefront search corpus contains operational records only. Editorial
  // health articles/FAQs are intentionally excluded here until they are backed
  // by approved KnowledgeArticle records rather than static template copy.
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
    articles: [],
    faqs: [],
  };

  const initial: SearchResults = {
    medicines: corpus.medicines.slice(0, 8).map((m) => ({ ...m, href: `${base}/medicines/${m.slug}` })),
    services: corpus.services.slice(0, 6).map((s) => ({ ...s, href: `${base}/services/${s.slug}` })),
    vaccines: corpus.vaccines.slice(0, 6).map((v) => ({ ...v, href: `${base}/vaccinations/${v.slug}` })),
    categories: corpus.categories.slice(0, 6).map((c) => ({ ...c, href: `${base}/medicines/${c.slug}` })),
    articles: [],
  };

  return (
    <div className="aether-route-surface min-h-screen overflow-x-hidden bg-transparent text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Search"
        title={pharmacy ? `Search ${pharmacy.name}` : "Search Medicines & Services"}
        description={
          pharmacy
            ? `Search ${pharmacy.name}'s live medicines, services, vaccines, and medication categories.`
            : "Search live medicines, services, vaccines, and medication categories across the network."
        }
        crumbs={[{ label: "Search" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto w-full max-w-3xl min-w-0">
          <SearchPanel base={base} corpus={corpus} initial={initial} initialQuery={q || ""} />
        </div>
      </section>
    </div>
  );
}
