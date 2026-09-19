import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone, Store } from "lucide-react";
import ContactForm from "../components/ContactForm";
import PageHero from "../components/PageHero";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import { platform } from "../lib/data";
import { getStorefrontView } from "../lib/services/storefront-content";
import { listMarketplacePharmacies } from "@/app/lib/tenant";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact support or reach a community pharmacy on the ${platform.name} network by phone, WhatsApp, email, or form.`,
  alternates: { canonical: "/contact" },
};

const cardClass =
  "liquid-glass care-glass rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] backdrop-blur-xl shadow-sm transition-all duration-300 sm:rounded-3xl";

const actionCardClass =
  "group flex min-w-0 items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)]/80 p-3.5 transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:p-4";

export default async function ContactPage() {
  const view = await getStorefrontView().catch(() => null);
  if (view && view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/contact" />;
  }

  const isTenant = view?.status === "active";
  const rawPharmacies = !isTenant ? await listMarketplacePharmacies() : [];
  const pharmacies = rawPharmacies.map((p) => ({
    slug: p.slug,
    name: p.name,
    address: p.city ? `${p.city}, ${p.county || "Kenya"}` : undefined,
  }));

  const pharmacy = view?.status === "active"
    ? view.resolved
    : {
        name: platform.name,
        slug: null,
        phone: platform.phone,
        phoneHref: `tel:${platform.phone}`,
        email: platform.email,
        whatsapp: platform.whatsapp || null,
        whatsappHref: platform.whatsapp ? `https://wa.me/${platform.whatsapp.replace(/\D/g, "")}` : null,
        address: { full: "Nairobi & nationwide delivery across Kenya", street: "", city: "Nairobi", state: "Kenya" },
        mapsDirections: "https://maps.google.com/?q=Nairobi+Kenya",
        mapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127641.20010839843!2d36.758416!3d-1.286389!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f1172d84d49a7%3A0xf7cf0254b297924c!2sNairobi%2C%20Kenya!5e0!3m2!1sen!2ske!4v1",
        hours: [
          { day: "Monday – Friday", time: "8:00 AM – 8:00 PM" },
          { day: "Saturday", time: "9:00 AM – 6:00 PM" },
          { day: "Sunday & Public Holidays", time: "10:00 AM – 4:00 PM" },
        ],
        latitude: null,
        longitude: null,
      };

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Contact"
        title={isTenant ? `Contact ${pharmacy.name}` : "We would love to hear from you"}
        description={
          isTenant
            ? `Reach the ${pharmacy.name} pharmacy team by phone, WhatsApp, email, or send an enquiry below.`
            : "Reach our care team or connect with any community pharmacy in the network. For medical emergencies, call local emergency services."
        }
        crumbs={[{ label: "Contact" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto w-full max-w-6xl">
          {!isTenant && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-4 text-xs backdrop-blur-xl sm:text-sm">
              <span className="text-[var(--foreground)]">
                Looking for contact details and directions for a specific local pharmacy?
              </span>
              <Link
                href="/pharmacies"
                className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand)] underline underline-offset-2"
              >
                <Store size={14} />
                Browse neighbourhood directory →
              </Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 xl:gap-10">
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <div className={`${cardClass} p-4 sm:p-6`}>
                <h2
                  className="text-lg font-semibold text-[var(--foreground)]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Visit &amp; call
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Tap any option below to take action.</p>

                <ul className="mt-4 grid gap-2.5 text-sm">
                  <li className="min-w-0">
                    <a
                      href={pharmacy.mapsDirections}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={actionCardClass}
                      aria-label={`Get directions to ${pharmacy.name}`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">Address</span>
                        <span className="mt-1 block break-words font-semibold leading-5 text-[var(--foreground)]">{pharmacy.address.full}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--brand)]">Get directions →</span>
                        {pharmacy.latitude != null && pharmacy.longitude != null && (
                          <span className="mt-1 block break-all text-[10px] text-[var(--muted-2)]">
                            Pin: {pharmacy.latitude.toFixed(5)}, {pharmacy.longitude.toFixed(5)}
                          </span>
                        )}
                      </span>
                    </a>
                  </li>

                  <li className="min-w-0">
                    <a href={pharmacy.phoneHref} className={actionCardClass} aria-label={`Call ${pharmacy.name} at ${pharmacy.phone}`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                        <Phone className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">Phone</span>
                        <span className="mt-1 block break-words font-semibold text-[var(--foreground)]">{pharmacy.phone}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--brand)]">Tap to call →</span>
                      </span>
                    </a>
                  </li>

                  {pharmacy.whatsappHref && (
                    <li className="min-w-0">
                      <a
                        href={pharmacy.whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={actionCardClass}
                        aria-label={`Message ${pharmacy.name} on WhatsApp`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">WhatsApp</span>
                          <span className="mt-1 block font-semibold text-[var(--foreground)]">Message us on WhatsApp</span>
                          <span className="mt-1 block text-xs font-semibold text-[var(--brand)]">Open WhatsApp →</span>
                        </span>
                      </a>
                    </li>
                  )}

                  <li className="min-w-0">
                    <a
                      href={`mailto:${pharmacy.email}`}
                      className={actionCardClass}
                      aria-label={`Email ${pharmacy.name} at ${pharmacy.email}`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-xs sm:tracking-wider">Email</span>
                        <span className="mt-1 block break-all font-semibold text-[var(--foreground)]">{pharmacy.email}</span>
                        <span className="mt-1 block text-xs font-semibold text-[var(--brand)]">Send email →</span>
                      </span>
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
                <ul className="mt-4 divide-y divide-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))]">
                  {pharmacy.hours.map((h: { day: string; time: string }) => (
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
                <a
                  href={pharmacy.mapsDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-14 items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card)]/60 px-4 py-3.5 transition hover:bg-[var(--brand-tint)]"
                >
                  <span className="text-xs text-[var(--muted)]">Find us on the map</span>
                  <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-[var(--background)] shadow-sm">
                    Get directions
                  </span>
                </a>
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
                <Link
                  href={isTenant && pharmacy.slug ? `/how-do-you-feel?pharmacy=${encodeURIComponent(pharmacy.slug)}` : "/how-do-you-feel"}
                  className="font-semibold text-[var(--brand)] hover:underline"
                >
                  How do you feel?
                </Link>{" "}
                guided check-in.
              </p>
              <div className="relative mt-5 min-w-0 sm:mt-6">
                <ContactForm pharmacySlug={pharmacy.slug ?? undefined} pharmacies={pharmacies} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
