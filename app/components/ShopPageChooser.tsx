import PageHero from "./PageHero";
import PharmacyChooser, { type ChooserPharmacy } from "./PharmacyChooser";
import { listMarketplacePharmacies } from "@/app/lib/tenant";

const COPY: Record<
  string,
  { eyebrow: string; title: string; description: string; crumb: string }
> = {
  "/careers": {
    eyebrow: "Careers",
    title: "See open roles at a pharmacy",
    description:
      "Jobs are listed by each pharmacy. Choose a shop to view current openings and send an application.",
    crumb: "Careers",
  },
  "/contact": {
    eyebrow: "Contact",
    title: "Talk to a pharmacy",
    description:
      "Call, WhatsApp, email, or send a message — pick the pharmacy you want to reach first.",
    crumb: "Contact",
  },
  "/delivery": {
    eyebrow: "Delivery",
    title: "Check delivery with a pharmacy",
    description:
      "Coverage, fees, and timing depend on the shop. Choose a pharmacy to see its delivery details and send an enquiry.",
    crumb: "Delivery",
  },
  "/faq": {
    eyebrow: "FAQ",
    title: "Answers from a pharmacy",
    description:
      "Hours, refills, insurance, and services differ by shop. Choose a pharmacy to read its FAQ.",
    crumb: "FAQ",
  },
};

function copyFor(next: string) {
  const path = next.split("?")[0] || "/";
  return (
    COPY[path] ?? {
      eyebrow: "Pharmacy",
      title: "Choose a pharmacy to continue",
      description: "Pick a verified pharmacy and we will take you to the page you asked for.",
      crumb: "Continue",
    }
  );
}

/**
 * Fallback for pharmacy-owned pages (careers, contact, delivery, FAQ) when the
 * URL does not name a shop. Distinct from ChoosePharmacy, which is the
 * network-wide medicine/service search.
 */
export default async function ShopPageChooser({ next }: { next: string }) {
  const copy = copyFor(next);
  const pharmacies: ChooserPharmacy[] = (await listMarketplacePharmacies()).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    city: p.city,
    county: p.county,
    country: p.country,
    latitude: p.latitude,
    longitude: p.longitude,
    logoUrl: p.logoUrl,
    coverImageUrl: p.coverImageUrl,
    featured: p.featured,
  }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        crumbs={[{ label: copy.crumb }]}
      />
      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <PharmacyChooser pharmacies={pharmacies} next={next} />
      </section>
    </div>
  );
}