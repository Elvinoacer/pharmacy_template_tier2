import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MapPinned,
  PackageSearch,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
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
    <div className="overflow-hidden">
      <section className="relative px-4 pb-7 pt-24 sm:px-6 sm:pb-10 sm:pt-32">
        <div className="hero-glow -left-24 top-8 opacity-50" />
        <div className="hero-glow -right-36 top-24 opacity-30" />

        <div className="page-hero-glass relative mx-auto max-w-7xl overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)] lg:items-end lg:gap-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-900/10 bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#084c3f] shadow-sm backdrop-blur">
                <Sparkles className="h-3 w-3" aria-hidden /> {platform.name} pharmacy directory
              </div>

              <h1
                className="mt-5 max-w-2xl text-3xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#0c1a14] sm:text-5xl lg:text-[3.5rem]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Find care nearby, without guessing.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5a6b62] sm:text-base sm:leading-7">
                Search verified pharmacies by location, services and public medicine stock. Compare the essentials,
                then go straight to the pharmacy storefront that fits what you need.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="#directory"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#0d6e5a] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#084c3f]"
                >
                  Browse pharmacies <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/for-pharmacies"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-teal-900/15 bg-white/65 px-5 text-sm font-semibold text-[#084c3f] transition hover:bg-white"
                >
                  <Store className="h-4 w-4" aria-hidden /> List your pharmacy
                </Link>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
              <HeroFeature
                icon={<BadgeCheck className="h-4 w-4" aria-hidden />}
                title="Verified listings"
                text="Licensed network pharmacies"
              />
              <HeroFeature
                icon={<PackageSearch className="h-4 w-4" aria-hidden />}
                title="Public stock search"
                text="See listed medicine availability"
              />
              <HeroFeature
                icon={<Truck className="h-4 w-4" aria-hidden />}
                title="Useful service filters"
                text="Location, category and delivery"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold text-[#5a6b62] sm:mb-6">
            <MapPinned className="h-4 w-4 text-[#0d6e5a]" aria-hidden />
            Search the live public network directory
          </div>

          <DirectoryAssistant />

          <div className="mt-5 sm:mt-6">
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

function HeroFeature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-teal-900/10 bg-white/65 p-3.5 shadow-sm backdrop-blur sm:block lg:flex">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a] sm:mb-2 lg:mb-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[#0c1a14]">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-[#6b7a72]">{text}</p>
      </div>
    </div>
  );
}
