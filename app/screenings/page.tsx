import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import CtaBanner from "../components/CtaBanner";
import { HealthScreeningHub } from "../components/screening/HealthScreeningHub";
import { platform } from "../lib/data";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";

export const metadata: Metadata = {
  title: "Health Screenings & Vitals",
  description: `Walk-in and booked health screening services at ${platform.name}: Blood pressure, blood glucose, BMI, temperature, and authorized point-of-care tests with structured Kenyan clinic/hospital referral pathways.`,
  alternates: { canonical: "/screenings" },
};

export const dynamic = "force-dynamic";

export default async function HealthScreeningsPage() {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/screenings" />;

  return (
    <div>
      <PageHero
        eyebrow="Clinical Care & Prevention"
        title="Health Screenings & Point-of-Care Testing"
        description="Fast, confidential vital checks and authorized point-of-care tests conducted by licensed pharmacists. Know your numbers, catch flags early, and connect with clinical referrals when needed."
        crumbs={[
          { label: "Services", href: "/services" },
          { label: "Health Screenings" },
        ]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <HealthScreeningHub />
        </div>
      </section>

      <CtaBanner
        title="Ready for your routine health screening?"
        description="Walk in during open hours or book your screening in advance for quick, dedicated care with our pharmacist."
        primaryHref="/services/health-screenings"
        primaryLabel="Book a Screening"
        secondaryHref="/contact"
        secondaryLabel="Pharmacy Location & Hours"
      />
    </div>
  );
}
