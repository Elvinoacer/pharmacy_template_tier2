import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import SearchPanel from "../components/SearchPanel";
import ImageSearchPanel from "../components/ImageSearchPanel";

export const metadata: Metadata = {
  title: "Search",
  description: "Search services, health articles, FAQs, and medicine categories. Or upload a photo of your medication for AI-powered identification.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string; mode?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q, mode } = await searchParams;
  const isImageSearch = mode === "image";

  return (
    <div>
      <PageHero
        eyebrow="Search"
        title={isImageSearch ? "Identify medication by photo" : "Find services, articles & answers"}
        description={
          isImageSearch
            ? "Upload a clear photo of your medication packaging or pills. Our AI will identify it and check our inventory."
            : "Search across services, medicine categories, health articles, and FAQs."
        }
        crumbs={[{ label: "Search" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {/* Mode Toggle */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-full bg-[#f4f7f4] p-1">
              <a
                href="/search"
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                  !isImageSearch
                    ? "bg-white text-[#0c1a14] shadow-sm"
                    : "text-[#5a6b62] hover:text-[#0c1a14]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Text Search
                </span>
              </a>
              <a
                href="/search?mode=image"
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
                  isImageSearch
                    ? "bg-white text-[#0c1a14] shadow-sm"
                    : "text-[#5a6b62] hover:text-[#0c1a14]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image Search
                </span>
              </a>
            </div>
          </div>

          {isImageSearch ? <ImageSearchPanel /> : <SearchPanel initialQuery={q || ""} />}
        </div>
      </section>
    </div>
  );
}
