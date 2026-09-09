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
    <div className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <section className="px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="mx-auto max-w-7xl">
          <header className="mb-4 sm:mb-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                  <MapPinned className="h-4 w-4" aria-hidden /> Pharmacy finder
                </p>
                <h1
                  className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl lg:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Find a pharmacy and act immediately.
                </h1>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                  Search by pharmacy, medicine, service or area. Use location, filters and stock signals to choose where to go next.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/medicines"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-bold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
                >
                  <Pill className="h-3.5 w-3.5" aria-hidden /> Browse medicines
                </Link>
                <Link
                  href="/refill"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-3.5 text-xs font-bold text-white shadow-sm transition hover:brightness-95"
                >
                  <PackageSearch className="h-3.5 w-3.5" aria-hidden /> Request refill
                </Link>
              </div>
            </div>
          </header>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <QuickAction href="#directory" icon={<Search className="h-4 w-4" aria-hidden />} label="Search directory" />
            <QuickAction href="/medicines" icon={<PackageSearch className="h-4 w-4" aria-hidden />} label="Check medicine stock" />
            <QuickAction href="/delivery" icon={<Truck className="h-4 w-4" aria-hidden />} label="Delivery options" />
            <QuickAction href="/for-pharmacies" icon={<Store className="h-4 w-4" aria-hidden />} label="List a pharmacy" />
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_370px]">
            <main className="min-w-0">
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
            </main>

            <aside className="min-w-0 lg:sticky lg:top-28" aria-label="Optional pharmacy search assistant">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted-2)]">Optional helper</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Use Aether when ordinary filters are not enough.</p>
                </div>
              </div>
              <DirectoryAssistant />
            </aside>
          </div>

          <section className="mt-8 border-t border-[var(--line)] pt-5 sm:mt-10" aria-label="More pharmacy actions">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--foreground)]">Still not finding the right option?</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                  Broaden the medicine catalogue, request a refill, or contact the pharmacy directly from any listing.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex min-h-10 w-fit shrink-0 items-center gap-2 rounded-full border border-[var(--line-2)] bg-[var(--card)] px-4 text-xs font-bold text-[var(--brand-deep)] transition hover:bg-[var(--card-elev)]"
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
      className="group flex min-h-12 min-w-0 items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:bg-[var(--card-elev)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] transition group-hover:bg-[var(--brand)] group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 text-[11px] font-bold leading-4 text-[var(--foreground)] sm:text-xs">{label}</span>
    </Link>
  );
}
