import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/app/components/PageHero";
import CtaBanner from "@/app/components/CtaBanner";
import DigitalCounsellingCard from "@/app/components/health/DigitalCounsellingCard";
import MissedDoseCalculator from "@/app/components/health/MissedDoseCalculator";
import DeviceDosageViewer from "@/app/components/health/DeviceDosageViewer";
import { getMedicationCounsellingBySlug } from "@/app/lib/services/medication-counselling-db";
import { platform } from "@/app/lib/data";
import { ArrowLeft } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getMedicationCounsellingBySlug(slug);
  if (!profile) return { title: "Medication Counselling Guide" };

  return {
    title: `${profile.brandNames[0]} (${profile.genericName}) — Digital Patient Counselling Guide`,
    description: `Official 12-pillar patient medication counselling guide for ${profile.brandNames[0]} (${profile.genericName}) on the ${platform.name} network. How to take, food rules, storage, side effects, missed doses, and clinical safety.`,
    alternates: { canonical: `/health/counselling/${slug}` },
  };
}

export default async function MedicationCounsellingSlugPage({ params }: Props) {
  const { slug } = await params;
  const profile = await getMedicationCounsellingBySlug(slug);
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-transparent text-[var(--foreground)]">
      <PageHero
        eyebrow="Digital Medication Counselling"
        title={`${profile.brandNames[0]} Patient Counselling Leaflet`}
        description={`Complete 12-pillar clinical guidance for ${profile.brandNames[0]} (${profile.genericName}). Review proper administration, food instructions, storage conditions, missed-dose protocol, and warning signs.`}
        crumbs={[
          { label: "Health Library", href: "/health" },
          { label: "Patient Counselling", href: "/health/counselling" },
          { label: profile.brandNames[0] },
        ]}
      />

      <div className="px-3 pb-14 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-5xl space-y-8 sm:space-y-10">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/health/counselling"
              className="inline-flex min-h-10 w-full items-center gap-1.5 rounded-xl border border-teal-900/10 bg-white px-3 py-2 text-xs font-bold text-teal-800 transition hover:bg-teal-50 sm:min-h-0 sm:w-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:hover:bg-transparent sm:hover:underline"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" /> Back to Counselling Hub
            </Link>

            <Link
              href={`/medicines/${profile.medicineKey}`}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-teal-900/10 bg-white px-3 py-2 text-center text-xs font-bold text-teal-800 transition hover:bg-teal-50 sm:min-h-0 sm:w-auto sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-left sm:hover:bg-transparent sm:hover:underline"
            >
              View Catalogue Stock &amp; Refills →
            </Link>
          </div>

          <DigitalCounsellingCard counselling={profile} />

          <MissedDoseCalculator />

          {(profile.specialDosageForm || profile.device) && (
            <div>
              <div className="mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Technique Demonstration
                </span>
                <h3
                  className="text-xl font-bold text-[#0c1a14]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Step-by-Step Technique for this Medication
                </h3>
              </div>
              <DeviceDosageViewer
                initialType={profile.specialDosageForm ? "dosage_forms" : "devices"}
                selectedFormId={profile.specialDosageForm?.guideId}
                selectedDeviceId={profile.device?.guideId}
              />
            </div>
          )}
        </div>
      </div>

      <CtaBanner
        title={`Questions about taking ${profile.brandNames[0]}?`}
        description="Our pharmacists are always available to review your medication profile and verify safe administration."
      />
    </div>
  );
}
