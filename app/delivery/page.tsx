import type { Metadata } from "next";
import Image from "next/image";
import DeliveryForm from "../components/DeliveryForm";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";

export const metadata: Metadata = {
  title: "Delivery Information",
  description: `Enquire about medication delivery from a ${platform.name} pharmacy near you.`,
  alternates: { canonical: "/delivery" },
};

export default async function DeliveryPage() {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/delivery" />;

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
            <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-[2rem] shadow-xl">
              <Image
                src="/images/services/delivery-services.webp"
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
              <li className="flex gap-2">
                <span className="text-teal-700">•</span>
                Confirm your address is in a delivery zone via the form or phone.
              </li>
              <li className="flex gap-2">
                <span className="text-teal-700">•</span>
                Request a refill or have a prescription ready at the pharmacy.
              </li>
              <li className="flex gap-2">
                <span className="text-teal-700">•</span>
                We prepare your order and schedule a delivery window.
              </li>
              <li className="flex gap-2">
                <span className="text-teal-700">•</span>
                Receive WhatsApp or phone updates; signature available on request.
              </li>
            </ul>
            <div className="mt-6 rounded-2xl border border-teal-900/5 bg-white/80 p-5 text-sm text-[#5a6b62]">
              <p>
                <strong className="text-[#0c1a14]">Typical fee:</strong> Free over $30; modest fee for smaller orders
                or outer zones.
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
