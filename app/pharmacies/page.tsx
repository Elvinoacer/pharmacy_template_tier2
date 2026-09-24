import { getBrowseLocation } from "@/app/lib/browse-location";
import Link from "next/link";
import { platform } from "@/app/lib/data";
import { PageHead } from "@/app/components/listing/pieces";
import listStyles from "@/app/components/listing/listing.module.css";
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
  const origin = await getBrowseLocation();
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
    <div className="afyvia-route-surface min-h-screen overflow-x-clip text-[var(--foreground)]">
      <section className="px-4 pb-28 pt-[var(--public-header-offset)] sm:px-6">
        <div className="mx-auto max-w-7xl">
          <PageHead
            kicker="Near you"
            title="Pharmacies"
            aside={
              <Link className={listStyles.textLink} href="/locations">
                By town
              </Link>
            }
          />
          <PharmacyDirectory
            pharmacies={pharmacies}
            initialLocation={origin}
            cities={facets.cities}
            counties={facets.counties}
            categories={facets.categories}
            initialQuery={q}
            initialCity={city}
            initialCounty={county}
            initialCategory={category}
            initialDelivery={delivery}
          />
          <details className={listStyles.ask}>
            <summary>Ask in your own words</summary>
            <div className={listStyles.askBody}>
              <DirectoryAssistant />
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
