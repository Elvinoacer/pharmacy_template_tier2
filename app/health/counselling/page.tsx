import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/app/components/PageHero";
import CtaBanner from "@/app/components/CtaBanner";
import CounsellingSearchClient from "@/app/components/health/CounsellingSearchClient";
import MissedDoseCalculator from "@/app/components/health/MissedDoseCalculator";
import DeviceDosageViewer from "@/app/components/health/DeviceDosageViewer";
import styles from "./CounsellingSurface.module.css";
import { getAllCounsellingMedications } from "@/app/lib/services/medication-counselling-db";
import { platform } from "@/app/lib/data";
import {
  Pill,
  Clock,
  Utensils,
  Thermometer,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  ShieldAlert,
  Activity,
  HeartPulse,
  BookOpen,
  PhoneCall,
  Calendar,
  Lock,
  Flame,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Digital Patient Medication Counselling Hub | Clinical Guidance",
  description: `Comprehensive 12-pillar digital medication counselling, administration techniques, missed-dose calculators, food interactions, device guides, and clinical safety from ${platform.name} pharmacists.`,
  alternates: { canonical: "/health/counselling" },
};

export default async function DigitalCounsellingHubPage() {
  const allMedications = await getAllCounsellingMedications();

  return (
    <div className={`${styles.surface} min-h-screen bg-transparent text-[var(--foreground)]`}>
      <PageHero
        eyebrow="Digital Pharmacy Standard"
        title="Digital Patient Medication Counselling Hub"
        description="Every medicine prescribed or dispensed by Afyvia Pharmacy comes with comprehensive clinical counselling. Explore administration techniques, timing, food rules, storage, device protocols, missed-dose decisions, and when to seek medical attention."
        crumbs={[
          { label: "Health Library", href: "/health" },
          { label: "Patient Medication Counselling" },
        ]}
      />

      <div className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-16">
          {/* Top 12 Pillars Overview Grid */}
          <section>
            <div className="mb-6 text-center sm:text-left">
              <span className="rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-900 border border-emerald-200">
                12-Pillar Digital Clinical Framework
              </span>
              <h2
                className="mt-2 text-2xl font-bold text-[#0c1a14] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                The 12 Essential Medication Counselling Pillars
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--health-editorial-body)]">
                Our digital platform ensures you understand every critical aspect of your medication therapy:
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PillarSummaryCard
                number={1}
                title="How to Take"
                desc="Correct administration technique, swallowing whole, posture, suspension shaking, and route."
                icon={<Pill className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={2}
                title="When to Take"
                desc="Optimal time of day (morning vs bedtime, circadian timing, integrating into daily routines)."
                icon={<Clock className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={3}
                title="How Often (Frequency)"
                desc="Evenly spaced dosing intervals (every 8h, 12h, 24h), PRN limits, and strict daily maximum caps."
                icon={<Calendar className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={4}
                title="Food & Drink Rules"
                desc="With meals vs empty stomach, avoiding dairy/calcium binding, grapefruit juice, and alcohol."
                icon={<Utensils className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={5}
                title="How to Store"
                desc="Temperature controls, avoiding humid bathroom cabinets, refrigeration (2–8°C), and 28-day discard rules."
                icon={<Thermometer className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={6}
                title="Special Dosage Forms"
                desc="Step-by-step techniques for inhalers, eye drops (punctal occlusion), ear drops, patches, and suppositories."
                icon={<Sparkles className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={7}
                title="Expected Side Effects"
                desc="Common manageable side effects with home remedies, and emergency red-flag allergic reactions."
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={8}
                title="Missed Dose Protocol"
                desc="Safe cutoff windows, what to do when forgotten, and the strict golden rule: NEVER double up doses."
                icon={<RotateCcw className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={9}
                title="Course Completion"
                desc="Why completing full antibiotic courses prevents superbug resistance (AMR), and chronic adherence."
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={10}
                title="Medical Device Guides"
                desc="Illustrated instructions for inhaler spacers, glucometers, blood pressure cuffs, insulin pens, and nebulizers."
                icon={<Activity className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={11}
                title="Safe Handling & Disposal"
                desc="Child-resistant storage, hand hygiene, hazardous drug precautions, and pharmacy return bins."
                icon={<Lock className="h-4 w-4" />}
              />
              <PillarSummaryCard
                number={12}
                title="When to Return to Clinician"
                desc="Expected recovery timelines, monitoring parameters, and when to seek urgent medical review."
                icon={<HeartPulse className="h-4 w-4" />}
              />
            </div>
          </section>

          {/* Section 1: Search & Interactive Leaflet Viewer */}
          <section>
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Interactive Medication Directory
              </span>
              <h2
                className="text-2xl font-bold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Search &amp; Access Digital Medication Counselling
              </h2>
              <p className="mt-1 text-xs text-[var(--health-editorial-body)]">
                Select any medication below to instantly render its complete 12-pillar clinical counselling guide, printable summary, and sharing leaflet.
              </p>
            </div>

            <CounsellingSearchClient allMedications={allMedications} />
          </section>

          {/* Section 2: Interactive Missed Dose Decision Engine */}
          <section>
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Clinical Safety Tool
              </span>
              <h2
                className="text-2xl font-bold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Missed Dose Decision Engine
              </h2>
              <p className="mt-1 text-xs text-[var(--health-editorial-body)]">
                Forgot a dose? Use our pharmacist-designed decision tool to determine whether you should take it now or skip and wait.
              </p>
            </div>

            <MissedDoseCalculator />
          </section>

          {/* Section 3: Special Dosage Forms & Device Mastery */}
          <section>
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Technique Library
              </span>
              <h2
                className="text-2xl font-bold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Special Dosage Forms &amp; Medical Devices Mastery
              </h2>
              <p className="mt-1 text-xs text-[var(--health-editorial-body)]">
                Up to 70% of medication administration errors occur due to incorrect device or special formulation technique. Review our step-by-step clinical guides:
              </p>
            </div>

            <DeviceDosageViewer />
          </section>

          {/* Section 4: Deep Dive Focus Areas (AMR & Safe Storage) */}
          <section className="grid gap-6 md:grid-cols-2">
            {/* Antimicrobial Stewardship Card */}
            <div className="rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-700 text-white shadow-xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                    Antimicrobial Stewardship
                  </span>
                  <h3 className="text-lg font-bold text-purple-950">
                    Why Finishing Your Full Antibiotic Course Matters
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#2c3e35]">
                <p>
                  When you take antibiotics, the most vulnerable bacteria die within the first 48 hours, making you feel much better. However, the most resilient, mutated bacteria survive longer.
                </p>
                <div className="rounded-2xl border border-purple-200 bg-white/90 p-3.5 text-xs text-purple-950 font-medium">
                  🛑 <strong>Stopping early:</strong> Allows the surviving superbugs to multiply, creating <em>Antimicrobial Resistance (AMR)</em> that makes standard antibiotics useless for future infections.
                </div>
                <ul className="space-y-1.5 pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                    <span>Always take the exact number of days prescribed (e.g. 5, 7, or 10 days).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                    <span>Never save leftover antibiotics for future sore throats or colds.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                    <span>Never share prescription antibiotics with family members.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Safe Storage & Disposal Card */}
            <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-xs">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Medication Safety
                  </span>
                  <h3 className="text-lg font-bold text-emerald-950">
                    Safe Storage, Child Safety &amp; Disposal
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-xs leading-relaxed text-[#2c3e35]">
                <p>
                  Heat, moisture, and light degrade active pharmaceutical ingredients, converting them into ineffective or toxic compounds.
                </p>
                <div className="rounded-2xl border border-emerald-200 bg-white/90 p-3.5 text-xs text-emerald-950 font-medium">
                  🚿 <strong>Avoid bathroom medicine cabinets:</strong> Shower steam and humidity destroy tablets and capsules. Store medicines in a high, dry bedroom cupboard.
                </div>
                <ul className="space-y-1.5 pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Keep sweet-tasting pediatric syrups locked out of reach of toddlers.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Return expired medicines to our pharmacy take-back bins for incineration.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Never flush medicines down the toilet or sink (protects local water supply).</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Direct 1-on-1 Counselling Booking */}
          <section className="rounded-3xl border border-teal-200 bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] p-8 text-white shadow-md">
            <div className="mx-auto max-w-4xl text-center">
              <span className="rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-xs">
                Personalized Care
              </span>
              <h2
                className="mt-3 text-2xl font-bold sm:text-3xl text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Schedule a 1-on-1 Medication Therapy Review
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-emerald-100 max-w-2xl mx-auto">
                Are you taking multiple chronic medicines, starting a new treatment, or experiencing unexplained side effects? Our licensed pharmacists provide confidential private counselling sessions in-store, by phone, or via video.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/services/medication-counselling"
                  className="rounded-full bg-white px-6 py-3 text-xs font-extrabold text-teal-900 shadow-sm hover:bg-emerald-50 transition"
                >
                  Book In-Person / Virtual Counselling →
                </Link>
                <Link
                  href={platform.phoneHref}
                  className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-xs font-bold text-white hover:bg-white/20 transition backdrop-blur-xs"
                >
                  <PhoneCall className="h-4 w-4" />
                  Call network support ({platform.phone})
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      <CtaBanner
        title="Have questions about your prescription?"
        description="Our licensed pharmacists are here to ensure your medication routine is safe, effective, and tailored to your lifestyle."
      />
    </div>
  );
}

function PillarSummaryCard({
  number,
  title,
  desc,
  icon,
}: {
  number: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="liquid-glass care-glass rounded-2xl border border-[var(--health-ui-border)] bg-[var(--care-glass)] p-4 shadow-sm backdrop-blur-xl hover:border-[var(--brand)] transition">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[11px] font-extrabold text-[var(--brand)] border border-[var(--health-ui-border)]">
          {number}
        </span>
        <h4 className="font-bold text-[var(--foreground)] text-xs">{title}</h4>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{desc}</p>
    </div>
  );
}
