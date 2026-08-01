import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import SearchPanel from "../components/SearchPanel";

export const metadata: Metadata = {
  title: "Search",
  description: "Search services, health articles, FAQs, and medicine categories.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;

  return (
    <div>
      <PageHero
        eyebrow="Search"
        title="Find services, articles & answers"
        description="Search across services, medicine categories, health articles, and FAQs."
        crumbs={[{ label: "Search" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SearchPanel initialQuery={q || ""} />
        </div>
      </section>
    </div>
  );
}
