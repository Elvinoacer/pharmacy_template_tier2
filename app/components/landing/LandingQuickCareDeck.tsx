"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Truck,
  Scan,
} from "lucide-react";

export default function LandingQuickCareDeck() {
  const [scanState, setScanState] = useState<"ready" | "scanning" | "matched">("matched");

  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-24 bg-[#f8faf9] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">
              <Sparkle className="h-3.5 w-3.5 fill-[#0d6e5a]" />
              Care Pathways In 60 Seconds
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Digital speed. Human touch.{" "}
              <span className="italic text-[#0d6e5a]">No queues.</span>
            </h2>
            <p className="mt-3 text-base text-[#5a6b62]">
              Choose how you want to be helped right now. Every pathway is backed by a licensed professional.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#0d6e5a] bg-teal-50 px-3.5 py-2 rounded-full border border-teal-100">
            <Clock className="h-4 w-4" />
            <span>Average response & dispatch under 45 minutes</span>
          </div>
        </div>

        {/* 4 Creative High-Impact Visual Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: AI Health Triage */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-teal-900/10 bg-white shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[#0d6e5a]/40 hover:shadow-[0_24px_60px_rgba(8,40,32,0.14)]">
            {/* Top Image Banner */}
            <div className="relative h-44 w-full overflow-hidden bg-[#061e16]">
              <Image
                src="/images/services/medication-counselling.webp"
                alt="Pharmacist counselling patient"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041510] via-black/30 to-transparent" />
              
              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-950/80 border border-teal-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-200 backdrop-blur">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  AI Clinical
                </span>
              </div>
              <div className="absolute bottom-3 left-3.5 right-3.5">
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  How Do You Feel?
                </h3>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <p className="text-xs leading-relaxed text-[#5a6b62]">
                  Describe symptoms in your own words or Sheng. Get evidence-based triage and pharmacist guidance.
                </p>

                {/* Symptom Tag Pills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["#Headache", "#ChildFever", "#AcidReflux"].map((s) => (
                    <span
                      key={s}
                      className="inline-block rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-[#084c3f]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/how-do-you-feel"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-[#0d6e5a] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#084c3f]"
                >
                  <span>Check symptoms</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Photo Medicine Scanner */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-amber-900/10 bg-white shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:border-amber-500/40 hover:shadow-[0_24px_60px_rgba(8,40,32,0.14)]">
            {/* Top Image Banner with Animated Laser Scanner */}
            <div className="relative h-44 w-full overflow-hidden bg-[#1f1606]">
              <Image
                src="/images/services/prescription-dispensing.webp"
                alt="Medicine pack dispensing and scanning"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#150d03] via-black/40 to-transparent" />
              
              {/* Laser Scanning Line */}
              <div className="landing-scanner-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)]" />

              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/80 border border-amber-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur">
                  <Scan className="h-3 w-3 text-amber-300" />
                  Vision AI
                </span>
              </div>
              <div className="absolute bottom-3 left-3.5 right-3.5">
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Photo Medicine Search
                </h3>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <p className="text-xs leading-relaxed text-[#5a6b62]">
                  Snap any blister pack, pill bottle, or handwritten slip. AI identifies the active drug and checks live local stock.
                </p>

                {/* Simulated AI Result Chip */}
                <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Metformin 500mg · In Stock</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/medicines?photo=1"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
                >
                  <span>Scan medicine pack</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: 30-Second Prescription Refill */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-emerald-900/10 bg-white shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:border-emerald-500/40 hover:shadow-[0_24px_60px_rgba(8,40,32,0.14)]">
            {/* Top Image Banner */}
            <div className="relative h-44 w-full overflow-hidden bg-[#041c14]">
              <Image
                src="/images/services/prescription-refills.webp"
                alt="Prescription refill preparation"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#02130e] via-black/40 to-transparent" />

              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 backdrop-blur">
                  <Zap className="h-3 w-3 text-emerald-300" />
                  Fast Refill
                </span>
              </div>
              <div className="absolute bottom-3 left-3.5 right-3.5">
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  60s Prescription Refill
                </h3>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <p className="text-xs leading-relaxed text-[#5a6b62]">
                  Re-order ongoing chronic medications in two taps. Lipa na M-Pesa STK push with priority rider dispatch.
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs text-[#3d4f46]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓
                  </span>
                  <span className="text-[11px] font-medium">Automatic monthly SMS refill reminders</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/refill"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
                >
                  <span>Request fast refill</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 4: Vaccinations & Clinical Screenings */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-sky-900/10 bg-white shadow-[0_10px_35px_rgba(8,40,32,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:border-sky-500/40 hover:shadow-[0_24px_60px_rgba(8,40,32,0.14)]">
            {/* Top Image Banner */}
            <div className="relative h-44 w-full overflow-hidden bg-[#071926]">
              <Image
                src="/images/services/vaccinations.webp"
                alt="Pharmacist administering vaccination"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041019] via-black/40 to-transparent" />

              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-950/80 border border-sky-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200 backdrop-blur">
                  <Syringe className="h-3 w-3 text-sky-300" />
                  Clinic Visit
                </span>
              </div>
              <div className="absolute bottom-3 left-3.5 right-3.5">
                <h3
                  className="text-lg font-semibold text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Vaccines & Screenings
                </h3>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <p className="text-xs leading-relaxed text-[#5a6b62]">
                  Book certified flu, travel, and adult immunisations, plus on-site blood pressure, blood glucose, and BMI checks.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Flu Shot", "Yellow Fever", "BP & Glucose"].map((v) => (
                    <span
                      key={v}
                      className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/vaccinations"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-800"
                >
                  <span>Book clinic visit</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
