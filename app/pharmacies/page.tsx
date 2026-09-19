import { getBrowseLocation } from "@/app/lib/browse-location";
import Link from "next/link";
import {
  ArrowRight,
  MapPinned,
  PackageSearch,
  Pill,
  Search,
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
    <div className="afyvia-route-surface min-h-screen overflow-hidden text-[var(--foreground)]">
      <section className="px-4 pb-16 pt-[var(--public-header-offset)] sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-7xl">
          <header className="page-hero-glass mb-4 sm:mb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                  <MapPinned className="h-4 w-4" aria-hidden /> Pharmacy finder
                </p>
                <h1
                  className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl lg:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Care around you.
                </h1>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                  Explore local pharmacies, stock and services.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/medicines"
                  className="glass inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-bold text-[var(--brand-deep)] transition hover:border-[var(--brand)] hover:bg-[var(--card-elev)]"
                >
                  <Pill className="h-3.5 w-3.5" aria-hidden /> Browse medicines
                </Link>
                <Link
                  href="/refill"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-3.5 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
                >
                  <PackageSearch className="h-3.5 w-3.5" aria-hidden /> Request refill
                </Link>
              </div>
            </div>
          </header>

          <p className="mb-4 text-sm"><Link href="/locations">Browse pharmacies, medicines and services by town</Link></p>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickAction href="#directory" icon={<Search className="h-4 w-4" aria-hidden />} label="Search directory" />
            <QuickAction href="/medicines" icon={<PackageSearch className="h-4 w-4" aria-hidden />} label="Check medicine stock" />
            <QuickAction href="/delivery" icon={<Truck className="h-4 w-4" aria-hidden />} label="Delivery options" />
            <QuickAction href="/for-pharmacies" icon={<Store className="h-4 w-4" aria-hidden />} label="List a pharmacy" />
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_370px]">
            <div className="min-w-0">
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
            </div>

            <aside className="min-w-0 lg:sticky lg:top-28" aria-label="Optional pharmacy search assistant">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)]">Optional helper</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Use Afyvia when ordinary filters are not enough.</p>
                </div>
              </div>
              <DirectoryAssistant />
            </aside>
          </div>

          <section className="care-glass mt-8 rounded-3xl p-4 sm:mt-10 sm:p-5" aria-label="More pharmacy actions">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--foreground)]">Still not finding the right option?</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                  Broaden the medicine catalogue, request a refill, or contact the pharmacy directly from any listing.
                </p>
              </div>
              <Link
                href="/contact"
                className="glass inline-flex min-h-10 w-fit shrink-0 items-center gap-2 rounded-full px-4 text-xs font-bold text-[var(--brand-deep)] transition hover:border-[var(--brand)] hover:bg-[var(--card-elev)]"
              >
                Get help <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="care-glass group flex min-h-12 min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--card-elev)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] transition group-hover:bg-[var(--brand)] group-hover:text-[var(--background)]">
        {icon}
      </span>
      <span className="min-w-0 text-[11px] font-bold leading-4 text-[var(--foreground)] sm:text-xs">{label}</span>
    </Link>
  );
}
