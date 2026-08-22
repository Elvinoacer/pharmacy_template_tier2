import type { Metadata } from "next";
import ContactForm from "../components/ContactForm";
import PageHero from "../components/PageHero";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { platform } from "../lib/data";
import { getResolvedPharmacyOrNull } from "../lib/services/pharmacy-settings";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact a pharmacy on the ${platform.name} network by phone, WhatsApp, email, or form.`,
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const pharmacy = await getResolvedPharmacyOrNull();
  if (!pharmacy) return <ChoosePharmacy next="/contact" />;

  return (
    <div>
      <PageHero
        eyebrow="Contact"
        title="We would love to hear from you"
        description="Reach the pharmacy by phone, WhatsApp, email, or the form below. For medical emergencies, call local emergency services."
        crumbs={[{ label: "Contact" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2
                className="text-lg font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Visit & call
              </h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Address</p>
                  <p className="mt-1 text-[#0c1a14]">{pharmacy.address.full}</p>
                  <a
                    href={pharmacy.mapsDirections}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline"
                  >
                    Get directions →
                  </a>
                  {pharmacy.latitude != null && pharmacy.longitude != null && (
                    <p className="mt-1 text-[11px] text-[#8a9a92]">
                      Pin: {pharmacy.latitude.toFixed(5)}, {pharmacy.longitude.toFixed(5)}
                    </p>
                  )}
                </li>
                <li>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Phone</p>
                  <a
                    href={pharmacy.phoneHref}
                    className="mt-1 block font-semibold text-[#0c1a14] hover:text-teal-800"
                  >
                    {pharmacy.phone}
                  </a>
                </li>
                <li>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">WhatsApp</p>
                  <a
                    href={pharmacy.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-semibold text-[#0c1a14] hover:text-teal-800"
                  >
                    Message us on WhatsApp
                  </a>
                </li>
                <li>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Email</p>
                  <a
                    href={`mailto:${pharmacy.email}`}
                    className="mt-1 block font-semibold text-[#0c1a14] hover:text-teal-800"
                  >
                    {pharmacy.email}
                  </a>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm">
              <h2
                className="text-lg font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Opening hours
              </h2>
              <ul className="mt-4 space-y-2">
                {pharmacy.hours.map((h) => (
                  <li key={h.day} className="flex justify-between gap-3 text-sm">
                    <span className="text-[#5a6b62]">{h.day}</span>
                    <span className="font-semibold text-[#0c1a14]">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/70 shadow-sm">
              <iframe
                title={`${pharmacy.name} location map`}
                src={pharmacy.mapsEmbed}
                className="h-64 w-full border-0 bg-teal-50"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="flex items-center justify-between gap-3 border-t border-teal-900/5 bg-white/95 px-4 py-3">
                <p className="text-xs text-[#5a6b62]">Find us on the map</p>
                <a
                  href={pharmacy.mapsDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-teal-600 to-teal-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                >
                  Get directions
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Send a message
            </h2>
            <p className="mt-2 text-sm text-[#5a6b62]">
              We typically respond within one business day. Fields marked * are required. For mild
              everyday symptoms you can also try our{" "}
              <a href="/how-do-you-feel" className="font-semibold text-teal-800 hover:underline">
                How do you feel?
              </a>{" "}
              guided check-in.
            </p>
            <div className="relative mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
