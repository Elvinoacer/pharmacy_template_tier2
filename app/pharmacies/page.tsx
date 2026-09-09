import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  MapPinned,
  PackageSearch,
  Search,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { platform } from "@/app/lib/data";
import { getDirectoryFacets, listPharmacyDirectory } from "@/app/lib/services/pharmacy-directory";
import PharmacyDirectory from "./PharmacyDirectory";
import DirectoryAssistant from "./DirectoryAssistant";
import styles from "./PharmaciesExperience.module.css";

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

  const filtersActive = Boolean(q || city || county || category || delivery);
  const deliveryCount = pharmacies.filter((pharmacy) => pharmacy.hasDelivery).length;
  const visibleStockCount = pharmacies.reduce((sum, pharmacy) => sum + Number(pharmacy.stockCount || 0), 0);

  return (
    <div className={`${styles.page} overflow-hidden text-[var(--foreground)]`}>
      <section className={`${styles.heroSection} relative px-4 pb-5 pt-24 sm:px-6 sm:pb-8 sm:pt-32`}>
        <div className={`${styles.ambientOrb} ${styles.ambientOrbOne}`} aria-hidden />
        <div className={`${styles.ambientOrb} ${styles.ambientOrbTwo}`} aria-hidden />

        <div className={`${styles.heroPanel} page-hero-glass relative mx-auto max-w-7xl overflow-hidden`}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)] lg:items-stretch lg:gap-10">
            <div className="flex min-w-0 flex-col justify-center">
              <div className={`${styles.eyebrow} inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]`}>
                <Sparkles className="h-3 w-3" aria-hidden /> {platform.name} pharmacy directory
              </div>

              <h1
                className="mt-5 max-w-3xl text-3xl font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl lg:text-[3.65rem]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Find the right pharmacy with <span className={styles.headlineAccent}>less friction.</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
                Search verified pharmacies by location, services and public medicine stock. Compare what matters,
                then move directly to a storefront, refill request or contact channel.
              </p>

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="#directory"
                  className={`${styles.primaryCta} inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold`}
                >
                  <Search className="h-4 w-4" aria-hidden /> Search the network
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/for-pharmacies"
                  className={`${styles.secondaryCta} inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold`}
                >
                  <Store className="h-4 w-4" aria-hidden /> List your pharmacy
                </Link>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                <HeroFeature
                  icon={<BadgeCheck className="h-4 w-4" aria-hidden />}
                  title="Verified listings"
                  text="Network pharmacies with public profiles"
                />
                <HeroFeature
                  icon={<PackageSearch className="h-4 w-4" aria-hidden />}
                  title="Stock-aware search"
                  text="Surface visible medicine availability"
                />
                <HeroFeature
                  icon={<Truck className="h-4 w-4" aria-hidden />}
                  title="Service filters"
                  text="Location, category and delivery"
                />
              </div>
            </div>

            <div className={styles.networkCard} aria-label="Live pharmacy directory snapshot">
              <div className={styles.networkCardHeader}>
                <div>
                  <p className={styles.networkKicker}>{filtersActive ? "Current filtered view" : "Live directory snapshot"}</p>
                  <p className={styles.networkTitle}>Care, mapped around your need.</p>
                </div>
                <span className={styles.livePill}>
                  <span className={styles.liveDot} aria-hidden /> Live
                </span>
              </div>

              <div className={styles.signalField} aria-hidden>
                <span className={`${styles.signalRing} ${styles.signalRingOne}`} />
                <span className={`${styles.signalRing} ${styles.signalRingTwo}`} />
                <span className={`${styles.signalRing} ${styles.signalRingThree}`} />
                <span className={`${styles.signalNode} ${styles.signalNodeOne}`} />
                <span className={`${styles.signalNode} ${styles.signalNodeTwo}`} />
                <span className={`${styles.signalNode} ${styles.signalNodeThree}`} />
                <span className={styles.signalCore}>
                  <MapPinned className="h-5 w-5" />
                </span>
              </div>

              <div className={styles.metricGrid}>
                <MetricCard value={pharmacies.length} label={filtersActive ? "Current matches" : "Visible pharmacies"} />
                <MetricCard value={facets.cities.length} label="Cities indexed" />
                <MetricCard value={deliveryCount} label="Delivery listings" />
                <MetricCard value={visibleStockCount} label="Public stock items" />
              </div>

              <div className={styles.networkHint}>
                <MapPinned className="h-4 w-4 shrink-0" aria-hidden />
                <span>Enable “Near me” in the directory to sort geocoded pharmacies by distance.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className={styles.journeyStrip} aria-label="How to use the pharmacy directory">
            <JourneyStep number="01" icon={<Search className="h-4 w-4" aria-hidden />} title="Describe the need" text="Search a medicine, service or area." />
            <JourneyStep number="02" icon={<PackageSearch className="h-4 w-4" aria-hidden />} title="Compare quickly" text="Use stock, delivery and location signals." />
            <JourneyStep number="03" icon={<ArrowRight className="h-4 w-4" aria-hidden />} title="Act immediately" text="Visit, call, WhatsApp or request a refill." />
          </div>

          <div className={styles.discoveryGrid}>
            <aside className={styles.assistantColumn} aria-label="Aether directory assistant">
              <div className={styles.assistantShell}>
                <DirectoryAssistant />
              </div>

              <div className={styles.assistantNote}>
                <p className={styles.assistantNoteLabel}>Search tip</p>
                <p>
                  Try a medicine plus an area, such as <strong>“Panadol near Westlands”</strong>, or ask for delivery in a specific city.
                </p>
              </div>
            </aside>

            <div className={styles.directoryColumn}>
              <div className={styles.directoryIntro}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--brand)]">
                    <MapPinned className="h-4 w-4" aria-hidden /> Live public network
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--foreground)] sm:text-2xl">
                    Explore pharmacies your way
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--muted)] sm:text-sm">
                    Search broadly, narrow with filters, or use your location for nearest-first sorting.
                  </p>
                </div>
              </div>

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
        </div>
      </section>
    </div>
  );
}

function HeroFeature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className={styles.heroFeature}>
      <div className={styles.heroFeatureIcon}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--foreground)]">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--muted)]">{text}</p>
      </div>
    </div>
  );
}

function MetricCard({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.metricCard}>
      <p className={styles.metricValue}>{value.toLocaleString()}</p>
      <p className={styles.metricLabel}>{label}</p>
    </div>
  );
}

function JourneyStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className={styles.journeyStep}>
      <div className={styles.journeyIcon}>{icon}</div>
      <div className="min-w-0">
        <p className={styles.journeyNumber}>{number}</p>
        <p className="text-xs font-bold text-[var(--foreground)] sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--muted)] sm:text-[11px]">{text}</p>
      </div>
    </div>
  );
}
