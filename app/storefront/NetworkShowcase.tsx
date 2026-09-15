import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  MapPin,
  Pill,
  RotateCw,
  Search,
  ShieldCheck,
  Store,
  Syringe,
  Truck,
} from "lucide-react";

type NetworkPharmacy = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  city: string | null;
  county: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
};

type NetworkService = {
  id: string;
  slug: string;
  title: string;
  short: string;
  imageUrl?: string | null;
};

export default function NetworkStorefrontShowcase({
  pharmacies,
  services,
}: {
  pharmacies: NetworkPharmacy[];
  services: NetworkService[];
}) {
  return (
    <div className="min-h-screen bg-transparent text-[var(--foreground)]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36">
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--care-border)] bg-[var(--care-glass)] px-4 py-1.5 text-xs font-semibold text-[var(--brand)] shadow-sm backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Kenya&apos;s Verified Pharmacy &amp; Care Network
          </div>

          <h1
            className="mx-auto max-w-4xl text-4xl font-bold leading-[1.12] tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Local pharmacy care,{" "}
            <span className="italic text-[var(--brand)]">close to home.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
            Discover PPB-registered neighbourhood dispensaries, compare live in-stock medications,
            request prescription refills, and receive rapid door-to-door delivery.
          </p>

          {/* Quick Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pharmacies"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-95"
            >
              <Store size={16} />
              Browse All Pharmacies
            </Link>
            <Link
              href="/medicines"
              className="liquid-glass care-glass inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--care-border)] bg-[var(--card-elev)] px-6 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] active:scale-95"
            >
              <Pill size={16} />
              Search Medicines
            </Link>
            <Link
              href="/refill"
              className="liquid-glass care-glass inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--care-border)] bg-[var(--card-elev)] px-6 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] active:scale-95"
            >
              <RotateCw size={16} />
              Request Refill
            </Link>
          </div>
        </div>
      </section>

      {/* ── Core Service Tiles ────────────────────────────────────────────── */}
      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/pharmacies"
            className="liquid-glass care-glass group flex flex-col justify-between rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-5 shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)] hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Store size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
                Verified Directory
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Explore licensed community pharmacies in your town or neighbourhood.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
              Find branches <ArrowUpRight size={14} />
            </span>
          </Link>

          <Link
            href="/medicines"
            className="liquid-glass care-glass group flex flex-col justify-between rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-5 shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)] hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Pill size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
                Medication Catalog
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Search authentic prescription and over-the-counter essentials.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
              Browse medicines <ArrowUpRight size={14} />
            </span>
          </Link>

          <Link
            href="/screenings"
            className="liquid-glass care-glass group flex flex-col justify-between rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-5 shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)] hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Activity size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
                Health Screenings
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Blood pressure, blood glucose, BMI and point-of-care vital checks.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
              Explore screenings <ArrowUpRight size={14} />
            </span>
          </Link>

          <Link
            href="/vaccinations"
            className="liquid-glass care-glass group flex flex-col justify-between rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-5 shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)] hover:shadow-md"
          >
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Syringe size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
                Vaccines &amp; Prevention
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Seasonal flu, travel vaccines, hepatitis B, and immunisation guidance.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
              Book a vaccine <ArrowUpRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Partner Pharmacies Showcase ─────────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs">
                NETWORK DIRECTORY
              </p>
              <h2
                className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Featured Community Pharmacies
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
                Each pharmacy operates independently under certified pharmacists with verified PPB licenses.
              </p>
            </div>
            <Link
              href="/pharmacies"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline sm:text-sm"
            >
              View all pharmacies
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pharmacies.map((pharmacy) => {
              const cover = pharmacy.coverImageUrl || "/images/care/editorial-pharmacy.png";
              const locationStr = [pharmacy.city, pharmacy.county, "Kenya"]
                .filter(Boolean)
                .join(", ");

              return (
                <div
                  key={pharmacy.id}
                  className="liquid-glass care-glass flex flex-col justify-between overflow-hidden rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] shadow-sm backdrop-blur-xl transition hover:border-[var(--brand)] hover:shadow-lg"
                >
                  <div>
                    <div className="relative h-44 w-full overflow-hidden bg-[var(--brand-soft)]">
                      <Image
                        src={cover}
                        alt={pharmacy.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                        {pharmacy.logoUrl && (
                          <div className="h-9 w-9 overflow-hidden rounded-xl bg-white p-1 shadow">
                            <Image
                              src={pharmacy.logoUrl}
                              alt=""
                              width={36}
                              height={36}
                              className="object-contain"
                            />
                          </div>
                        )}
                        <p className="text-sm font-semibold text-white truncate drop-shadow">
                          {pharmacy.name}
                        </p>
                      </div>
                    </div>

                    <div className="p-5">
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                        <MapPin size={13} className="text-[var(--brand)]" />
                        {locationStr}
                      </span>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
                        {pharmacy.tagline || "Trusted community care, certified dispensing, and delivery."}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[var(--care-border)] p-4 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/p/${pharmacy.slug}`}
                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
                      >
                        <Store size={13} />
                        Storefront
                      </Link>
                      <Link
                        href={`/pharmacies/${pharmacy.slug}`}
                        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-[var(--care-border)] bg-[var(--card-elev)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)]"
                      >
                        Profile &amp; Map
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Network Trust Facts ─────────────────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6">
        <div className="liquid-glass care-glass mx-auto max-w-6xl rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-8 shadow-sm backdrop-blur-xl sm:p-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-3xl font-bold text-[var(--brand)] sm:text-4xl">100%</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Licensed Pharmacies
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Verified with the Pharmacy and Poisons Board of Kenya.
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--brand)] sm:text-4xl">Cold-Chain</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Prescription Safety
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Temperature-controlled logistics for insulins and vaccines.
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--brand)] sm:text-4xl">Fast</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Doorstep Delivery
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Same-day rider dispatch directly from your chosen counter.
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[var(--brand)] sm:text-4xl">1:1</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Clinical Consultations
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Direct phone, WhatsApp and in-person pharmacist access.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
