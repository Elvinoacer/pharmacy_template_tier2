import type { Metadata } from "next";
import Image from "next/image";
import { Check, Phone, Truck } from "lucide-react";
import DeliveryForm from "../components/DeliveryForm";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import { getStorefrontView } from "@/app/lib/services/storefront-content";

export const metadata: Metadata = {
  title: "Delivery Information",
  description: `Enquire about medication delivery from a ${platform.name} pharmacy near you.`,
  alternates: { canonical: "/delivery" },
};

const panelClass =
  "rounded-2xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition-colors duration-300 sm:rounded-3xl";

export default async function DeliveryPage() {
  const view = await getStorefrontView();
  if (view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/delivery" />;
  }
  if (view.status !== "active") return <ChoosePharmacy next="/delivery" />;

  const pharmacy = view.resolved;
  const deliverySteps = view.content.deliverySteps;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Delivery"
        title="Medication delivery to your door"
        description={
          pharmacy.deliveryNotes ||
          "We deliver in this pharmacy’s service area. Send an enquiry to confirm coverage, fees, and timing."
        }
        crumbs={[{ label: "Delivery" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 xl:gap-10">
          <div className="min-w-0">
            <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--card-elev)] shadow-md sm:mb-7 sm:aspect-[16/10] sm:rounded-[2rem]">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/delivery-services.webp"
                alt="Delivery vehicle ready for pharmacy orders"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-12 sm:px-5 sm:pb-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                  <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                  Pharmacy delivery
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
                {deliverySteps.map((step, index) => (
                  <li
                    key={step}
                    className="flex min-w-0 items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-elev)] p-3.5 sm:rounded-2xl sm:p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                      {index + 1}
                    </span>
                    <p className="min-w-0 pt-1 text-[13px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className={`${panelClass} mt-4 p-4 sm:mt-5 sm:p-5`}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    {pharmacy.deliveryFeeKes != null ? (
                      <>
                        <strong className="font-semibold text-[var(--foreground)]">Delivery fee:</strong>{" "}
                        KES {pharmacy.deliveryFeeKes.toLocaleString("en-KE")}
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
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-4 text-sm font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:w-auto"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call {pharmacy.phone}
              </a>
            </div>
          </div>

          <div className={`${panelClass} min-w-0 h-fit p-4 sm:p-6 lg:sticky lg:top-28 lg:p-8`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
              Check your area
            </p>
            <h2
              className="mt-2 text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Delivery enquiry
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)] sm:text-sm">
              Tell us where you are. The pharmacy will confirm coverage, delivery cost, and timing before anything is arranged.
            </p>
            <div className="relative mt-5 min-w-0 sm:mt-6">
              <DeliveryForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
