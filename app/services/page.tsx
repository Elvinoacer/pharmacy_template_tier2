import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  HeartPulse,
  Layers3,
  Pill,
  Search,
  Store,
} from "lucide-react";
import CtaBanner from "../components/CtaBanner";
import { platform } from "../lib/data";
import { formatPrice } from "../lib/format";
import { listNetworkServiceListings } from "../lib/services/network-catalog";
import ServiceCardLink from "./ServiceCardLink";
import styles from "./ServicesPage.module.css";

export const metadata: Metadata = {
  title: "Services",
  description: `Browse pharmacy services across ${platform.name}. Compare the pharmacy, price and booking availability before choosing where to continue.`,
  alternates: { canonical: "/services" },
};

export const dynamic = "force-dynamic";

function servicesHref(params: { q?: string; pharmacy?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.pharmacy) sp.set("pharmacy", params.pharmacy);
  const query = sp.toString();
  return query ? `/services?${query}` : "/services";
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pharmacy?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const pharmacySlug = sp.pharmacy?.trim().toLowerCase() || undefined;
  const { services, selectedPharmacy } = await listNetworkServiceListings({ q, pharmacySlug }).catch(
    () => ({ services: [], selectedPharmacy: null }),
  );

  const bookableCount = services.filter((service) => service.bookable).length;
  const priced = services
    .map((service) => service.price)
    .filter((price): price is number => price != null && Number.isFinite(price));
  const startingPrice = priced.length > 0 ? Math.min(...priced) : null;
  const pharmacyCount = new Set(services.map((service) => service.pharmacy.slug)).size;
  const location = selectedPharmacy
    ? [selectedPharmacy.city, selectedPharmacy.county].filter(Boolean).join(", ")
    : "";

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <div className={`${styles.ambientOrb} ${styles.ambientOrbOne}`} aria-hidden="true" />
        <div className={`${styles.ambientOrb} ${styles.ambientOrbTwo}`} aria-hidden="true" />

        <div className={styles.container}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Services</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                Aether service marketplace
              </div>

              <h1 className={styles.title}>
                Choose the care you need.
                <span className={styles.titleAccent}> Then choose who provides it.</span>
              </h1>

              <p className={styles.lede}>
                Browse services across active pharmacies without selecting a pharmacy first. Every service card tells you which pharmacy offers it, where they are, what it costs, and whether you can book online.
              </p>

              <div className={styles.heroActions}>
                <Link href="#service-catalogue" className={styles.primaryCta}>
                  Browse services
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/pharmacies" className={styles.secondaryCta}>
                  <Store className="h-4 w-4" aria-hidden="true" />
                  Shop by pharmacy
                </Link>
              </div>

              <div className={styles.trustRow} aria-label="Marketplace highlights">
                <span>
                  <HeartPulse className="h-4 w-4" aria-hidden="true" />
                  Pharmacy-led care
                </span>
                <span>
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Source pharmacy shown
                </span>
                <span>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Book where available
                </span>
              </div>
            </div>

            <aside className={styles.careNavigator} aria-label="Service marketplace summary">
              <div className={styles.navigatorHeader}>
                <div>
                  <p className={styles.navigatorKicker}>Network view</p>
                  <h2>Compare before you commit</h2>
                </div>
                <span className={styles.livePill}>
                  <span aria-hidden="true" />
                  Public listings
                </span>
              </div>

              <div className={styles.navigatorSteps}>
                <div className={styles.navigatorStep}>
                  <span>01</span>
                  <div>
                    <strong>Browse</strong>
                    <p>Start with the service, not a pharmacy gate.</p>
                  </div>
                </div>
                <div className={styles.navigatorStep}>
                  <span>02</span>
                  <div>
                    <strong>Compare</strong>
                    <p>See provider, location, price and booking state.</p>
                  </div>
                </div>
                <div className={styles.navigatorStep}>
                  <span>03</span>
                  <div>
                    <strong>Continue</strong>
                    <p>Open the chosen pharmacy only when you pick a listing.</p>
                  </div>
                </div>
              </div>

              <div className={styles.heroStats}>
                <div>
                  <strong>{services.length}</strong>
                  <span>listings</span>
                </div>
                <div>
                  <strong>{pharmacyCount}</strong>
                  <span>pharmacies</span>
                </div>
                <div>
                  <strong>{startingPrice != null ? `KES ${formatPrice(startingPrice)}` : bookableCount}</strong>
                  <span>{startingPrice != null ? "from" : "bookable"}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-4 pb-5 sm:px-6 sm:pb-7">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Marketplace shortcuts" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <Link href="/medicines" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]">
              <Pill className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Medicines
            </Link>
            <Link href="/services" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-3 text-xs font-semibold text-white shadow-sm">
              <Layers3 className="h-4 w-4" aria-hidden /> Services
            </Link>
            <Link href="/pharmacies" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]">
              <Store className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Pharmacies
            </Link>
          </nav>
        </div>
      </section>

      {pharmacySlug ? (
        <section className="px-4 pb-5 sm:px-6 sm:pb-7">
          <div className="mx-auto max-w-6xl">
            {selectedPharmacy ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--brand-tint)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--card)] text-[var(--brand)] shadow-sm">
                    <Building2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">Services from this pharmacy</p>
                    <p className="truncate text-sm font-bold text-[var(--foreground)] sm:text-base">{selectedPharmacy.name}</p>
                    {location ? <p className="mt-0.5 text-xs text-[var(--muted)]">{location}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/p/${selectedPharmacy.slug}`} className="inline-flex min-h-10 items-center rounded-xl bg-[var(--brand)] px-3.5 text-xs font-semibold text-white">
                    View pharmacy
                  </Link>
                  <Link href={servicesHref({ q })} className="inline-flex min-h-10 items-center rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-3.5 text-xs font-semibold text-[var(--foreground)]">
                    Browse all pharmacies
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-[var(--foreground)]">
                That pharmacy is not currently available in the public marketplace. <Link href={servicesHref({ q })} className="font-semibold text-[var(--brand)] underline underline-offset-4">Browse all service listings</Link>.
              </div>
            )}
          </div>
        </section>
      ) : null}

      <section className="px-4 pb-7 sm:px-6 sm:pb-9">
        <div className="mx-auto max-w-6xl">
          <form method="GET" action="/services" className="grid gap-2 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:p-4">
            {selectedPharmacy ? <input type="hidden" name="pharmacy" value={selectedPharmacy.slug} /> : null}
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-2)]" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q || ""}
                placeholder="Search service, screening, vaccination, counselling…"
                className="min-h-11 w-full rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
              />
            </div>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 active:scale-[0.98]">
              Search services
            </button>
          </form>
        </div>
      </section>

      <section id="service-catalogue" className={styles.catalogueSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionKicker}>{selectedPharmacy ? selectedPharmacy.name : "Across the Aether network"}</p>
              <h2>{q ? `Services matching “${q}”` : "Browse available pharmacy services"}</h2>
              <p>
                Each card is a real pharmacy listing. Tap one to continue with that specific pharmacy and keep the service context intact.
              </p>
            </div>
            {services.length > 0 && (
              <div className={styles.sectionSignal}>
                <HeartPulse className="h-4 w-4" aria-hidden="true" />
                <span><strong>{services.length}</strong> listing{services.length === 1 ? "" : "s"}</span>
              </div>
            )}
          </div>

          {services.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <HeartPulse className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className={styles.emptyTitle}>No services matched</p>
              <p>Try a broader service name or browse pharmacies directly.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/services" className={styles.primaryCta}>Browse all services <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                <Link href="/pharmacies" className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line-2)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--foreground)]">Browse pharmacies</Link>
              </div>
            </div>
          ) : (
            <div className={styles.serviceGrid}>
              {services.map((service, index) => (
                <ServiceCardLink
                  key={service.id}
                  href={service.href}
                  title={service.title}
                  short={service.short}
                  imageUrl={service.imageUrl}
                  bookable={service.bookable}
                  duration={service.duration}
                  priceLabel={service.price != null ? `KES ${formatPrice(service.price)}` : null}
                  benefitCount={service.benefits.length}
                  featured={index === 0 && services.length > 2}
                  pharmacy={service.pharmacy}
                />
              ))}
            </div>
          )}

          {services.length > 0 && (
            <div className={styles.guidanceStrip}>
              <div className={styles.guidanceIcon}>
                <Store className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <strong>Want to start with a pharmacy instead?</strong>
                <p>Browse the dedicated directory by location, delivery, services or medicine availability.</p>
              </div>
              <Link href="/pharmacies">Shop by pharmacy <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          )}
        </div>
      </section>

      <CtaBanner
        title="Browse the network your way"
        description="Start with a medicine, a service, or a pharmacy. Aether only asks you to commit to a pharmacy when the next action actually belongs to one."
        primaryHref="/medicines"
        primaryLabel="Browse medicines"
        secondaryHref="/pharmacies"
        secondaryLabel="Browse pharmacies"
      />
    </div>
  );
}
