"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  HeartPulse,
  MessageCircle,
  ShieldCheck,
  Store,
} from "lucide-react";

const AVATARS = [
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/priya-nair.webp",
    alt: "Kenyan customer",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/marcus-chen.webp",
    alt: "Kenyan customer",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/sofia-alvarez.webp",
    alt: "Kenyan customer",
  },
  {
    src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/david-kim.webp",
    alt: "Kenyan customer",
  },
];

export default function TravelLabContact() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-[#030907] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-emerald-600/10 blur-[150px]" />
        <div className="absolute right-10 top-1/3 h-[35rem] w-[35rem] rounded-full bg-yellow-500/10 blur-[160px]" />
        <div className="landing-grain opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Main CTA Card with Orbiting Halo */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#061810]/70 via-[#040e09]/80 to-[#0c140a]/90 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-12 lg:p-16">
          
          {/* Inner ambient yellow glow behind halo */}
          <div className="pointer-events-none absolute -right-20 top-1/2 h-[35rem] w-[35rem] -translate-y-1/2 rounded-full bg-yellow-400/15 blur-[120px]" />

          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
            
            {/* Left Column: Heading, Subhead & Action Buttons */}
            <div className="lg:col-span-6 xl:col-span-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">
                Ready When You Are
              </p>

              <h2
                className="mt-4 text-4xl font-normal leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl xl:text-[4rem]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                What do you
                <br />
                <span className="italic text-[#fde047] drop-shadow-[0_2px_16px_rgba(234,179,8,0.45)]">
                  need
                </span>{" "}
                today?
              </h2>

              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300 sm:text-lg">
                From finding trusted pharmacies to refilling prescriptions, we&apos;re here to make healthcare simpler for you.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-5">
                {/* Primary Button */}
                <Link
                  href="/pharmacies"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#ffd700] px-7 py-3.5 text-sm font-bold text-[#0a120e] shadow-[0_4px_24px_rgba(255,215,0,0.35)] transition-all hover:bg-[#ffe033] hover:scale-105 active:scale-95 sm:text-base"
                >
                  <Store className="h-4 w-4" />
                  <span>Find a pharmacy</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                {/* Secondary Button */}
                <a
                  href="https://wa.me/254790670542?text=Hello%20Aether%20Healthcare,%20I%20have%20an%20inquiry."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/10 active:scale-95 sm:text-base"
                >
                  <MessageCircle className="h-4 w-4 text-[#facc15]" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Right Column: Orbiting Halo & Central Heart Emblem */}
            <div className="relative flex items-center justify-center lg:col-span-6 xl:col-span-6">
              <div className="relative flex h-[380px] w-full max-w-[480px] items-center justify-center sm:h-[440px]">
                
                {/* Concentric Orbital Rings */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  {/* Outer Ring */}
                  <div className="relative h-[340px] w-[340px] rounded-full border border-yellow-500/10 sm:h-[400px] sm:w-[400px]">
                    <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#fde047] shadow-[0_0_10px_#fde047]" />
                    <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#fde047] shadow-[0_0_10px_#fde047]" />
                    <span className="absolute right-4 top-1/3 h-1.5 w-1.5 rounded-full bg-[#fde047] opacity-75" />
                  </div>

                  {/* Middle Ring */}
                  <div className="relative h-[240px] w-[240px] rounded-full border border-yellow-500/15 sm:h-[280px] sm:w-[280px]">
                    <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#fde047] shadow-[0_0_10px_#fde047]" />
                    <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#fde047] shadow-[0_0_10px_#fde047]" />
                  </div>

                  {/* Inner Ring */}
                  <div className="relative h-[160px] w-[160px] rounded-full border border-yellow-500/20 sm:h-[180px] sm:w-[180px]" />
                </div>

                {/* Central Glowing Pulse Heart Emblem */}
                <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-yellow-400/35 bg-black/85 shadow-[0_0_40px_rgba(234,179,8,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xl sm:h-32 sm:w-32">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-12 w-12 text-[#fde047] drop-shadow-[0_0_14px_#fde047]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    <path d="M3.22 12H8.5l1.5-3 2 6 1.5-3h6.28" />
                  </svg>
                </div>

                {/* 4 Orbiting Glass Cards */}
                
                {/* 1. Top-Left: Find Pharmacies */}
                <Link
                  href="/pharmacies"
                  className="group absolute -top-2 left-0 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 shadow-xl backdrop-blur-md transition-all hover:border-emerald-400/40 hover:bg-black/65 sm:-top-2 sm:left-4 sm:p-3.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/80 text-emerald-100 shadow-sm">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 fill-current"
                      aria-hidden="true"
                    >
                      <path d="M10.5 4.5h3v6h6v3h-6v6h-3v-6h-6v-3h6v-6z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white sm:text-sm">Find pharmacies</p>
                    <p className="text-[10px] text-slate-400 sm:text-xs">Near you</p>
                  </div>
                </Link>

                {/* 2. Top-Right: Refill Prescriptions */}
                <Link
                  href="/refill"
                  className="group absolute -top-2 right-0 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 shadow-xl backdrop-blur-md transition-all hover:border-emerald-400/40 hover:bg-black/65 sm:-top-2 sm:right-4 sm:p-3.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white sm:text-sm">Refill prescriptions</p>
                    <p className="text-[10px] text-slate-400 sm:text-xs">Quick & easy</p>
                  </div>
                </Link>

                {/* 3. Bottom-Left: Health Advice */}
                <Link
                  href="/how-do-you-feel"
                  className="group absolute -bottom-2 left-0 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 shadow-xl backdrop-blur-md transition-all hover:border-emerald-400/40 hover:bg-black/65 sm:-bottom-2 sm:left-4 sm:p-3.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-sm">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white sm:text-sm">Health advice</p>
                    <p className="text-[10px] text-slate-400 sm:text-xs">From experts</p>
                  </div>
                </Link>

                {/* 4. Bottom-Right: Trusted Care */}
                <Link
                  href="/health/self-care-guide"
                  className="group absolute -bottom-2 right-0 z-20 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3 shadow-xl backdrop-blur-md transition-all hover:border-emerald-400/40 hover:bg-black/65 sm:-bottom-2 sm:right-4 sm:p-3.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white sm:text-sm">Trusted care</p>
                    <p className="text-[10px] text-slate-400 sm:text-xs">Always</p>
                  </div>
                </Link>

              </div>
            </div>

          </div>
        </div>

        {/* Sub-bar: Priority Proof, Social Proof & Quick Links */}
        <div className="mt-8 flex flex-col items-center justify-between gap-6 border-b border-white/10 pb-8 sm:flex-row">
          
          {/* Left: Your health. Our priority. */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-emerald-400 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Your health. Our priority.</p>
              <p className="text-[11px] text-slate-400">Secure • Private • Reliable</p>
            </div>
          </div>

          {/* Center: Social Proof Stack */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5 overflow-hidden">
              {AVATARS.map((avatar, i) => (
                <Image
                  key={i}
                  src={avatar.src}
                  alt={avatar.alt}
                  width={34}
                  height={34}
                  className="inline-block h-8 w-8 rounded-full border-2 border-black/80 object-cover"
                />
              ))}
            </div>
            <div className="text-xs">
              <p className="font-semibold text-white">Trusted by 10,000+</p>
              <p className="text-slate-400">
                Kenyans across{" "}
                <span className="font-semibold text-[#34d399]">200+ pharmacies</span>
              </p>
            </div>
          </div>

          {/* Right: Quick Links */}
          <div className="flex items-center gap-6 text-xs text-slate-300">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <Link href="/for-pharmacies" className="transition hover:text-white">
              For pharmacies
            </Link>
          </div>
        </div>

        {/* Copyright Footnote */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Aether Healthcare Group. All rights reserved.
        </p>

      </div>
    </section>
  );
}