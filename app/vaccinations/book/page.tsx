import type { Metadata } from "next";
import PageHero from "../../components/PageHero";
import { VaccinationBookingForm } from "../../components/vaccination/VaccinationBookingForm";
import { getSessionUser } from "../../lib/auth";
import { prisma } from "../../lib/db";
import { listPublicVaccines } from "../../lib/services/vaccination-service";
import ChoosePharmacy from "@/app/components/ChoosePharmacy";
import { loadStorefront } from "@/app/components/StorefrontGate";

export const metadata: Metadata = {
  title: "Book a vaccination",
  description: "Complete screening, read vaccine information, sign consent, and request a pharmacy immunisation appointment.",
  alternates: { canonical: "/vaccinations/book" },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ vaccine?: string; campaign?: string }> };

export default async function BookVaccinationPage({ searchParams }: Props) {
  const pharmacy = await loadStorefront();
  if (!pharmacy) return <ChoosePharmacy next="/vaccinations/book" />;

  const { vaccine, campaign } = await searchParams;
  const [vaccines, session] = await Promise.all([
    listPublicVaccines().catch(() => []),
    getSessionUser().catch(() => null),
  ]);

  let defaultName = "";
  let defaultPhone = "";
  let defaultEmail = "";
  if (session?.customerId) {
    const profile = await prisma.customerProfile
      .findUnique({
        where: { id: session.customerId },
        select: { fullName: true, phone: true, user: { select: { email: true } } },
      })
      .catch(() => null);
    defaultName = profile?.fullName || "";
    defaultPhone = profile?.phone || "";
    defaultEmail = profile?.user.email || "";
  }

  return (
    <div>
      <PageHero
        eyebrow="Vaccination clinic"
        title="Book, screen, and consent"
        description="Choose a vaccine, answer the safety questionnaire, read the information sheet, and sign consent. A pharmacist still reviews every request before a dose is given."
        crumbs={[
          { label: "Vaccinations", href: "/vaccinations" },
          { label: "Book" },
        ]}
      />
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <VaccinationBookingForm
            vaccines={vaccines.map((v) => ({
              slug: v.slug,
              name: v.name,
              antigen: v.antigen,
              pharmacyAdministered: v.pharmacyAdministered,
              bookable: v.bookable,
              visSummary: v.visSummary,
              visTitle: v.visTitle,
              visVersion: v.visVersion,
              contraindications: v.contraindications,
              commonSideEffects: v.commonSideEffects,
              priceKes: v.priceKes != null ? Number(v.priceKes) : null,
            }))}
            defaultVaccine={vaccine}
            defaultCampaign={campaign}
            defaultName={defaultName}
            defaultPhone={defaultPhone}
            defaultEmail={defaultEmail}
          />
        </div>
      </section>
    </div>
  );
}
