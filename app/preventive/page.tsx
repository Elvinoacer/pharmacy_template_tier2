import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import CtaBanner from "../components/CtaBanner";
import { PreventiveHealthHub } from "../components/vaccination/PreventiveHealthHub";
import { platform } from "../lib/data";
import { listPublicHealthCampaigns } from "../lib/services/vaccination-service";
import { getSessionUser } from "../lib/auth";
import { prisma } from "../lib/db";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";
import { listMarketplacePharmacies } from "@/app/lib/tenant";

export const metadata: Metadata = {
  title: "Preventive health",
  description: `Preventive-health counselling, public-health campaigns, and education at ${platform.name}: immunisation, travel health, cessation, heart risk, malaria, and more.`,
  alternates: { canonical: "/preventive" },
};

export const dynamic = "force-dynamic";

export default async function PreventivePage() {
  const [campaigns, session, pharmacy, pharmacies] = await Promise.all([
    listPublicHealthCampaigns({ activeOnly: true }).catch(() => []),
    getSessionUser().catch(() => null),
    loadStorefront().catch(() => null),
    listMarketplacePharmacies().catch(() => []),
  ]);

  let defaultName = "";
  let defaultPhone = "";
  if (session?.customerId) {
    const profile = await prisma.customerProfile
      .findUnique({
        where: { id: session.customerId },
        select: { fullName: true, phone: true },
      })
      .catch(() => null);
    defaultName = profile?.fullName || "";
    defaultPhone = profile?.phone || "";
  }

  return (
    <div>
      <PageHero
        eyebrow="Preventive services"
        title="Counselling, campaigns, and public-health education"
        description="Pharmacies prevent illness as well as treat it. Book a counselling session, join a campaign, or read pharmacist-reviewed education — always within local professional scope."
        crumbs={[{ label: "Preventive health" }]}
      />
      <section className="px-3 pb-14 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-6xl">
          <PreventiveHealthHub
            campaigns={campaigns.map((c) => ({
              slug: c.slug,
              title: c.title,
              theme: c.theme,
              short: c.short,
              startDate: c.startDate.toISOString(),
              endDate: c.endDate ? c.endDate.toISOString() : null,
              walkInDays: c.walkInDays,
              targetPopulation: c.targetPopulation,
            }))}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
            pharmacySlug={pharmacy?.slug ?? undefined}
            pharmacies={pharmacies.map((p) => ({ slug: p.slug, name: p.name, city: p.city }))}
          />
        </div>
      </section>
      <CtaBanner
        title="Pair prevention with a screening or vaccine"
        description="Many counselling visits sit naturally next to a BP check or a flu shot."
        primaryHref="/vaccinations"
        primaryLabel="Vaccination clinic"
        secondaryHref="/screenings"
        secondaryLabel="Health screenings"
      />
    </div>
  );
}
