"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Camera,
  Pill,
  Syringe,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Sparkle,
} from "lucide-react";

export default function LandingQuickCareDeck() {
  const [selectedScanDemo, setSelectedScanDemo] = useState<"pack" | "rx">("pack");

  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-24 bg-[#f8faf9]">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">
            <Sparkle className="h-3.5 w-3.5 fill-[#0d6e5a]" />
            Instant Care In 60 Seconds
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl lg:text-[2.65rem]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Digital speed. Human touch.{" "}
            <span className="italic text-[#0d6e5a]">No queues.</span>
          </h2>
          <p className="mt-3 text-base text-[#5a6b62]">
            Skip crowded waiting rooms. Pick your care pathway below to initiate instant clinical guidance, prescription refills, or certified clinic services.
          </p>
        </div>

        {/* 4 Creative High-Impact Action Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: AI Health Triage */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-teal-900/10 bg-white p-6 shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0d6e5a]/30 hover:shadow-[0_20px_50px_rgba(8,40,32,0.12)]">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-teal-500/10 to-transparent pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-[#0d6e5a] shadow-inner group-hover:bg-[#0d6e5a] group-hover:text-white transition duration-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-teal-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#084c3f]">
                  AI Clinical
                </span>
              </div>

              <h3
                className="mt-6 text-xl font-semibold text-[#0c1a14] group-hover:text-[#0d6e5a] transition"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                How Do You Feel?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">
                Describe your symptoms in plain words or Sheng. Get instant evidence-based triage and pharmacist recommendations.
              </p>

              {/* Interactive micro preview chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Headache", "Child Fever", "Acid Reflux"].map((s) => (
                  <span
                    key={s}
                    className="inline-block rounded-md bg-teal-50/80 px-2 py-0.5 text-[11px] font-medium text-[#084c3f]"
                  >
                    #{s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <Link
                href="/how-do-you-feel"
                className="inline-flex w-full items-center justify-between rounded-xl bg-[#0d6e5a] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#084c3f]"
              >
                <span>Check symptoms</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Card 2: Photo Medicine Scanner */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-amber-900/10 bg-white p-6 shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-[0_20px_50px_rgba(8,40,32,0.12)]">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-amber-500/10 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition duration-300">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-amber-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Vision AI
                </span>
              </div>

              <h3
                className="mt-6 text-xl font-semibold text-[#0c1a14] group-hover:text-amber-800 transition"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Photo Medicine Search
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">
                Snap a photo of your pill bottle, blister pack, or prescription slip. Our AI matches live accredited inventory instantly.
              </p>

              {/* Interactive simulated viewfinder */}
              <div className="relative mt-4 overflow-hidden rounded-xl border border-dashed border-amber-400/60 bg-amber-50/40 p-2.5 text-center text-xs">
                <div className="landing-scanner-line absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-amber-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>AI Pack Recognizer Active</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <Link
                href="/medicines?photo=1"
                className="inline-flex w-full items-center justify-between rounded-xl bg-amber-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
              >
                <span>Scan medicine pack</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Card 3: 30-Second Prescription Refill */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-white p-6 shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_20px_50px_rgba(8,40,32,0.12)]">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-emerald-500/10 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition duration-300">
                  <Pill className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-emerald-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                  Fast Refill
                </span>
              </div>

              <h3
                className="mt-6 text-xl font-semibold text-[#0c1a14] group-hover:text-emerald-800 transition"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                60s Prescription Refill
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">
                Running low on chronic medications? Request an authorized refill from your local pharmacy with doorstep courier or fast pickup.
              </p>

              {/* Highlight Perks */}
              <div className="mt-4 space-y-1 text-xs text-[#3d4f46]">
                <p className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  M-Pesa STK push checkout
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Automatic SMS adherence reminders
                </p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <Link
                href="/refill"
                className="inline-flex w-full items-center justify-between rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
              >
                <span>Request fast refill</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Card 4: Vaccinations & Clinical Screenings */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-sky-900/10 bg-white p-6 shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30 hover:shadow-[0_20px_50px_rgba(8,40,32,0.12)]">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-sky-500/10 to-transparent pointer-events-none" />

            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-inner group-hover:bg-sky-600 group-hover:text-white transition duration-300">
                  <Syringe className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-sky-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-900">
                  Clinic Visit
                </span>
              </div>

              <h3
                className="mt-6 text-xl font-semibold text-[#0c1a14] group-hover:text-sky-800 transition"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Vaccines & Screenings
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">
                Book certified flu, travel, and childhood immunisations, plus on-site blood pressure, blood glucose, and vitals screenings.
              </p>

              {/* Highlights */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Flu Vaccine", "Blood Pressure", "Glucose (HbA1c)"].map((v) => (
                  <span
                    key={v}
                    className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <Link
                href="/vaccinations"
                className="inline-flex w-full items-center justify-between rounded-xl bg-sky-700 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-sky-800"
              >
                <span>Book appointment</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
