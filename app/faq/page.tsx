import type { Metadata } from "next";
import Link from "next/link";
import CtaBanner from "../components/CtaBanner";
import FaqAccordion from "../components/FaqAccordion";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
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
  if (view.status !== "active") return <ChoosePharmacy next="/faq" />;

  const { resolved: pharmacy, content } = view;

  return (
    <div>
      <PageHero
        eyebrow="FAQ"
        title="Answers to common questions"
        description="Search or filter by topic. Still stuck? Contact us — we are happy to help."
        crumbs={[{ label: "FAQ" }]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={content.faq} />
          <p className="mt-8 text-center text-sm text-[#5a6b62]">
            Need something else?{" "}
            <Link href={`/p/${pharmacy.slug}/contact`} className="font-semibold text-teal-800 hover:underline">
              Send us a message
            </Link>{" "}
            or call{" "}
            <a href={pharmacy.phoneHref} className="font-semibold text-teal-800 hover:underline">
              {pharmacy.phone}
            </a>
            .
          </p>
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
