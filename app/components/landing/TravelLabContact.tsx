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
  { src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/priya-nair.webp", alt: "Kenyan customer" },
  { src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/marcus-chen.webp", alt: "Kenyan customer" },
  { src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/sofia-alvarez.webp", alt: "Kenyan customer" },
  { src: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/team/david-kim.webp", alt: "Kenyan customer" },
];

export default function TravelLabContact() {
  return (
    <section id="contact" className="relative overflow-hidden bg-[var(--background)] px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-emerald-600/10 blur-[150px]" />
        <div className="absolute right-10 top-1/3 h-[35rem] w-[35rem] rounded-full bg-yellow-500/10 blur-[160px]" />
        <div className="landing-grain opacity-[0.05]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#061810]/75 via-[#040e09]/85 to-[#0b140a]/90 p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-12 lg:p-16">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8 xl:gap-12">
            <div className="lg:col-span-5 xl:col-span-5">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#eab308]">Ready When You Are</p>
              <h2 className="mt-4 text-4xl font-normal leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl xl:text-[4.25rem]" style={{ fontFamily: "var(--font-display), serif" }}>
                What do you
                <br />
                <span className="italic text-[#ffd700] drop-shadow-[0_2px_16px_rgba(255,215,0,0.45)]">need</span>{" "}today?
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300 sm:text-lg">
                From finding trusted pharmacies to refilling prescriptions, we&apos;re here to make healthcare simpler for you.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-5">
                <Link href="/pharmacies" className="inline-flex items-center gap-2.5 rounded-full bg-[#ffd700] px-7 py-3.5 text-sm font-bold text-[#0a120e] shadow-[0_4px_24px_rgba(255,215,0,0.35)] transition-all hover:bg-[#ffe033] hover:scale-105 active:scale-95 sm:text-base">
                  <Store className="h-4 w-4" />
                  <span>Find a pharmacy</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="https://wa.me/254790670542?text=Hello%20Afyvia%20Healthcare,%20I%20have%20an%20inquiry." target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/40 px-7 py-3.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-all hover:border-white/30 hover:bg-black/60 active:scale-95 sm:text-base">
                  <MessageCircle className="h-4 w-4 text-[#ffd700]" />
                  <span>Ask on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Mobile uses normal document flow; orbital composition starts at md (768px). */}
            <div className="relative flex items-center justify-center lg:col-span-7 xl:col-span-7">
              <div className="relative w-full max-w-[620px] py-5 md:h-[500px] md:py-0">
                <svg viewBox="0 0 620 500" className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <filter id="ctaGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
                      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
                      <feMerge><feMergeNode in="blur2" /><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <radialGradient id="ctaHaloGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffd700" stopOpacity="0.2" />
                      <stop offset="45%" stopColor="#ffd700" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="340" cy="250" r="180" fill="url(#ctaHaloGlow)" />
                  <circle cx="340" cy="250" r="90" stroke="#ffd700" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="4 3" />
                  <circle cx="340" cy="250" r="160" stroke="#ffd700" strokeOpacity="0.18" strokeWidth="1.2" />
                  <circle cx="340" cy="250" r="230" stroke="#ffd700" strokeOpacity="0.12" strokeWidth="1.2" />
                  <circle cx="252" cy="225" r="3" fill="#ffd700" filter="url(#ctaGlow)" />
                  <circle cx="340" cy="90" r="4.5" fill="#ffd700" filter="url(#ctaGlow)" />
                  <circle cx="340" cy="410" r="4.5" fill="#ffd700" filter="url(#ctaGlow)" />
                  <circle cx="560" cy="285" r="4" fill="#ffd700" filter="url(#ctaGlow)" />
                </svg>

                <div className="relative z-20 mx-auto mb-5 flex items-center justify-center md:absolute md:left-[54.8%] md:top-1/2 md:mb-0 md:-translate-x-1/2 md:-translate-y-1/2">
                  <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-yellow-500/35 bg-[#121912]/95 shadow-[0_0_50px_rgba(255,215,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-2xl md:h-32 md:w-32 md:rounded-[2rem]">
                    <svg viewBox="0 0 48 48" className="h-12 w-12 text-[#ffd700] drop-shadow-[0_0_16px_rgba(255,215,0,0.6)] md:h-14 md:w-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M24 38s-13-8.5-17-17.5C3.5 12.5 8.5 7 15.5 7c4.5 0 7 3 8.5 4.5C25.5 10 28 7 32.5 7c7 0 12 5.5 8.5 13.5C37 29.5 24 38 24 38Z" />
                      <path d="M12 24h6l3-6 4 12 3-6h6" strokeWidth="3" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:contents">
                  <Link href="/pharmacies" className="group relative z-30 flex min-w-0 w-full items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-black/50 p-3 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/70 hover:scale-105 md:absolute md:left-[6%] md:top-[14%] md:w-auto md:gap-3.5 md:p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-700/90 text-emerald-100 shadow-sm md:h-11 md:w-11">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M10.5 4.5h3v6h6v3h-6v6h-3v-6h-6v-3h6v-6z" /></svg>
                    </div>
                    <div className="min-w-0"><p className="text-[11px] font-bold leading-tight text-white md:whitespace-nowrap md:text-sm">Find pharmacies</p><p className="mt-0.5 text-[10px] text-slate-400 md:text-xs">Near you</p></div>
                  </Link>

                  <Link href="/refill" className="group relative z-30 flex min-w-0 w-full items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-black/50 p-3 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/70 hover:scale-105 md:absolute md:right-[4%] md:top-[15%] md:w-auto md:gap-3.5 md:p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e2a1e] text-emerald-400 shadow-sm md:h-11 md:w-11"><FileText className="h-5 w-5" /></div>
                    <div className="min-w-0"><p className="text-[11px] font-bold leading-tight text-white md:whitespace-nowrap md:text-sm">Refill prescriptions</p><p className="mt-0.5 text-[10px] text-slate-400 md:text-xs">Quick &amp; easy</p></div>
                  </Link>

                  <Link href="/how-do-you-feel" className="group relative z-30 flex min-w-0 w-full items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-black/50 p-3 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/70 hover:scale-105 md:absolute md:bottom-[14%] md:left-[6%] md:w-auto md:gap-3.5 md:p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e2a1e] text-emerald-400 shadow-sm md:h-11 md:w-11"><MessageCircle className="h-5 w-5" /></div>
                    <div className="min-w-0"><p className="text-[11px] font-bold leading-tight text-white md:whitespace-nowrap md:text-sm">Health advice</p><p className="mt-0.5 text-[10px] text-slate-400 md:text-xs">From experts</p></div>
                  </Link>

                  <Link href="/health/self-care-guide" className="group relative z-30 flex min-w-0 w-full items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-black/50 p-3 shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-emerald-400/40 hover:bg-black/70 hover:scale-105 md:absolute md:bottom-[14%] md:right-[4%] md:w-auto md:gap-3.5 md:p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-[#0e2a1e] text-emerald-400 shadow-sm md:h-11 md:w-11"><ShieldCheck className="h-5 w-5" /></div>
                    <div className="min-w-0"><p className="text-[11px] font-bold leading-tight text-white md:whitespace-nowrap md:text-sm">Trusted care</p><p className="mt-0.5 text-[10px] text-slate-400 md:text-xs">Always</p></div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
