"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  HeartPulse,
  Building2,
  ArrowRight,
  CheckCircle2,
  Search,
  MessageCircle,
  Truck,
  FileCheck2,
  BadgeCheck,
  Store,
  Sparkles,
} from "lucide-react";

export default function LandingJourneyTabs() {
  const [activeAudience, setActiveAudience] = useState<"patient" | "owner">("patient");

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#080c12] text-[#f8fafc] overflow-hidden">
      {/* Background glow meshes */}
      <div className="landing-grain" aria-hidden />
      <div className="landing-ambient-glow pointer-events-none absolute -left-20 top-1/3 h-96 w-96 rounded-full bg-[#0c2e28]/35 blur-[130px]" />
      <div className="landing-ambient-glow pointer-events-none absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-[#c9a227]/15 blur-[130px]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              How The Network Works
            </p>
            <h2
              className="mt-3 text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Choose Your Pathway
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Tailored experience whether you are seeking patient care or listing an accredited chemist.
            </p>
          </div>

          {/* Interactive Audience Switcher */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-black/60 p-1.5 backdrop-blur-xl shadow-lg">
            <button
              type="button"
              onClick={() => setActiveAudience("patient")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                activeAudience === "patient"
                  ? "bg-white text-[#0f172a] shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <HeartPulse className="h-4 w-4 text-[#c9a227]" />
              <span>For Patients & Families</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAudience("owner")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                activeAudience === "owner"
                  ? "bg-gradient-to-r from-[#d4af37] to-[#c9a227] text-[#0a120e] shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>For Pharmacy Owners</span>
            </button>
          </div>
        </div>

        {/* Patient Journey Deck */}
        {activeAudience === "patient" && (
          <div className="mt-12">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Step 1 */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111827]/70 shadow-lg backdrop-blur-md transition hover:border-white/20">
                <div className="relative h-44 w-full overflow-hidden bg-black/40">
                  <Image
                    src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-dispensing.webp"
                    alt="Find care and scan medicine"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 380px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#0f172a] font-bold text-sm shadow">
                    01
                  </span>
                </div>
                
                <div className="p-7">
                  <h3
                    className="text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Find or Scan
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    Search for an accredited chemist in your neighbourhood, or upload your prescription slip / medicine pack using Vision AI.
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-amber-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-300" />
                    <span>Instant local stock & price verification</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111827]/70 shadow-lg backdrop-blur-md transition hover:border-white/20">
                <div className="relative h-44 w-full overflow-hidden bg-black/40">
                  <Image
                    src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp"
                    alt="Pharmacist dosage review"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 380px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#0f172a] font-bold text-sm shadow">
                    02
                  </span>
                </div>

                <div className="p-7">
                  <h3
                    className="text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Pharmacist Review & M-Pesa
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    A licensed pharmacist audits your dosage and drug interactions, confirms the order, and triggers a seamless M-Pesa STK push.
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-amber-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-300" />
                    <span>SHA / NHIF & private insurance friendly</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111827]/70 shadow-lg backdrop-blur-md transition hover:border-white/20">
                <div className="relative h-44 w-full overflow-hidden bg-black/40">
                  <Image
                    src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/delivery-services.webp"
                    alt="Fast doorstep courier delivery"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 380px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#0f172a] font-bold text-sm shadow">
                    03
                  </span>
                </div>

                <div className="p-7">
                  <h3
                    className="text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Doorstep Delivery in 35m
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    Your medication is sealed in a tamper-evident pack and delivered in 35–45 minutes, or ready at the counter with zero waiting.
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-amber-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-300" />
                    <span>Real-time SMS & WhatsApp tracking</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-8 py-3.5 text-sm font-bold text-[#0a120e] shadow-[0_4px_25px_rgba(201,162,39,0.3)] transition hover:brightness-110 active:scale-98"
              >
                <span>Create free patient account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-do-you-feel"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 active:scale-98"
              >
                <span>Try symptom triage first</span>
              </Link>
            </div>
          </div>
        )}

        {/* Owner Journey Deck */}
        {activeAudience === "owner" && (
          <div className="mt-12">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Step 1 */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111827]/70 shadow-lg backdrop-blur-md transition hover:border-white/20">
                <div className="relative h-44 w-full overflow-hidden bg-black/40">
                  <Image
                    src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp"
                    alt="Submit pharmacy premises"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 380px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400 text-[#0a120e] font-bold text-sm shadow">
                    01
                  </span>
                </div>

                <div className="p-7">
                  <h3
                    className="text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Submit Premises Details
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    Enter your pharmacy legal name, Pharmacy and Poisons Board (PPB) premise number, location, and operating hours in under 3 minutes.
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-amber-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Draft mode — nothing public until approved</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111827]/70 shadow-lg backdrop-blur-md transition hover:border-white/20">
                <div className="relative h-44 w-full overflow-hidden bg-black/40">
                  <Image
                    src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp"
                    alt="Network verification & compliance"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 380px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400 text-[#0a120e] font-bold text-sm shadow">
                    02
                  </span>
                </div>

                <div className="p-7">
                  <h3
                    className="text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Superadmin Licence Review
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    Platform superadmins verify your licence, pharmacist credentials, and cold-chain equipment. Typical turnaround is 1 business day.
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-amber-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Protects community safety and trust</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111827]/70 shadow-lg backdrop-blur-md transition hover:border-white/20">
                <div className="relative h-44 w-full overflow-hidden bg-black/40">
                  <Image
                    src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp"
                    alt="Go live with your own brand"
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 380px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
                  <span className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-400 text-[#0a120e] font-bold text-sm shadow">
                    03
                  </span>
                </div>

                <div className="p-7">
                  <h3
                    className="text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Go Live on Your Own Rails
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                    Keep your own Till/Paybill, staff, and pricing. Receive refill requests from verified patients on the network with 0% white-label takeover.
                  </p>
                  <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-amber-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Isolated tenant CRM & refill queue</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/onboard"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-8 py-3.5 text-sm font-bold text-[#0a120e] shadow-[0_4px_25px_rgba(201,162,39,0.3)] transition hover:brightness-110 active:scale-98"
              >
                <span>Start pharmacy onboarding</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/for-pharmacies"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 active:scale-98"
              >
                <span>Read network terms & benefits</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
