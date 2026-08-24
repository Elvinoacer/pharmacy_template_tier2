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
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/understanding-blood-pressure.webp",
    homeCare: "Lifestyle modification, low sodium diet, daily BP monitoring at the same time each morning.",
    pharmacyRole: "Free on-site clinical BP measurement, refill adherence sync, antihypertensive counselling.",
    redFlags: "Systolic >180 mmHg or diastolic >120 mmHg, sudden chest pressure, shortness of breath, vision blur.",
  },
  {
    id: "diabetes",
    title: "Diabetes & Glucose Management",
    icon: HeartPulse,
    badge: "Endocrine",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/diabetes-everyday-tips.webp",
    homeCare: "Fasting & postprandial glucose logging, balanced carbohydrate distribution, daily foot inspections.",
    pharmacyRole: "HbA1c & random glucose screening, lancet/strip supply, insulin cold-chain storage counselling.",
    redFlags: "Blood glucose >15 mmol/L with ketones, sweet-smelling breath, acute confusion, non-healing ulcer.",
  },
  {
    id: "respiratory",
    title: "Pediatric & Adult Respiratory",
    icon: Stethoscope,
    badge: "Pulmonary",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/flu-season-preparation.webp",
    homeCare: "Warm saline steam, adequate oral hydration, honey for cough (>1 year old), fever management.",
    pharmacyRole: "Inhaler technique verification (spacer check), peak flow guidance, allergy antihistamine dispensing.",
    redFlags: "Stridor, intercostal chest retractions, cyanosis (blue lips), fever >39°C unresponsive to paracetamol.",
  },
  {
    id: "adherence",
    title: "Missed Dose & Medication Safety",
    icon: BookOpen,
    badge: "Pharmacotherapy",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/articles/medication-safety-at-home.webp",
    homeCare: "Use pill organizers, set automated WhatsApp refill alerts, never double-dose on next interval.",
    pharmacyRole: "Interactive missed-dose calculator, drug interaction audits, organ function dosage adjustments.",
    redFlags: "Suspected adverse drug reaction (facial swelling, severe skin rash, unexplained jaundice).",
  },
];

export default function LandingHealthPillars() {
  const [selectedPillarId, setSelectedPillarId] = useState(CLINICAL_PILLARS[0].id);

  const currentPillar = CLINICAL_PILLARS.find((p) => p.id === selectedPillarId) || CLINICAL_PILLARS[0];

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#f8fafc] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#0f2e29]">
              <HeartPulse className="h-3.5 w-3.5 text-[#c9a227]" />
              Evidence-Based Guidance
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Medicine is logistics.{" "}
              <span className="italic text-[#0c352f]">Healing is a person.</span>
            </h2>
            <p className="mt-3 text-base text-[#475569]">
              Clinical safety tools built to help you understand your symptoms, know when to treat at home, and when to seek immediate care.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/health/self-care-guide"
              className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              <span>Self-Care vs Doctor Guide</span>
            </Link>
            <Link
              href="/health"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-[#0f172a] transition hover:bg-slate-50"
            >
              <span>Health Library</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Interactive Clinical Compass Panel */}
        <div className="mt-12 overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] sm:p-10">
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
                      ? "bg-[#0f172a] text-white shadow-md"
                      : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-amber-300" : "text-[#0f172a]"}`} />
                  <span>{pillar.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Pillar Featured Image & Details */}
          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl lg:col-span-4 shadow-md bg-slate-900">
              <Image
                src={currentPillar.image}
                alt={currentPillar.title}
                fill
                className="object-cover transition duration-700 hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 360px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="rounded-full bg-black/80 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur">
                  {currentPillar.badge}
                </span>
                <p className="mt-1 font-semibold text-sm">{currentPillar.title}</p>
              </div>
            </div>

            {/* Active Pillar Details Grid */}
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
              {/* Box 1: Self-Care at Home */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#f8fafc] p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-[#c9a227]" />
                    <span>Home Management</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#0f172a]">
                    What you can do safely
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-[#475569]">
                    {currentPillar.homeCare}
                  </p>
                </div>
              </div>

              {/* Box 2: What Your Pharmacist Does */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#f1f5f9] p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900">
                    <Stethoscope className="h-4 w-4 text-[#0f172a]" />
                    <span>In-Pharmacy Support</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#0f172a]">
                    Community clinical care
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-[#475569]">
                    {currentPillar.pharmacyRole}
                  </p>
                </div>
              </div>

              {/* Box 3: Red Flags & Emergency Referrals */}
              <div className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-[#fff5f5] p-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-800">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Clinical Red Flags</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-[#0f172a]">
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
            <div className="flex items-center gap-2 text-xs text-[#64748b]">
              <HelpCircle className="h-4 w-4 text-slate-700" />
              <span>Unsure if your medication is affected? Check our missed-dose calculator or chat with a pharmacist.</span>
            </div>

            <Link
              href="/health/counselling"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c352f] hover:underline underline-offset-4"
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
