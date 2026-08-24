"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Camera,
  Pill,
  Syringe,
  ArrowRight,
  Scan,
  Zap,
} from "lucide-react";

export default function LandingQuickCareDeck() {
  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-20 bg-[#f8fafc]">
      <div className="mx-auto max-w-7xl">
        {/* Section Heading - Minimal & Punchy */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0f172a]">
              Care in 60 seconds
            </p>
            <h2
              className="mt-2 text-2xl font-semibold tracking-tight text-[#0f172a] sm:text-3xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Choose your service
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Average delivery under 45 minutes
          </span>
        </div>

        {/* 4 Clean Visual Cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: AI Health Triage */}
          <Link
            href="/how-do-you-feel"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="relative h-40 w-full overflow-hidden bg-slate-900">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/medication-counselling.webp"
                alt="Pharmacist counselling"
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
                AI Triage
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-sm text-[#0f172a] group-hover:text-[#c9a227] transition">
                How Do You Feel?
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Check symptoms & get clinical guidance.
              </p>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-[#0f172a] pt-2 border-t border-slate-100">
                <span>Start triage</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Card 2: Photo Medicine Scanner */}
          <Link
            href="/medicines?photo=1"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="relative h-40 w-full overflow-hidden bg-slate-900">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-dispensing.webp"
                alt="Medicine pack scanning"
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="landing-scanner-line absolute left-0 right-0 h-0.5 bg-amber-400" />
              <span className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
                Vision AI
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-sm text-[#0f172a] group-hover:text-[#c9a227] transition">
                Photo Medicine Search
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Snap any pack to check local stock.
              </p>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-[#0f172a] pt-2 border-t border-slate-100">
                <span>Scan pack</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Card 3: Prescription Refill */}
          <Link
            href="/refill"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="relative h-40 w-full overflow-hidden bg-slate-900">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/prescription-refills.webp"
                alt="Prescription refill"
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur">
                Fast Refill
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-sm text-[#0f172a] group-hover:text-[#c9a227] transition">
                60s Prescription Refill
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Re-order meds with M-Pesa STK push.
              </p>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-[#0f172a] pt-2 border-t border-slate-100">
                <span>Request refill</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Card 4: Vaccines & Screenings */}
          <Link
            href="/vaccinations"
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="relative h-40 w-full overflow-hidden bg-slate-900">
              <Image
                src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/services/vaccinations.webp"
                alt="Vaccinations and clinics"
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute top-3 left-3 rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 backdrop-blur">
                Clinic
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-sm text-[#0f172a] group-hover:text-[#c9a227] transition">
                Vaccines & Screenings
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Flu shots, BP, glucose, and travel vaccines.
              </p>
              <div className="mt-3 flex items-center justify-between text-xs font-bold text-[#0f172a] pt-2 border-t border-slate-100">
                <span>Book visit</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
