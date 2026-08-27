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
import { ArrowLeft, PhoneCall, ShieldCheck, Pill } from "lucide-react";

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
    <div>
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

      <div className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="flex items-center justify-between">
            <Link
              href="/health/counselling"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Counselling Hub
            </Link>

            <Link
              href={`/medicines/${profile.medicineKey}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline"
            >
              View Catalogue Stock &amp; Refills →
            </Link>
          </div>

          {/* Render Full Digital Counselling Leaflet */}
          <DigitalCounsellingCard counselling={profile} />

          {/* Missed Dose Assistant specific to this medicine */}
          <MissedDoseCalculator />

          {/* Technique Viewer if special form or device */}
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
