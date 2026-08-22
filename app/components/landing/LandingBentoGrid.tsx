"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Smartphone,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  CheckCircle2,
  Lock,
  ThermometerSnowflake,
  AlertTriangle,
  QrCode,
  HeartPulse,
  CreditCard,
  Zap,
} from "lucide-react";

export default function LandingBentoGrid() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-white overflow-hidden">
      {/* Subtle background ambient gradients */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-teal-50/90 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-amber-50/70 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">
            <Sparkles className="h-3.5 w-3.5" />
            The Aether Architecture
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Built for modern health in Kenya.
          </h2>
          <p className="mt-4 text-base text-[#5a6b62]">
            Combining enterprise-grade clinical safety with the personal warmth of your neighborhood chemist.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="mt-14 grid gap-6 md:grid-cols-12">
          {/* Tile 1: Hero Large (7 cols) - One Digital Health Record */}
          <div className="group relative md:col-span-7 flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-teal-900/10 bg-[#061e16] p-8 text-white shadow-[0_20px_50px_rgba(8,40,32,0.15)] sm:p-10">
            {/* Background Photography with Glass Gradient */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/gallery/careful_dispensing.webp"
                alt="Pharmacist carefully checking medication profile"
                fill
                className="object-cover opacity-25 transition duration-700 group-hover:scale-105 group-hover:opacity-30"
                sizes="(max-width: 1024px) 100vw, 700px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#041510] via-[#061e16]/90 to-[#092b21]/80" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/20 px-3 py-1 text-xs font-semibold text-teal-200 border border-teal-400/30 backdrop-blur">
                  <Lock className="h-3.5 w-3.5" />
                  Universal Patient Passport
                </span>
                <span className="text-xs text-teal-300/80 font-mono">01 / IDENTITY</span>
              </div>

              <h3
                className="mt-6 text-2xl font-medium tracking-tight sm:text-3xl text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                One record. Every accredited counter.
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-teal-100/85 sm:text-base">
                Prescriptions, refill history, allergy alerts, and loyalty points move seamlessly with you from Nairobi to Mombasa. No lost paper slips, no duplicate questioning.
              </p>

              {/* Simulated Patient Digital Card */}
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/20 bg-black/40 p-4 backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-300 text-[#041510] font-bold text-sm shadow">
                      AK
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Amina Kiprono</p>
                      <p className="text-[11px] text-teal-200/70">Aether Universal Patient ID: #KE-84920</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                    Verified Safe Profile
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-amber-400/30 bg-amber-950/40 p-2.5">
                    <p className="text-[10px] text-amber-300 font-bold uppercase">⚠️ Documented Allergy</p>
                    <p className="font-semibold text-white mt-0.5">Penicillin / Sulfa Class</p>
                  </div>
                  <div className="rounded-xl border border-teal-400/30 bg-teal-950/40 p-2.5">
                    <p className="text-[10px] text-teal-300 font-bold uppercase">Active Chronic Refill</p>
                    <p className="font-semibold text-white mt-0.5">Amlodipine 5mg (Monthly)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-xs font-bold text-teal-200 hover:text-white transition"
              >
                <span>Create your universal patient passport</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Tile 2: WhatsApp-First & M-Pesa Native (5 cols) */}
          <div className="relative md:col-span-5 flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-emerald-900/10 bg-[#0c2a20] p-8 text-white shadow-[0_20px_50px_rgba(8,40,32,0.12)] sm:p-10">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                  <Smartphone className="h-3.5 w-3.5" />
                  Kenyan Native
                </span>
                <span className="text-xs text-emerald-300/80 font-mono">02 / CHANNELS</span>
              </div>

              <h3
                className="mt-6 text-2xl font-medium tracking-tight text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                WhatsApp & M-Pesa at the counter.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                Order directly via familiar WhatsApp chats. Authorize instant Lipa na M-Pesa STK push at home or pick up at the priority counter.
              </p>

              {/* Chat snippet visual */}
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-black/40 p-4 text-xs space-y-2.5 backdrop-blur-md">
                <div className="rounded-xl bg-emerald-900/70 p-2.5 max-w-[90%] text-emerald-100 border border-emerald-500/20">
                  <p className="text-[11px]">👋 "Hello Pharmacist, here is my prescription slip for my monthly refills."</p>
                </div>
                <div className="rounded-xl bg-teal-800/90 p-2.5 max-w-[90%] ml-auto text-white border border-teal-400/30">
                  <p className="text-[11px] font-medium">"Refill verified! Sending M-Pesa STK push for KES 1,850. Rider dispatched in 30 mins."</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-emerald-800/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Zero platform surcharges
              </span>
              <span className="text-[11px] text-emerald-300/70 font-mono">MPESA · STK PUSH</span>
            </div>
          </div>

          {/* Tile 3: PPB Cold-Chain & Quality Control (4 cols) */}
          <div className="group relative md:col-span-4 flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-sky-900/10 bg-[#f0f7fa] p-8 shadow-[0_10px_35px_rgba(8,40,32,0.05)] sm:p-10">
            {/* Background image subtle */}
            <div className="absolute top-0 right-0 h-40 w-40 opacity-15 pointer-events-none">
              <Image
                src="/images/gallery/modern_care_tools.webp"
                alt="Modern cold-chain refrigeration tools"
                fill
                className="object-cover rounded-bl-full"
                sizes="160px"
              />
            </div>

            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 shadow-inner">
                <ThermometerSnowflake className="h-6 w-6" />
              </div>
              <h3
                className="mt-6 text-xl font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Cold-Chain Standard
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">
                Strict 2°C–8°C digital temperature logging for insulins, vaccines, and biologics. Verified PPB licence on every listing.
              </p>

              {/* Simulated Gauge */}
              <div className="mt-6 flex items-center justify-between rounded-xl border border-sky-200 bg-white p-3 text-xs shadow-sm">
                <span className="font-semibold text-sky-900">Live Temperature</span>
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  4.2°C · Optimal
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3 border-t border-sky-200/60">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                100% Anti-Counterfeit Policy
              </span>
            </div>
          </div>

          {/* Tile 4: AI Intelligence + Pharmacist Sign-Off (4 cols) */}
          <div className="group relative md:col-span-4 flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-amber-900/10 bg-[#fffcf2] p-8 shadow-[0_10px_35px_rgba(8,40,32,0.05)] sm:p-10">
            {/* Background image subtle */}
            <div className="absolute top-0 right-0 h-40 w-40 opacity-15 pointer-events-none">
              <Image
                src="/images/gallery/private_counselling.webp"
                alt="Private counselling consultation"
                fill
                className="object-cover rounded-bl-full"
                sizes="160px"
              />
            </div>

            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3
                className="mt-6 text-xl font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                AI + Human Clinical Gate
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">
                AI accelerates symptom triage and detects drug-drug interactions. A certified pharmacist signs off on every medication dispensed.
              </p>

              <div className="mt-6 rounded-xl border border-amber-200 bg-white p-3 text-xs shadow-sm flex items-center justify-between">
                <span className="text-[#5a6b62]">Dosage Verification</span>
                <span className="font-bold text-amber-800">Pharmacist Certified</span>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3 border-t border-amber-200/60">
              <Link
                href="/how-do-you-feel"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:underline"
              >
                <span>Try symptom triage</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Tile 5: Caregiver & Family Medication Circles (4 cols) */}
          <div className="group relative md:col-span-4 flex flex-col justify-between overflow-hidden rounded-[2.2rem] border border-rose-900/10 bg-[#fff5f5] p-8 shadow-[0_10px_35px_rgba(8,40,32,0.05)] sm:p-10">
            {/* Background image subtle */}
            <div className="absolute top-0 right-0 h-40 w-40 opacity-15 pointer-events-none">
              <Image
                src="/images/services/home-care-support.webp"
                alt="Home care medication support"
                fill
                className="object-cover rounded-bl-full"
                sizes="160px"
              />
            </div>

            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-800 shadow-inner">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3
                className="mt-6 text-xl font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Caregiver & Family Circles
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">
                Order and manage chronic prescriptions for elderly parents upcountry or children at home. Track refill schedules with ease.
              </p>

              <div className="mt-6 rounded-xl border border-rose-200 bg-white p-3 text-xs shadow-sm flex items-center justify-between">
                <span className="text-[#5a6b62]">Active Circle</span>
                <span className="font-bold text-rose-800">3 Family Members</span>
              </div>
            </div>

            <div className="relative z-10 mt-6 pt-3 border-t border-rose-200/60">
              <Link
                href="/caregiver"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 hover:underline"
              >
                <span>Open caregiver portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
