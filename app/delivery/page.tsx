import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Phone, Store, Truck } from "lucide-react";
import DeliveryForm from "../components/DeliveryForm";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import { getStorefrontView } from "@/app/lib/services/storefront-content";
import { listMarketplacePharmacies } from "@/app/lib/tenant";

export const metadata: Metadata = {
  title: "Delivery Information",
  description: `Enquire about medication delivery from a ${platform.name} pharmacy near you in Kenya.`,
  alternates: { canonical: "/delivery" },
};

const panelClass =
  "liquid-glass care-glass rounded-2xl border !border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] backdrop-blur-xl shadow-sm transition-all duration-300 sm:rounded-3xl";

const DEFAULT_DELIVERY_STEPS = [
  "Select your medication or upload your prescription via our digital dispensary.",
  "Your local pharmacist verifies the prescription, checks stock, and reviews safety instructions.",
  "Your order is securely packed with tamper-evident seals and cold-chain protection if required.",
  "A dedicated rider delivers directly to your home, workplace, or preferred address across Kenya.",
];

export default async function DeliveryPage() {
  const view = await getStorefrontView().catch(() => null);
  if (view && view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/delivery" />;
  }

  const isTenant = view?.status === "active";
  const rawPharmacies = !isTenant ? await listMarketplacePharmacies() : [];
  const pharmacies = rawPharmacies.map((p) => ({
    slug: p.slug,
    name: p.name,
    city: p.city || "Kenya",
    notes: p.tagline || "Same-day & scheduled delivery",
  }));

  const pharmacy = view?.status === "active"
    ? view.resolved
    : {
        name: platform.name,
        slug: null,
        phone: platform.phone,
        phoneHref: `tel:${platform.phone}`,
        deliveryNotes: "Reliable same-day and scheduled medication delivery from certified neighbourhood pharmacies across Nairobi and major Kenyan towns.",
        deliveryFeeKes: 150,
        deliveryRadiusKm: 15,
      };

  const deliverySteps = (view?.status === "active" && view.content.deliverySteps?.length)
    ? view.content.deliverySteps
    : DEFAULT_DELIVERY_STEPS;

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Delivery"
        title={isTenant ? `Medication delivery from ${pharmacy.name}` : "Medication delivery to your door"}
        description={
          pharmacy.deliveryNotes ||
          "Reliable local delivery across Kenya. Send an enquiry to confirm coverage, delivery fee, and arrival timing."
        }
        crumbs={[{ label: "Delivery" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto w-full max-w-6xl">
          {!isTenant && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--care-glass)] p-4 text-xs backdrop-blur-xl sm:text-sm">
              <span className="text-[var(--foreground)]">
                Want delivery from your closest neighbourhood pharmacy?
              </span>
              <Link
                href="/pharmacies"
                className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand)] underline underline-offset-2"
              >
                <Store size={14} />
                Find your local branch in the directory →
              </Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 xl:gap-10">
            <div className="min-w-0">
              <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] shadow-md sm:mb-7 sm:aspect-[16/10] sm:rounded-[2rem]">
                <Image
                  src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/delivery-services.webp"
                  alt="Delivery vehicle ready for pharmacy orders"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-12 sm:px-5 sm:pb-5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                    Rapid pharmacy delivery
                  </span>
                </div>
              </div>

              <div className={`${panelClass} p-4 sm:p-6`}>
                <h2
                  className="text-lg font-semibold text-[var(--foreground)] sm:text-xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  How delivery works
                </h2>
                <ol className="mt-4 grid gap-3">
                  {deliverySteps.map((step: string, index: number) => (
                    <li
                      key={step}
                      className="flex min-w-0 items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)]/80 p-3.5 sm:rounded-2xl sm:p-4"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand-deep)]">
                        {index + 1}
                      </span>
                      <p className="min-w-0 pt-1 text-[13px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className={`${panelClass} mt-4 p-4 sm:mt-5 sm:p-5`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {pharmacy.deliveryFeeKes != null ? (
                        <>
                          <strong className="font-semibold text-[var(--foreground)]">Estimated fee:</strong>{" "}
                          from KES {pharmacy.deliveryFeeKes.toLocaleString("en-KE")}
                          {pharmacy.deliveryRadiusKm ? ` within ${pharmacy.deliveryRadiusKm} km` : ""}.
                        </>
                      ) : (
                        <>
                          <strong className="font-semibold text-[var(--foreground)]">Delivery fee:</strong>{" "}
                          depends on your delivery zone. Contact the pharmacy for an exact quote.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <a
                  href={pharmacy.phoneHref}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card-elev)] px-4 text-sm font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] sm:w-auto"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call {pharmacy.phone}
                </a>
              </div>
            </div>

            <div className={`${panelClass} min-w-0 h-fit p-4 sm:p-6 lg:sticky lg:top-28 lg:p-8`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
                {isTenant ? "Check your area" : "Choose branch"}
              </p>
              <h2
                className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {isTenant ? "Delivery enquiry" : "Select a pharmacy for delivery"}
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-[var(--muted)] sm:text-sm">
                {isTenant
                  ? "Tell us where you are. The pharmacy will confirm coverage, delivery cost, and timing before anything is dispatched."
                  : "Prescription and OTC medication deliveries are dispatched directly by licensed community pharmacies. Select your local branch to check coverage and arrange delivery."}
              </p>
              <div className="relative mt-5 min-w-0 sm:mt-6">
                {isTenant && pharmacy.slug ? (
                  <DeliveryForm pharmacySlug={pharmacy.slug} />
                ) : (
                  <div className="space-y-3">
                    {pharmacies.slice(0, 6).map((p) => (
                      <Link
                        key={p.slug}
                        href={`/p/${p.slug}/delivery`}
                        className="group flex items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--foreground)_60%,var(--card))] bg-[var(--card)]/70 p-3.5 transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                            {p.name}
                          </p>
                          <p className="truncate text-xs text-[var(--muted)]">
                            {p.city} · {p.notes}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-[var(--brand)]">
                          Enquire →
                        </span>
                      </Link>
                    ))}
                    <div className="pt-2">
                      <Link
                        href="/pharmacies"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)] hover:underline"
                      >
                        <Store size={14} />
                        View all branches in directory →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
