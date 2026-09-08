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

const cardClass =
  "rounded-2xl border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition-colors duration-300 sm:rounded-3xl";

export default async function ContactPage() {
  const pharmacy = await getResolvedPharmacyOrNull();
  if (!pharmacy) return <ChoosePharmacy next="/contact" />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Contact"
        title="We would love to hear from you"
        description="Reach the pharmacy by phone, WhatsApp, email, or the form below. For medical emergencies, call local emergency services."
        crumbs={[{ label: "Contact" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 xl:gap-10">
          <div className="min-w-0 space-y-4 sm:space-y-5">
            <div className={`${cardClass} p-4 sm:p-6`}>
              <h2
                className="text-lg font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Visit &amp; call
              </h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">Address</p>
                  <p className="mt-1 break-words leading-6 text-[var(--foreground)]">{pharmacy.address.full}</p>
                  <a
                    href={pharmacy.mapsDirections}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-[var(--brand)] hover:underline"
                  >
                    Get directions →
                  </a>
                  {pharmacy.latitude != null && pharmacy.longitude != null && (
                    <p className="mt-1 break-all text-[11px] text-[var(--muted-2)]">
                      Pin: {pharmacy.latitude.toFixed(5)}, {pharmacy.longitude.toFixed(5)}
                    </p>
                  )}
                </li>
                <li className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">Phone</p>
                  <a
                    href={pharmacy.phoneHref}
                    className="mt-1 block break-words font-semibold text-[var(--foreground)] hover:text-[var(--brand)]"
                  >
                    {pharmacy.phone}
                  </a>
                </li>
                <li className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">WhatsApp</p>
                  <a
                    href={pharmacy.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block font-semibold text-[var(--foreground)] hover:text-[var(--brand)]"
                  >
                    Message us on WhatsApp
                  </a>
                </li>
                <li className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">Email</p>
                  <a
                    href={`mailto:${pharmacy.email}`}
                    className="mt-1 block break-all font-semibold text-[var(--foreground)] hover:text-[var(--brand)]"
                  >
                    {pharmacy.email}
                  </a>
                </li>
              </ul>
            </div>

            <div className={`${cardClass} p-4 sm:p-6`}>
              <h2
                className="text-lg font-semibold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Opening hours
              </h2>
              <ul className="mt-4 divide-y divide-[var(--line)]">
                {pharmacy.hours.map((h) => (
                  <li key={h.day} className="flex min-w-0 items-start justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="min-w-0 text-[var(--muted)]">{h.day}</span>
                    <span className="shrink-0 text-right font-semibold text-[var(--foreground)]">{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${cardClass} overflow-hidden`}>
              <iframe
                title={`${pharmacy.name} location map`}
                src={pharmacy.mapsEmbed}
                className="h-56 w-full border-0 bg-[var(--brand-tint)] sm:h-64"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-[var(--card)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[var(--muted)]">Find us on the map</p>
                <a
                  href={pharmacy.mapsDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
                >
                  Get directions
                </a>
              </div>
            </div>
          </div>

          <div className={`${cardClass} min-w-0 p-4 sm:p-6 lg:p-8`}>
            <h2
              className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Send a message
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)] sm:text-sm">
              We typically respond within one business day. Fields marked * are required. For mild
              everyday symptoms you can also try our{" "}
              <a href={`/p/${pharmacy.slug}/how-do-you-feel`} className="font-semibold text-[var(--brand)] hover:underline">
                How do you feel?
              </a>{" "}
              guided check-in.
            </p>
            <div className="relative mt-5 min-w-0 sm:mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
