import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone, Store } from "lucide-react";
import FaqAccordion from "../components/FaqAccordion";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import { getStorefrontView } from "@/app/lib/services/storefront-content";
import { STOREFRONT_TEMPLATE } from "@/app/lib/storefront-template";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: `Answers about prescriptions, refills, delivery, insurance, and clinical pharmacy services at ${platform.name}.`,
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const view = await getStorefrontView().catch(() => null);
  if (view && view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/faq" />;
  }

  const pharmacy = view?.status === "active" ? view.resolved : null;
  const isTenant = Boolean(pharmacy);
  const faqItems = view?.status === "active" ? view.content.faq : STOREFRONT_TEMPLATE.faq;

  return (
    <div className="min-h-screen overflow-x-hidden bg-transparent text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="FAQ"
        title={pharmacy ? `Questions & Answers — ${pharmacy.name}` : "Frequently Asked Questions"}
        description="Search common questions about medicine ordering, prescription uploads, refills, and delivery."
        crumbs={[{ label: "FAQ" }]}
      />

      <section className="px-3 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto w-full max-w-3xl">
          {!isTenant && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] p-4 text-xs backdrop-blur-xl sm:text-sm">
              <span className="text-[var(--foreground)]">
                Looking for specific questions and operating policies of a local pharmacy?
              </span>
              <Link
                href="/pharmacies"
                className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand)] underline underline-offset-2"
              >
                <Store size={14} />
                Find your pharmacy branch →
              </Link>
            </div>
          )}

          <div className="liquid-glass care-glass rounded-2xl border !border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] p-4 shadow-sm backdrop-blur-xl sm:rounded-3xl sm:p-6">
            <FaqAccordion items={faqItems} />
          </div>

          <div className="liquid-glass care-glass mt-7 rounded-2xl border !border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] p-4 shadow-sm backdrop-blur-xl sm:mt-8 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">Still need help?</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {pharmacy
                    ? `Send ${pharmacy.name} a message or call directly and our team will assist you.`
                    : "Reach out to our support team or connect with any community pharmacy in the network."}
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                <Link
                  href={pharmacy ? `/p/${pharmacy.slug}/contact` : "/contact"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--card-elev)] px-4 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
                  Send message
                </Link>
                <a
                  href={pharmacy ? pharmacy.phoneHref : `tel:${platform.phone}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-[var(--background)] shadow-sm transition-colors hover:bg-[var(--brand-deep)]"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call {pharmacy ? pharmacy.phone : platform.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
