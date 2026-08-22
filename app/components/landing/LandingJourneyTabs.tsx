"use client";

import { useState } from "react";
import Link from "next/link";
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
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#061510] text-[#e7f4ef] overflow-hidden">
      {/* Background glow meshes */}
      <div className="landing-grain" aria-hidden />
      <div className="landing-ambient-glow pointer-events-none absolute -left-20 top-1/3 h-96 w-96 rounded-full bg-[#0d6e5a]/25 blur-[120px]" />
      <div className="landing-ambient-glow pointer-events-none absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-[#c9a227]/15 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-teal-500/15 pb-8">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-teal-300">
              <Sparkles className="h-3.5 w-3.5" />
              How Care & The Network Works
            </p>
            <h2
              className="mt-3 text-3xl font-medium tracking-tight text-white sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Choose Your Door
            </h2>
          </div>

          {/* Interactive Audience Switcher */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/15 bg-black/40 p-1.5 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setActiveAudience("patient")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                activeAudience === "patient"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-[#041510] shadow-md"
                  : "text-teal-200/75 hover:text-white hover:bg-white/5"
              }`}
            >
              <HeartPulse className="h-4 w-4" />
              <span>For Patients & Families</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAudience("owner")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                activeAudience === "owner"
                  ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-[#041510] shadow-md"
                  : "text-teal-200/75 hover:text-white hover:bg-white/5"
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
              <div className="relative flex flex-col justify-between rounded-[2rem] border border-teal-500/20 bg-gradient-to-b from-white/10 to-white/5 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400 text-[#041510] font-bold text-sm">
                      01
                    </span>
                    <Search className="h-5 w-5 text-teal-300" />
                  </div>
                  <h3
                    className="mt-6 text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Find or Scan
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-teal-100/75">
                    Search for an accredited pharmacy in your neighbourhood, or upload your prescription slip / pill photo using our AI recognizer.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-teal-200/80 font-medium">
                  ✓ Instant inventory verification
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col justify-between rounded-[2rem] border border-teal-500/20 bg-gradient-to-b from-white/10 to-white/5 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400 text-[#041510] font-bold text-sm">
                      02
                    </span>
                    <MessageCircle className="h-5 w-5 text-teal-300" />
                  </div>
                  <h3
                    className="mt-6 text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Pharmacist Sign-Off & M-Pesa
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-teal-100/75">
                    A licensed pharmacist reviews your dosage and drug interactions, confirms the order, and triggers a seamless M-Pesa STK push.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-teal-200/80 font-medium">
                  ✓ SHA / NHIF friendly
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col justify-between rounded-[2rem] border border-teal-500/20 bg-gradient-to-b from-white/10 to-white/5 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-400 text-[#041510] font-bold text-sm">
                      03
                    </span>
                    <Truck className="h-5 w-5 text-teal-300" />
                  </div>
                  <h3
                    className="mt-6 text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Doorstep Delivery or Pickup
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-teal-100/75">
                    Your medication is dispatched in a tamper-evident pack within 35–45 minutes, or held ready for pickup with zero counter queues.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-teal-200/80 font-medium">
                  ✓ Real-time SMS & WhatsApp alerts
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 px-7 py-3 text-sm font-bold text-[#041510] shadow-[0_4px_20px_rgba(45,212,191,0.3)] transition hover:brightness-110"
              >
                <span>Create free patient account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-do-you-feel"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
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
              <div className="relative flex flex-col justify-between rounded-[2rem] border border-amber-500/20 bg-gradient-to-b from-white/10 to-white/5 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-[#041510] font-bold text-sm">
                      01
                    </span>
                    <FileCheck2 className="h-5 w-5 text-amber-300" />
                  </div>
                  <h3
                    className="mt-6 text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Submit Premises Details
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-teal-100/75">
                    Enter your pharmacy legal name, Pharmacy and Poisons Board (PPB) premise number, location, and operating hours in under 3 minutes.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-amber-200/80 font-medium">
                  ✓ Draft mode — nothing public until approved
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative flex flex-col justify-between rounded-[2rem] border border-amber-500/20 bg-gradient-to-b from-white/10 to-white/5 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-[#041510] font-bold text-sm">
                      02
                    </span>
                    <BadgeCheck className="h-5 w-5 text-amber-300" />
                  </div>
                  <h3
                    className="mt-6 text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Compliance & Licence Review
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-teal-100/75">
                    Platform superadmins verify your licence, pharmacist credentials, and cold-chain equipment. Typical turnaround is 1 business day.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-amber-200/80 font-medium">
                  ✓ Protects community trust and reputation
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative flex flex-col justify-between rounded-[2rem] border border-amber-500/20 bg-gradient-to-b from-white/10 to-white/5 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400 text-[#041510] font-bold text-sm">
                      03
                    </span>
                    <Store className="h-5 w-5 text-amber-300" />
                  </div>
                  <h3
                    className="mt-6 text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Go Live on Your Own Rails
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-teal-100/75">
                    Keep your own Till/Paybill, staff, and pricing. Receive refill requests from verified patients on the network with 0% white-label takeover.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-amber-200/80 font-medium">
                  ✓ Isolated tenant CRM & refill queue
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/onboard"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 px-7 py-3 text-sm font-bold text-[#041510] shadow-[0_4px_20px_rgba(201,162,39,0.3)] transition hover:brightness-110"
              >
                <span>Start pharmacy onboarding</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/for-pharmacies"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
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
