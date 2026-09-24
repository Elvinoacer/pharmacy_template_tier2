import DiscoveryStructuredData from "@/app/components/DiscoveryStructuredData";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  HeartPulse,
  Store,
} from "lucide-react";
import CtaBanner from "@/app/components/CtaBanner";
import PageHero from "@/app/components/PageHero";
import { formatPrice } from "@/app/lib/format";
import { getBrowseLocation } from "@/app/lib/browse-location";
import { listNetworkServicesForSlug } from "@/app/lib/services/network-catalog";
import { resolveServiceImage } from "@/app/lib/media-fallbacks";
import { ResilientImage } from "@/app/components/listing/pieces";
import NetworkServiceComparison from "./NetworkServiceComparison";

export default async function NetworkServiceView({ slug }: { slug: string }) {
  const origin = await getBrowseLocation();
  const listings = await listNetworkServicesForSlug(slug, origin).catch(() => []);
  const first = listings[0];
  if (!first) notFound();

  const bookableCount = listings.filter((item) => item.bookable).length;
  const pharmaciesCount = new Set(listings.map((item) => item.pharmacy.slug)).size;
  const prices = listings.map((l) => l.price).filter((p): p is number => p != null && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <div className="min-w-0">
      <DiscoveryStructuredData name={first.title} path={`/services/${slug}`} section={{ name: "Services", path: "/services" }} items={listings.map(item => ({ name: item.pharmacy.name, href: item.href }))} />
      <PageHero
        eyebrow="Clinical Care · Provider Comparison"
        title={first.title}
        description={
          first.short ||
          `Compare verified local pharmacies offering ${first.title} with transparent pricing, proximity radar, and direct appointment booking.`
        }
        crumbs={[
          { label: "Care Services", href: "/services" },
          { label: first.title },
        ]}
      />

      <section className="px-4 pb-10 sm:px-6 sm:pb-14">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[var(--service-ui-border)] bg-[var(--card)] shadow-sm">
            <ResilientImage
              src={resolveServiceImage(first.imageUrl, first.title, first.description)}
              fallbackSrc={resolveServiceImage(null, first.title, first.description)}
              alt={first.title}
              fill
              className="object-cover transition-transform duration-500 hover:scale-105"
              sizes="(max-width:1024px) 100vw,40vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-bold backdrop-blur-md">
                <HeartPulse className="h-3.5 w-3.5 text-teal-200" />
                Clinical Care
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {first.description || first.short}
            </p>

            {first.benefits && first.benefits.length > 0 && (
              <div className="rounded-2xl border border-[var(--service-ui-border)] bg-[var(--card)]/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Key Benefits</p>
                <ul className="space-y-1.5 text-xs text-[var(--foreground)]">
                  {first.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-[var(--service-ui-border)] bg-[var(--card-elev)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Providers</span>
                <p className="mt-1 text-base sm:text-lg font-bold text-[var(--foreground)]">{pharmaciesCount}</p>
                <p className="text-[10px] text-[var(--muted)]">verified</p>
              </div>

              <div className="rounded-2xl border border-[var(--service-ui-border)] bg-[var(--card-elev)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Online Booking</span>
                <p className="mt-1 text-base sm:text-lg font-bold text-emerald-800 dark:text-emerald-200">{bookableCount}</p>
                <p className="text-[10px] text-[var(--muted)]">instant slots</p>
              </div>

              <div className="rounded-2xl border border-[var(--service-ui-border)] bg-[var(--card-elev)] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">From</span>
                <p className="mt-1 text-base sm:text-lg font-bold text-[var(--foreground)]">
                  {minPrice != null ? `KES ${formatPrice(minPrice)}` : "Enquire"}
                </p>
                <p className="text-[10px] text-[var(--muted)]">per appointment</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/services"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--service-ui-border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition"
              >
                ← All Clinical Services
              </Link>
              <Link
                href="/pharmacies"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--service-ui-border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-elev)] transition"
              >
                <Store className="h-3.5 w-3.5 text-[var(--brand)]" />
                Browse Pharmacies
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
                Compare pharmacies offering this service
              </h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Check pricing, proximity radar, and book appointments directly with your preferred local pharmacy.
              </p>
            </div>
          </div>

          <NetworkServiceComparison
            services={listings}
            serviceTitle={first.title}
            userLocation={origin}
          />
        </div>
      </section>

      <CtaBanner
        title={`Have questions about ${first.title}?`}
        description="Our verified network pharmacies offer licensed pharmacist advice, pre-screening consultations, and professional health assessments."
      />
    </div>
  );
}
