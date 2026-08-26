import type { Metadata } from "next";
import Image from "next/image";
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

export default async function DeliveryPage() {
  const view = await getStorefrontView();
  if (view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/delivery" />;
  }
  if (view.status !== "active") return <ChoosePharmacy next="/delivery" />;

  const pharmacy = view.resolved;
  const deliverySteps = view.content.deliverySteps;

  return (
    <div>
      <PageHero
        eyebrow="Delivery"
        title="Medication delivery to your door"
        description={
          pharmacy.deliveryNotes ||
          "We deliver in this pharmacy’s service area. Send an enquiry to confirm coverage, fees, and timing."
        }
        crumbs={[{ label: "Delivery" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-inset ring-white/25">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/delivery-services.webp"
                alt="Delivery vehicle ready for pharmacy orders"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              How delivery works
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-[#5a6b62]">
              {deliverySteps.map((step) => (
                <li key={step} className="flex gap-2">
                  <span className="text-teal-700">•</span>
                  {step}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-teal-900/5 bg-white/80 p-5 text-sm text-[#5a6b62]">
              <p>
                {pharmacy.deliveryFeeKes != null ? (
                  <>
                    <strong className="text-[#0c1a14]">Delivery fee:</strong> KES {pharmacy.deliveryFeeKes.toLocaleString("en-KE")}
                    {pharmacy.deliveryRadiusKm ? ` within ${pharmacy.deliveryRadiusKm} km` : ""}.
                  </>
                ) : (
                  <>
                    <strong className="text-[#0c1a14]">Delivery fee:</strong> a modest flat fee depending on your zone —
                    call the pharmacy for an exact quote.
                  </>
                )}
              </p>
              <p className="mt-2">
                <strong className="text-[#0c1a14]">Questions?</strong>{" "}
                <a href={pharmacy.phoneHref} className="font-semibold text-teal-800">
                  {pharmacy.phone}
                </a>
              </p>
            </div>
          </div>

          <div className="relative h-fit rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Delivery enquiry
            </h2>
            <p className="mt-2 text-sm text-[#5a6b62]">
              Tell us where you are — we will confirm coverage and follow up.
            </p>
            <div className="relative mt-6">
              <DeliveryForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
