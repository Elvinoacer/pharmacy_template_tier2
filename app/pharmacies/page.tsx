import Link from "next/link";
import { Sparkles, Store } from "lucide-react";
import { platform } from "@/app/lib/data";
import { getDirectoryFacets, listPharmacyDirectory } from "@/app/lib/services/pharmacy-directory";
import PharmacyDirectory from "./PharmacyDirectory";
import DirectoryAssistant from "./DirectoryAssistant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Find a Pharmacy — ${platform.name}`,
  description: `Search active ${platform.name} network pharmacies by area, category, delivery and public medicine stock.`,
  alternates: { canonical: "/pharmacies" },
};

type SearchParams = { q?: string; city?: string; county?: string; category?: string; delivery?: string };

export default async function PharmaciesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const city = (params.city || "").trim();
  const county = (params.county || "").trim();
  const category = (params.category || "").trim();
  const delivery = params.delivery === "1";

  const [pharmacies, facets] = await Promise.all([
    listPharmacyDirectory({
      q: q || undefined,
      city: city || undefined,
      county: county || undefined,
      category: category || undefined,
      delivery,
    }),
    getDirectoryFacets(),
  ]);

  return (
    <div>
      {/* Hero — platform surface, network chrome comes from the global Navbar */}
      <section className="relative overflow-hidden px-4 pb-10 pt-32 sm:px-6 sm:pt-36">
        <div className="hero-glow -left-20 top-10 opacity-60" />
        <div className="page-hero-glass relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-white/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#084c3f]">
              <Sparkles className="h-3 w-3" aria-hidden /> {platform.name} Pharmacy Directory
            </div>
            <h1
              className="mt-5 text-4xl font-semibold tracking-tight text-[#0c1a14] sm:text-5xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Find the right pharmacy for what you need.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5a6b62] sm:text-base">
              Search neighbourhood pharmacies, browse public medicine stock, compare services, and go
              directly into the storefront you choose. Every listing is a verified, licensed pharmacy.
            </p>
            <Link
              href="/for-pharmacies"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:underline"
            >
              <Store className="h-4 w-4" aria-hidden /> List your pharmacy on the network
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <DirectoryAssistant />
          <div className="mt-8">
            <PharmacyDirectory
              pharmacies={pharmacies}
              cities={facets.cities}
              counties={facets.counties}
              categories={facets.categories}
              initialQuery={q}
              initialCity={city}
              initialCounty={county}
              initialCategory={category}
              initialDelivery={delivery}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
