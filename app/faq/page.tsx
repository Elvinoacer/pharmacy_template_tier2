import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import CtaBanner from "../components/CtaBanner";
import FaqAccordion from "../components/FaqAccordion";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import ShopPageChooser from "@/app/components/ShopPageChooser";
import StorefrontUnavailable from "@/app/components/StorefrontUnavailable";
import { getStorefrontView } from "@/app/lib/services/storefront-content";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: `Answers about hours, refills, delivery, insurance, and services at ${platform.name}.`,
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const view = await getStorefrontView();
  if (view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/faq" />;
  }
  if (view.status !== "active") return <ShopPageChooser next="/faq" />;

  const { resolved: pharmacy, content } = view;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="FAQ"
        title="Answers to common questions"
        description="Search or filter by topic. Still stuck? Contact us — we are happy to help."
        crumbs={[{ label: "FAQ" }]}
      />

      <section className="px-3 pb-12 sm:px-6 sm:pb-16">
        <div className="mx-auto w-full max-w-3xl">
          <FaqAccordion items={content.faq} />

          <div className="mt-7 rounded-2xl border border-[var(--line-2)] bg-[var(--card)] p-4 shadow-sm sm:mt-8 sm:rounded-3xl sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">Still need help?</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Send the pharmacy a message or call directly and we&apos;ll point you in the right direction.
                </p>
              </div>

              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                <Link
                  href={`/p/${pharmacy.slug}/contact`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--card-elev)] px-4 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  <MessageCircle className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
                  Send message
                </Link>
                <a
                  href={pharmacy.phoneHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call pharmacy
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner
        eyebrow={content.ctaBanner.eyebrow}
        title={content.ctaBanner.title}
        description={content.ctaBanner.description}
        primaryHref={content.ctaBanner.primary.href}
        primaryLabel={content.ctaBanner.primary.label}
        secondaryHref={content.ctaBanner.secondary.href}
        secondaryLabel={content.ctaBanner.secondary.label}
      />
    </div>
  );
}
