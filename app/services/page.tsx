import Link from "next/link";
import {
  HeartPulse,
  MapPinned,
  PackageSearch,
  Pill,
  Store,
} from "lucide-react";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { listNetworkServiceListings } from "../lib/services/network-catalog";
import ServicesDirectory from "./ServicesDirectory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clinical Services & Appointments — Afyvia",
  description:
    "Explore pharmacy screenings, vaccinations, consultations and available clinical services across verified local pharmacies.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bookable?: string }>;
}) {
  const sp = await searchParams;
  const origin = await getBrowseLocation();
  const q = sp.q?.trim() || "";
  const bookable = sp.bookable === "1";

  const data = await listNetworkServiceListings({ q: q || undefined, origin }).catch(() => null);
  const services = data?.services || [];

  return (
    <div className="afyvia-route-surface min-h-screen overflow-hidden text-[var(--foreground)]">
      <section className="px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="mx-auto max-w-7xl">
          {/* Sleek compact header without bloated marketing text */}
          <header className="page-hero-glass mb-4 sm:mb-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs">
                  <HeartPulse className="h-4 w-4" aria-hidden /> Clinical care finder
                </p>
                <h1
                  className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl lg:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Care beyond medicine.
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                  Book health screenings, vaccinations, and consultations with verified pricing close to you.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/medicines"
                  className="glass inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3.5 text-xs font-bold text-[var(--brand-deep)] transition hover:border-[var(--brand)] hover:bg-[var(--card-elev)]"
                >
                  <Pill className="h-3.5 w-3.5" aria-hidden /> Browse medicines
                </Link>
                <Link
                  href="/pharmacies"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-3.5 text-xs font-bold text-[var(--background)] shadow-sm transition hover:brightness-95"
                >
                  <Store className="h-3.5 w-3.5" aria-hidden /> Find a pharmacy
                </Link>
              </div>
            </div>
          </header>

          {/* Interactive Services Directory */}
          <ServicesDirectory
            services={services}
            initialQuery={q}
            initialBookable={bookable}
            initialLocation={origin}
          />

          {/* Helpful Next Step Banner */}
          <div className="care-glass mt-10 rounded-3xl p-4 sm:p-6 text-xs text-[var(--muted)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--foreground)] text-sm">Need a prescription dispensed instead?</p>
                <p className="mt-0.5 text-xs">Upload your prescription or compare in-stock medicine pricing across verified pharmacies.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href="/prescription"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--brand-soft)] px-3 text-xs font-bold text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] transition"
                >
                  Upload prescription →
                </Link>
                <Link
                  href="/refill"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--line-2)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition"
                >
                  Request refill
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
