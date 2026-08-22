"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  Sparkles,
  Pill,
  Syringe,
  Camera,
  ShieldCheck,
  MapPin,
  Clock,
  MessageCircle,
  Activity,
  CheckCircle2,
  PhoneCall,
  Zap,
} from "lucide-react";

interface LandingHeroInteractiveProps {
  platformPromise: string;
  platformDescription: string;
  initialQuery?: string;
  pharmacyCount?: number;
}

const QUICK_SHORTCUTS = [
  { label: "Prescription Refill", href: "/refill", icon: Pill, color: "text-emerald-300" },
  { label: "AI Symptom Checker", href: "/how-do-you-feel", icon: Sparkles, color: "text-teal-200" },
  { label: "Photo Medicine Scan", href: "/medicines?photo=1", icon: Camera, color: "text-amber-200" },
  { label: "Book Vaccination", href: "/vaccinations", icon: Syringe, color: "text-sky-200" },
  { label: "Health Screenings", href: "/screenings", icon: Activity, color: "text-rose-200" },
];

const SYMPTOM_PREVIEWS = [
  {
    tag: "Fever & Body Chills",
    urgency: "Moderate triage",
    advice: "Check temperature. Hydrate with ORS. Clinical review recommended if >38.5°C persists.",
    actionHref: "/how-do-you-feel?symptom=fever",
  },
  {
    tag: "Child Cough & Wheeze",
    urgency: "Pharmacist consultation",
    advice: "Rule out airway restriction. Age-appropriate dosing verified by licensed professional.",
    actionHref: "/how-do-you-feel?symptom=cough",
  },
  {
    tag: "Acid Reflux & Heartburn",
    urgency: "Self-care eligible",
    advice: "Antacids or H2 blockers available for immediate same-day delivery.",
    actionHref: "/how-do-you-feel?symptom=reflux",
  },
];

export default function LandingHeroInteractive({
  platformPromise,
  platformDescription,
  initialQuery = "",
  pharmacyCount = 12,
}: LandingHeroInteractiveProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"pharmacy" | "ai" | "refill">("pharmacy");
  const [activeSymptomIndex, setActiveSymptomIndex] = useState(0);

  return (
    <section className="landing-hero relative overflow-hidden text-[#f3f7f4]">
      {/* Dynamic ambient backgrounds */}
      <div className="landing-hero-wash" aria-hidden />
      <div className="landing-grain" aria-hidden />
      <div className="landing-ambient-glow pointer-events-none absolute -left-32 -top-20 h-[36rem] w-[36rem] rounded-full bg-[#0d6e5a]/30 blur-[120px]" />
      <div className="landing-ambient-glow pointer-events-none absolute -right-20 top-1/3 h-[30rem] w-[30rem] rounded-full bg-[#c9a227]/12 blur-[130px]" />
      <div className="pointer-events-none absolute left-1/3 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#0f766e]/20 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-12 xl:gap-16">
          {/* Left Column: Vision & Primary Actions */}
          <div className="lg:col-span-7">
            {/* Live Trust Network Badge */}
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-teal-500/25 bg-teal-950/60 px-3.5 py-1.5 text-xs font-semibold text-teal-100 shadow-[0_0_20px_rgba(13,110,90,0.25)] backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="tracking-wide uppercase text-[11px] text-teal-200">Kenya Pharmacy Network</span>
              <span className="text-teal-400/50">·</span>
              <span className="text-teal-100/90 font-normal">PPB Accredited Premises</span>
              <span className="text-teal-400/50 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-amber-200/90 font-medium">M-Pesa Direct</span>
            </div>

            {/* Editorial Serif Headline */}
            <h1
              className="mt-6 text-4xl font-medium leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Care that meets you{" "}
              <span className="block mt-1 bg-gradient-to-r from-teal-200 via-emerald-200 to-amber-100 bg-clip-text italic text-transparent font-medium">
                where you live.
              </span>
            </h1>

            {/* Promise and description */}
            <p
              className="mt-5 text-lg font-medium leading-relaxed text-teal-100/90 sm:text-xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {platformPromise}
            </p>
            <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-teal-100/75 sm:text-base">
              {platformDescription} One universal account gives you instant prescription refills, AI clinical symptom guidance, and direct WhatsApp consultations with certified pharmacists.
            </p>

            {/* High-Impact Interactive Search & Quick Navigator */}
            <div className="mt-8">
              <form
                action="/"
                method="GET"
                className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center rounded-2xl sm:rounded-full border border-teal-500/30 bg-black/40 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl transition focus-within:border-teal-300/60 focus-within:ring-2 focus-within:ring-teal-400/20"
              >
                <div className="relative flex flex-1 items-center">
                  <Search className="pointer-events-none absolute left-4 h-5 w-5 text-teal-300/70" />
                  <input
                    name="q"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pharmacy name, city, county, or medicine..."
                    className="h-12 w-full rounded-xl sm:rounded-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-teal-200/50"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl sm:rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 px-7 text-sm font-bold text-[#052b22] shadow-[0_4px_20px_rgba(45,212,191,0.35)] transition duration-200 hover:brightness-105 active:scale-98"
                >
                  <span>Find Care</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </button>
              </form>

              {/* Quick Service Action Chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-300/70 mr-1">
                  Quick Access:
                </span>
                {QUICK_SHORTCUTS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-teal-100/90 backdrop-blur transition hover:border-teal-400/40 hover:bg-white/10 hover:text-white"
                  >
                    <item.icon className={`h-3.5 w-3.5 ${item.color} transition group-hover:scale-110`} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Bottom Quick Action CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-100 backdrop-blur transition hover:bg-emerald-500/25 hover:border-emerald-300 hover:text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Create free patient account
              </Link>
              <Link
                href="/for-pharmacies"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-200/90 transition hover:text-white hover:underline underline-offset-4"
              >
                <span>For pharmacy owners</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Care Simulator & Live Showcase */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              {/* Tab Selector for Interactive Card */}
              <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-black/40 p-1.5 backdrop-blur-xl shadow-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab("pharmacy")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-semibold transition ${
                    activeTab === "pharmacy"
                      ? "bg-teal-700/80 text-white shadow-md border border-teal-400/30"
                      : "text-teal-200/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Live Pharmacy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ai")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-semibold transition ${
                    activeTab === "ai"
                      ? "bg-teal-700/80 text-white shadow-md border border-teal-400/30"
                      : "text-teal-200/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>AI Symptom Triage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("refill")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-2.5 text-xs font-semibold transition ${
                    activeTab === "refill"
                      ? "bg-teal-700/80 text-white shadow-md border border-teal-400/30"
                      : "text-teal-200/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Refill in 60s</span>
                </button>
              </div>

              {/* Tab 1: Live Pharmacy Pulse Card */}
              {activeTab === "pharmacy" && (
                <div className="mt-3 overflow-hidden rounded-[1.75rem] border border-teal-500/20 bg-gradient-to-b from-[#09221b]/95 to-[#041510]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
                    <Image
                      src="/images/gallery/welcoming_retail_floor.webp"
                      alt="Aether accredited partner pharmacy"
                      fill
                      priority
                      className="object-cover transition duration-700 hover:scale-105"
                      sizes="(max-width: 1024px) 90vw, 460px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#041510] via-black/20 to-transparent" />
                    
                    {/* Live Status overlay badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Open Now · Till 8:00 PM
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0c1a14] shadow">
                        ★ 4.9 Verified
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-teal-300">
                        Nairobi · Kenyatta Avenue
                      </p>
                      <h3
                        className="text-xl font-medium text-white"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        Aether Central Pharmacy & Clinic
                      </h3>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                      <Clock className="mx-auto h-4 w-4 text-teal-300" />
                      <p className="mt-1 font-bold text-white">35 Mins</p>
                      <p className="text-[10px] text-teal-200/70">Avg. Delivery</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                      <ShieldCheck className="mx-auto h-4 w-4 text-emerald-300" />
                      <p className="mt-1 font-bold text-white">PPB Licensed</p>
                      <p className="text-[10px] text-teal-200/70">Premise 0001</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                      <Syringe className="mx-auto h-4 w-4 text-amber-300" />
                      <p className="mt-1 font-bold text-white">Cold-Chain</p>
                      <p className="text-[10px] text-teal-200/70">Vaccines Ready</p>
                    </div>
                  </div>

                  {/* Direct Actions */}
                  <div className="mt-4 flex gap-2.5">
                    <Link
                      href="/p/aether"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#084c3f] transition hover:bg-teal-50"
                    >
                      <span>Visit Storefront</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <a
                      href="https://wa.me/254790670542?text=Hello%20Aether%20Pharmacy,%20I%20would%20like%20to%20inquire%20about%20a%20prescription"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-950/70 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-900/60"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-400" />
                      <span>WhatsApp Rx</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Tab 2: AI Symptom Triage Preview */}
              {activeTab === "ai" && (
                <div className="mt-3 overflow-hidden rounded-[1.75rem] border border-teal-500/20 bg-gradient-to-b from-[#09221b]/95 to-[#041510]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400/20 text-teal-300">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">How Do You Feel? — AI Triage</p>
                        <p className="text-[11px] text-teal-200/70">Clinical safety protocol + Pharmacist sign-off</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-teal-400/15 px-2.5 py-0.5 text-[10px] font-bold text-teal-300">
                      Live Demo
                    </span>
                  </div>

                  {/* Interactive Symptom Chips */}
                  <p className="mt-4 text-xs font-medium text-teal-200/80">Select a common concern to simulate triage:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SYMPTOM_PREVIEWS.map((item, idx) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => setActiveSymptomIndex(idx)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                          activeSymptomIndex === idx
                            ? "bg-teal-400 text-[#041510] font-bold shadow"
                            : "bg-white/5 text-teal-100 hover:bg-white/10"
                        }`}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>

                  {/* Simulated Result Card */}
                  <div className="mt-4 rounded-xl border border-teal-400/20 bg-black/40 p-3.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-amber-300">
                        ● {SYMPTOM_PREVIEWS[activeSymptomIndex].urgency}
                      </span>
                      <span className="text-teal-200/60">Triage level 2</span>
                    </div>
                    <p className="mt-2 leading-relaxed text-teal-100/90">
                      {SYMPTOM_PREVIEWS[activeSymptomIndex].advice}
                    </p>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={SYMPTOM_PREVIEWS[activeSymptomIndex].actionHref}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-300 px-4 py-2.5 text-xs font-bold text-[#041510] transition hover:brightness-110"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Start full clinical triage with this symptom</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Tab 3: Fast Refill Simulator */}
              {activeTab === "refill" && (
                <div className="mt-3 overflow-hidden rounded-[1.75rem] border border-teal-500/20 bg-gradient-to-b from-[#09221b]/95 to-[#041510]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-300">
                        <Pill className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">60-Second Digital Refill</p>
                        <p className="text-[11px] text-teal-200/70">No queues, automatic reminders, doorstep dispatch</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      Step 1 of 3
                    </span>
                  </div>

                  {/* 3 Step Visual Flow */}
                  <div className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-950/40 p-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-bold text-[#041510] text-[11px]">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-white">Upload Rx or Select Active Medication</p>
                        <p className="text-[11px] text-teal-200/70">Photo scan or type name (Metformin, Amlodipine, etc.)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white text-[11px]">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-white">Pharmacist Dosage & Safety Review</p>
                        <p className="text-[11px] text-teal-200/70">Drug interaction check & insurance/M-Pesa authorization</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold text-white text-[11px]">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-white">Rider Dispatch or Counter Priority Pickup</p>
                        <p className="text-[11px] text-teal-200/70">Real-time SMS & WhatsApp delivery tracking</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Link
                      href="/refill"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2.5 text-xs font-bold text-[#041510] transition hover:brightness-110"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Request your refill now</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Floating Live Network Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                  <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">PPB Verified Only</p>
                    <p className="text-[10px] text-teal-200/70">Zero uninspected premises</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                  <PhoneCall className="h-5 w-5 text-amber-300 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">WhatsApp & M-Pesa</p>
                    <p className="text-[10px] text-teal-200/70">At the counter & online</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time trust ticker strip */}
      <div className="relative border-t border-teal-500/15 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-3 px-4 py-3.5 sm:px-6 lg:px-8 text-xs font-medium text-teal-100/80">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Over {pharmacyCount}+ verified pharmacy premises live in Kenya</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-teal-200/75">
            <span>✓ Same-Day Delivery</span>
            <span>✓ Cold-Chain Certified</span>
            <span>✓ SHA / NHIF Friendly</span>
            <span>✓ One Universal Login</span>
          </div>
        </div>
      </div>
    </section>
  );
}
