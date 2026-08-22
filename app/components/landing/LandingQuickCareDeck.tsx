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
  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-24 bg-[#f8fafc] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#0f2e29]">
              <Sparkle className="h-3.5 w-3.5 fill-[#c9a227] text-[#c9a227]" />
              Care Pathways In 60 Seconds
            </p>
            <h2
              className="mt-3 text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl lg:text-[2.65rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Digital speed. Human touch.{" "}
              <span className="italic text-[#0c352f]">No queues.</span>
            </h2>
            <p className="mt-3 text-base text-[#475569]">
              Choose how you want to be helped right now. Every pathway is backed by a licensed professional.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#0f172a] bg-white px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
            <Clock className="h-4 w-4 text-[#c9a227]" />
            <span>Average response & dispatch under 45 minutes</span>
          </div>
        </div>

        {/* 4 Creative High-Impact Visual Cards */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: AI Health Triage */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
            {/* Top Image Banner */}
            <div className="relative h-44 w-full overflow-hidden bg-slate-900">
              <Image
                src="/images/services/medication-counselling.webp"
                alt="Pharmacist counselling patient"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1017] via-black/30 to-transparent" />
              
              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/80 border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200 backdrop-blur">
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
                <p className="text-xs leading-relaxed text-[#475569]">
                  Describe symptoms in your own words or Sheng. Get evidence-based triage and pharmacist guidance.
                </p>

                {/* Symptom Tag Pills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["#Headache", "#ChildFever", "#AcidReflux"].map((s) => (
                    <span
                      key={s}
                      className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[#0f172a]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/how-do-you-feel"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-[#0b1b17] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#132d26]"
                >
                  <span>Check symptoms</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Photo Medicine Scanner */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-amber-400/40 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
            {/* Top Image Banner with Animated Laser Scanner */}
            <div className="relative h-44 w-full overflow-hidden bg-slate-900">
              <Image
                src="/images/services/prescription-dispensing.webp"
                alt="Medicine pack dispensing and scanning"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1017] via-black/40 to-transparent" />
              
              {/* Laser Scanning Line */}
              <div className="landing-scanner-line absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)]" />

              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/80 border border-amber-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200 backdrop-blur">
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
                <p className="text-xs leading-relaxed text-[#475569]">
                  Snap any blister pack, pill bottle, or handwritten slip. AI identifies the active drug and checks live local stock.
                </p>

                {/* Simulated AI Result Chip */}
                <div className="mt-4 flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/70 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">Metformin 500mg · In Stock</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/medicines?photo=1"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-[#c9a227] px-4 py-2.5 text-xs font-bold text-[#0a120e] shadow-sm transition hover:bg-[#dfba45]"
                >
                  <span>Scan medicine pack</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: 30-Second Prescription Refill */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-slate-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
            {/* Top Image Banner */}
            <div className="relative h-44 w-full overflow-hidden bg-slate-900">
              <Image
                src="/images/services/prescription-refills.webp"
                alt="Prescription refill preparation"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1017] via-black/40 to-transparent" />

              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/80 border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200 backdrop-blur">
                  <Zap className="h-3 w-3 text-amber-300" />
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
                <p className="text-xs leading-relaxed text-[#475569]">
                  Re-order ongoing chronic medications in two taps. Lipa na M-Pesa STK push with priority rider dispatch.
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs text-[#334155]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[#0f172a] text-[10px] font-bold">
                    ✓
                  </span>
                  <span className="text-[11px] font-medium">Automatic monthly SMS refill reminders</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  href="/refill"
                  className="inline-flex w-full items-center justify-between rounded-xl bg-[#0b1b17] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#132d26]"
                >
                  <span>Request fast refill</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 4: Vaccinations & Clinical Screenings */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-sky-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
            {/* Top Image Banner */}
            <div className="relative h-44 w-full overflow-hidden bg-slate-900">
              <Image
                src="/images/services/vaccinations.webp"
                alt="Pharmacist administering vaccination"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1017] via-black/40 to-transparent" />

              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/80 border border-sky-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200 backdrop-blur">
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
                <p className="text-xs leading-relaxed text-[#475569]">
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
                  className="inline-flex w-full items-center justify-between rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900"
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
