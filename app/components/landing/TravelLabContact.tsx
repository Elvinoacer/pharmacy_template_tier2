"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
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
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-emerald-600/10 blur-[150px]" />
        <div className="absolute right-10 top-1/3 h-[35rem] w-[35rem] rounded-full bg-yellow-500/10 blur-[160px]" />
        <div className="landing-grain opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Main CTA Frosted Glass Capsule */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#061810]/75 via-[#040e09]/85 to-[#0b140a]/90 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-12 lg:p-16">
          
          {/* Inner radial yellow aura behind orbital halo */}
          <div className="pointer-events-none absolute right-1/4 top-1/2 h-[35rem] w-[35rem] -translate-y-1/2 rounded-full bg-yellow-500/10 blur-[130px]" />

          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8 xl:gap-12">
            
            {/* Left Column: Heading, Subhead & Action Buttons */}
            <div className="lg:col-span-5 xl:col-span-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">
                Ready When You Are
              </p>

              <h2
                className="mt-4 text-4xl font-normal leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl xl:text-[4.25rem]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                What do you
                <br />
                <span className="italic text-[#ffd700] drop-shadow-[0_2px_16px_rgba(255,215,0,0.45)]">
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
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/40 px-7 py-3.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:border-white/30 hover:bg-black/60 active:scale-95 sm:text-base"
                >
                  <MessageCircle className="h-4 w-4 text-[#ffd700]" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Right Column: Concentric Orbital Halo & Symmetrical 2x2 Service Cards */}
            <div className="relative flex items-center justify-center lg:col-span-7 xl:col-span-7">
              <div className="relative flex w-full items-center justify-center py-6 sm:py-10">
                
                {/* Concentric Circular Orbital Tracks (Centered) */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  {/* Outer Orbit */}
                  <div className="relative h-[380px] w-[380px] rounded-full border border-yellow-500/15 sm:h-[430px] sm:w-[430px]">
                    <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#ffd700] shadow-[0_0_12px_#ffd700]" />
                    <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#ffd700] shadow-[0_0_12px_#ffd700]" />
                    <span className="absolute right-4 top-1/3 h-2 w-2 rounded-full bg-[#ffd700] opacity-80" />
                  </div>

                  {/* Middle Orbit */}
                  <div className="relative h-[270px] w-[270px] rounded-full border border-yellow-500/20 sm:h-[300px] sm:w-[300px]">
                    <span className="absolute -left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#ffd700] shadow-[0_0_10px_#ffd700]" />
                    <span className="absolute -right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#ffd700] shadow-[0_0_10px_#ffd700]" />
                  </div>

                  {/* Inner Orbit */}
                  <div className="relative h-[170px] w-[170px] rounded-full border border-yellow-500/25 sm:h-[190px] sm:w-[190px]" />
                </div>

                {/* Symmetrical 2x2 Service Cards Grid */}
                <div className="relative z-10 grid w-full max-w-[500px] grid-cols-2 gap-x-16 gap-y-24 sm:gap-x-24 sm:gap-y-28">
                  
                  {/* Card 1: Top-Left - Find pharmacies */}
                  <Link
                    href="/pharmacies"
                    className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-black/45 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/65 hover:scale-105"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/90 text-emerald-100 shadow-sm">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 fill-current"
                        aria-hidden="true"
                      >
                        <path d="M10.5 4.5h3v6h6v3h-6v6h-3v-6h-6v-3h6v-6z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white sm:text-sm whitespace-nowrap">Find pharmacies</p>
                      <p className="text-[10px] text-slate-400 sm:text-xs">Near you</p>
                    </div>
                  </Link>

                  {/* Card 2: Top-Right - Refill prescriptions */}
                  <Link
                    href="/refill"
                    className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-black/45 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/65 hover:scale-105"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e2a1e] text-emerald-400 shadow-sm">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white sm:text-sm whitespace-nowrap">Refill prescriptions</p>
                      <p className="text-[10px] text-slate-400 sm:text-xs">Quick & easy</p>
                    </div>
                  </Link>

                  {/* Central Heart Pulse Emblem (Centered in the exact middle) */}
                  <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                    <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-yellow-500/35 bg-[#121912]/95 shadow-[0_0_50px_rgba(255,215,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-2xl sm:h-32 sm:w-32">
                      <svg
                        viewBox="0 0 48 48"
                        className="h-14 w-14 text-[#ffd700] drop-shadow-[0_0_16px_rgba(255,215,0,0.6)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M24 38s-13-8.5-17-17.5C3.5 12.5 8.5 7 15.5 7c4.5 0 7 3 8.5 4.5C25.5 10 28 7 32.5 7c7 0 12 5.5 8.5 13.5C37 29.5 24 38 24 38Z" />
                        <path d="M12 24h6l3-6 4 12 3-6h6" strokeWidth="3" />
                      </svg>
                    </div>
                  </div>

                  {/* Card 3: Bottom-Left - Health advice */}
                  <Link
                    href="/how-do-you-feel"
                    className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-black/45 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/65 hover:scale-105"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e2a1e] text-emerald-400 shadow-sm">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white sm:text-sm whitespace-nowrap">Health advice</p>
                      <p className="text-[10px] text-slate-400 sm:text-xs">From experts</p>
                    </div>
                  </Link>

                  {/* Card 4: Bottom-Right - Trusted care */}
                  <Link
                    href="/health/self-care-guide"
                    className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-black/45 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/65 hover:scale-105"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e2a1e] text-emerald-400 shadow-sm">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white sm:text-sm whitespace-nowrap">Trusted care</p>
                      <p className="text-[10px] text-slate-400 sm:text-xs">Always</p>
                    </div>
                  </Link>

                </div>
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
          <div className="flex items-center gap-8 text-xs text-slate-300">
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
        <p className="mt-8 text-center text-xs text-slate-500">
          © 2026 Aether Healthcare Group. All rights reserved.
        </p>

      </div>
    </section>
  );
}