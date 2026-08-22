"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HeartPulse,
  BookOpen,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

const CLINICAL_PILLARS = [
  {
    id: "hypertension",
    title: "Blood Pressure & Heart Health",
    icon: Activity,
    badge: "Cardiovascular",
    image: "/images/articles/understanding-blood-pressure.webp",
    homeCare: "Lifestyle modification, low sodium diet, daily BP monitoring at the same time each morning.",
    pharmacyRole: "Free on-site clinical BP measurement, refill adherence sync, antihypertensive counselling.",
    redFlags: "Systolic >180 mmHg or diastolic >120 mmHg, sudden chest pressure, shortness of breath, vision blur.",
  },
  {
    id: "diabetes",
    title: "Diabetes & Glucose Management",
    icon: HeartPulse,
    badge: "Endocrine",
    image: "/images/articles/diabetes-everyday-tips.webp",
    homeCare: "Fasting & postprandial glucose logging, balanced carbohydrate distribution, daily foot inspections.",
    pharmacyRole: "HbA1c & random glucose screening, lancet/strip supply, insulin cold-chain storage counselling.",
    redFlags: "Blood glucose >15 mmol/L with ketones, sweet-smelling breath, acute confusion, non-healing ulcer.",
  },
  {
    id: "respiratory",
    title: "Pediatric & Adult Respiratory",
    icon: Stethoscope,
    badge: "Pulmonary",
    image: "/images/articles/flu-season-preparation.webp",
    homeCare: "Warm saline steam, adequate oral hydration, honey for cough (>1 year old), fever management.",
    pharmacyRole: "Inhaler technique verification (spacer check), peak flow guidance, allergy antihistamine dispensing.",
    redFlags: "Stridor, intercostal chest retractions, cyanosis (blue lips), fever >39°C unresponsive to paracetamol.",
  },
  {
    id: "adherence",
    title: "Missed Dose & Medication Safety",
    icon: BookOpen,
    badge: "Pharmacotherapy",
    image: "/images/articles/medication-safety-at-home.webp",
    homeCare: "Use pill organizers, set automated WhatsApp refill alerts, never double-dose on next interval.",
    pharmacyRole: "Interactive missed-dose calculator, drug interaction audits, organ function dosage adjustments.",
    redFlags: "Suspected adverse drug reaction (facial swelling, severe skin rash, unexplained jaundice).",
  },
];

export default function LandingHealthPillars() {
  const [selectedPillarId, setSelectedPillarId] = useState(CLINICAL_PILLARS[0].id);

  const currentPillar = CLINICAL_PILLARS.find((p) => p.id === selectedPillarId) || CLINICAL_PILLARS[0];

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#f8faf9] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">
              <HeartPulse className="h-3.5 w-3.5" />
              Evidence-Based Guidance
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Medicine is logistics.{" "}
              <span className="italic text-[#0d6e5a]">Healing is a person.</span>
            </h2>
            <p className="mt-3 text-base text-[#5a6b62]">
              Clinical safety tools built to help you understand your symptoms, know when to treat at home, and when to seek immediate care.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/health/self-care-guide"
              className="inline-flex items-center gap-2 rounded-full bg-[#0d6e5a] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#084c3f]"
            >
              <ShieldAlert className="h-4 w-4 text-emerald-300" />
              <span>Self-Care vs Doctor Guide</span>
            </Link>
            <Link
              href="/health"
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-900/15 bg-white px-5 py-2.5 text-xs font-bold text-[#0c1a14] transition hover:bg-slate-50"
            >
              <span>Health Library</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Interactive Clinical Compass Panel */}
        <div className="mt-12 overflow-hidden rounded-[2.5rem] border border-teal-900/10 bg-white p-6 shadow-[0_16px_50px_rgba(8,40,32,0.06)] sm:p-10">
          {/* Pillar Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-6">
            {CLINICAL_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              const isActive = pillar.id === selectedPillarId;
              return (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() => setSelectedPillarId(pillar.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    isActive
                      ? "bg-[#0d6e5a] text-white shadow-md"
                      : "bg-[#f0faf6] text-[#084c3f] hover:bg-teal-100/70"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-emerald-200" : "text-[#0d6e5a]"}`} />
                  <span>{pillar.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Pillar Featured Image & Details */}
          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl lg:col-span-4 shadow-md bg-[#061e16]">
              <Image
                src={currentPillar.image}
                alt={currentPillar.title}
                fill
                className="object-cover transition duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 360px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="rounded-full bg-teal-950/80 border border-teal-400/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-200 backdrop-blur">
                  {currentPillar.badge}
                </span>
                <p className="mt-1 font-semibold text-sm">{currentPillar.title}</p>
              </div>
            </div>

            {/* Active Pillar Details Grid */}
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
              {/* Box 1: Self-Care at Home */}
              <div className="flex flex-col justify-between rounded-2xl border border-emerald-900/10 bg-[#f0faf6] p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Home Management</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#0c1a14]">
                    What you can do safely
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-[#3d4f46]">
                    {currentPillar.homeCare}
                  </p>
                </div>
              </div>

              {/* Box 2: What Your Pharmacist Does */}
              <div className="flex flex-col justify-between rounded-2xl border border-teal-900/10 bg-[#eef7f4] p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0d6e5a]">
                    <Stethoscope className="h-4 w-4 text-[#0d6e5a]" />
                    <span>In-Pharmacy Support</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#0c1a14]">
                    Community clinical care
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-[#3d4f46]">
                    {currentPillar.pharmacyRole}
                  </p>
                </div>
              </div>

              {/* Box 3: Red Flags & Emergency Referrals */}
              <div className="flex flex-col justify-between rounded-2xl border border-rose-900/10 bg-[#fff5f5] p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Clinical Red Flags</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#0c1a14]">
                    Seek immediate review
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-rose-950/80">
                    {currentPillar.redFlags}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2 text-xs text-[#5a6b62]">
              <HelpCircle className="h-4 w-4 text-teal-700" />
              <span>Unsure if your medication is affected? Check our missed-dose calculator or chat with a pharmacist.</span>
            </div>

            <Link
              href="/health/counselling"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0d6e5a] hover:underline underline-offset-4"
            >
              <span>View full 12-pillar digital counselling</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
