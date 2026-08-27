import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import CtaBanner from "../components/CtaBanner";
import { VaccinationHub } from "../components/vaccination/VaccinationHub";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";
import {
  getImmunizationPolicy,
  listPublicVaccines,
  listPublicHealthCampaigns,
} from "../lib/services/vaccination-service";

export const metadata: Metadata = {
  title: "Vaccinations & Immunisation",
  description: `Pharmacy vaccinations at ${platform.name}: influenza, COVID-19, hepatitis B, Tdap, pneumococcal, travel vaccines, digital records, and immunisation information — where locally authorised.`,
  alternates: { canonical: "/vaccinations" },
};

export const dynamic = "force-dynamic";

export default async function VaccinationsPage() {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/vaccinations" />;

  const [vaccines, campaigns, policy] = await Promise.all([
    listPublicVaccines().catch(() => []),
    listPublicHealthCampaigns({ activeOnly: true }).catch(() => []),
    getImmunizationPolicy().catch(() => null),
  ]);

  return (
    <div>
      <PageHero
        eyebrow="Vaccination & preventive services"
        title="Immunisation, made accessible"
        description="Book adult, seasonal, and travel vaccines with a certified immuniser. Read vaccine information, complete screening and consent, and keep a digital lot-traced record — always within local regulatory rules."
        crumbs={[
          { label: "Services", href: "/services" },
          { label: "Vaccinations" },
        ]}
      />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <VaccinationHub
            vaccines={vaccines.map((v) => ({
              id: v.id,
              slug: v.slug,
              name: v.name,
              antigen: v.antigen,
              category: v.category,
              description: v.description,
              diseasesPrevented: v.diseasesPrevented,
              priceKes: v.priceKes != null ? Number(v.priceKes) : null,
              pharmacyAdministered: v.pharmacyAdministered,
              bookable: v.bookable,
              travelRelated: v.travelRelated,
              seasonLabel: v.seasonLabel,
              seriesDoses: v.seriesDoses,
            }))}
            campaigns={campaigns.map((c) => ({
              slug: c.slug,
              title: c.title,
              theme: c.theme,
              short: c.short,
              startDate: c.startDate.toISOString(),
              endDate: c.endDate ? c.endDate.toISOString() : null,
              walkInDays: c.walkInDays,
              targetPopulation: c.targetPopulation,
              vaccinesOffered: c.vaccinesOffered,
              dosesAdministered: c.dosesAdministered,
              targetDoses: c.targetDoses,
            }))}
            policyDisclaimer={policy?.publicDisclaimer}
          />
        </div>
      </section>
      <CtaBanner
        title="Ready for your vaccine?"
        description="Walk in during open hours or book online. Screening, vaccine information, and consent are completed before every dose."
        primaryHref="/vaccinations/book"
        primaryLabel="Book a vaccine"
        secondaryHref="/preventive"
        secondaryLabel="Preventive counselling"
      />
    </div>
  );
}
