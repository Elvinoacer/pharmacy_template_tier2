import PageHero from "./PageHero";
import PharmacyChooser, { type ChooserPharmacy } from "./PharmacyChooser";
import { listMarketplacePharmacies } from "@/app/lib/tenant";
import type { CareIntent } from "./care/CareIntentNavigator";

function intentFromNext(next: string): CareIntent | undefined {
  if (next.startsWith("/prescription")) return "prescription";
  if (next.startsWith("/refill")) return "refill";
  if (
    next.startsWith("/services") ||
    next.startsWith("/screenings") ||
    next.startsWith("/vaccinations") ||
    next.startsWith("/preventive")
  )
    return "service";
  if (
    next.startsWith("/medicines") ||
    next.startsWith("/order") ||
    next.startsWith("/delivery") ||
    next.startsWith("/search")
  )
    return "medicine";
  return undefined;
}

function queryFromNext(next: string) {
  if (next.startsWith("/vaccinations")) return "vaccination";
  if (next.startsWith("/screenings")) return "screening";
  if (next.startsWith("/preventive")) return "preventive care";
  if (next.startsWith("/delivery")) return "delivery";
  return "";
}

/**
 * Compatibility entry for legacy storefront-dependent routes.
 *
 * This deliberately does not ask the customer to choose a pharmacy. It keeps
 * their original intent and returns them to network-wide discovery; a pharmacy
 * is introduced later by the medicine/service that can actually fulfil it.
 */
export default async function ChoosePharmacy({
  next = "/",
  title,
  description,
}: {
  next?: string;
  title?: string;
  description?: string;
}) {
  const isDeepIntent =
    next !== "/" &&
    (next.includes("?") ||
      next.startsWith("/vaccinations") ||
      next.startsWith("/order") ||
      next.startsWith("/refill") ||
      next.startsWith("/services") ||
      next.startsWith("/delivery") ||
      next.startsWith("/careers") ||
      next.startsWith("/faq") ||
      next.startsWith("/contact"));

  if (isDeepIntent) {
    const rawPharmacies = await listMarketplacePharmacies();
    const pharmacies: ChooserPharmacy[] = rawPharmacies.map((p) => ({
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
          eyebrow="Choose pharmacy"
          title={title || "Choose a pharmacy to continue"}
          description={
            description ||
            "Select a licensed pharmacy near you to continue with your exact request and preserved options."
          }
          crumbs={[{ label: "Pharmacies", href: "/pharmacies" }, { label: "Choose" }]}
        />
        <section className="px-3 pb-16 sm:px-6 sm:pb-20">
          <PharmacyChooser pharmacies={pharmacies} next={next} />
        </section>
      </div>
    );
  }

  const { getSessionUser } = await import("@/app/lib/auth");
  const CareHero = (await import("./care/CareHero")).default;
  const CareIntentNavigator = (await import("./care/CareIntentNavigator")).default;
  const styles = (await import("./care/CarePages.module.css")).default;

  const session = await getSessionUser().catch(() => null);
  const initialIntent = intentFromNext(next);
  const initialQuery = queryFromNext(next);
  const neutralTitle =
    title && !/pharmac(y|ies)/i.test(title) ? title : "What brings you today?";
  const neutralDescription =
    description && !/pharmac(y|ies)/i.test(description)
      ? description
      : "Start with the medicine, prescription or service you need. We’ll connect the pharmacy only after we know what can help you.";

  return (
    <div className={styles.page}>
      <CareHero
        section={initialIntent === "service" ? "services" : "medicines"}
        eyebrow="START WITH YOUR NEED"
        title="Tell us what you need."
        accent="We’ll guide the rest."
        description="You do not need to pick a pharmacy before you can explore care. Search first, compare availability, then continue with the provider that can fulfil your need."
      />
      <CareIntentNavigator
        signedIn={Boolean(session?.customerId)}
        initialIntent={initialIntent}
        initialQuery={initialQuery}
        title={neutralTitle}
        description={neutralDescription}
      />
    </div>
  );
}
