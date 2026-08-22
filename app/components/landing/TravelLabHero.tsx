"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import TextDecoderWave from "./TextDecoderWave";
import SplitTextWaveScramble from "./SplitTextWaveScramble";

interface TravelLabHeroProps {
  pharmacyCount?: number;
  initialQuery?: string;
}

export default function TravelLabHero({
  pharmacyCount = 12,
  initialQuery = "",
}: TravelLabHeroProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between overflow-hidden bg-[#070b10] text-white">
      {/* Background Cinematic Image with Deep Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/gallery/welcoming_retail_floor.webp"
          alt="Aether Healthcare Network Floor"
          fill
          priority
          className="object-cover opacity-25 scale-105 transition-transform duration-10000"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b10]/90 via-[#070b10]/70 to-[#070b10]" />
        <div className="landing-grain" aria-hidden />
      </div>

      {/* Floating Ambient Lighting */}
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[35rem] w-[35rem] rounded-full bg-[#0c2e28]/40 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-[#c9a227]/15 blur-[140px]" />

      {/* Main Hero Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-32 pb-16 sm:px-6 sm:pt-40 lg:px-8 text-center my-auto">
        {/* ──────── 1. DECODING KICKER PILL: "The Aether Healthcare Group" ──────── */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-black/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300 backdrop-blur-md shadow-[0_0_25px_rgba(201,162,39,0.2)]">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          <TextDecoderWave
            text="The Aether Healthcare Group"
            delay={100}
            speed={25}
            className="tracking-widest font-mono text-amber-300 font-bold"
          />
        </div>

        {/* ──────── 2. SPLIT-TEXT WAVE SCRAMBLE HEADLINE ──────── */}
        <div className="mt-8 max-w-4xl mx-auto">
          <SplitTextWaveScramble
            as="h1"
            delay={250}
            speed={24}
            className="text-4xl font-medium tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.12]"
            style={{ fontFamily: "var(--font-display), serif" }}
            segments={[
              {
                text: "Rewriting the story of ",
                className: "text-white drop-shadow",
              },
              {
                text: "pharmacy care in Africa.",
                className: "italic font-medium text-[#fef08a] sm:text-[#fde047] drop-shadow-[0_2px_15px_rgba(253,224,71,0.25)]",
              },
            ]}
          />
        </div>

        {/* ──────── 3. DECODING WAVE SUBHEAD ──────── */}
        <div className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-200 sm:text-lg">
          <TextDecoderWave
            as="p"
            text="Connecting independent accredited chemists, licensed clinicians, and families through one unified digital healthcare infrastructure."
            delay={600}
            speed={14}
            className="leading-relaxed text-slate-200 font-normal"
          />
        </div>

        {/* ──────── 4. SEARCH & ACTION DOCK ──────── */}
        <div className="animate-hero-search mx-auto mt-10 max-w-xl">
          <form
            action="#network"
            method="GET"
            className="flex flex-col sm:flex-row items-center gap-2 rounded-2xl sm:rounded-full border border-white/20 bg-black/70 p-2 shadow-2xl backdrop-blur-xl focus-within:border-amber-400/50 transition duration-300"
          >
            <div className="relative flex flex-1 items-center w-full">
              <Search className="pointer-events-none absolute left-4 h-4 w-4 text-amber-300/80" />
              <input
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pharmacy, county, or medicine..."
                className="h-11 w-full bg-transparent pl-11 pr-4 text-xs sm:text-sm text-white outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-7 text-xs font-bold text-[#0a120e] shadow-md transition hover:brightness-110 active:scale-98"
            >
              <span>Explore</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quick Nav Anchors */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <a
              href="#story"
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition duration-200"
            >
              Our Story ↓
            </a>
            <a
              href="#network"
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition duration-200"
            >
              Network & Directory ↓
            </a>
            <a
              href="#timeline"
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition duration-200"
            >
              Milestones ↓
            </a>
            <a
              href="#partners"
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition duration-200"
            >
              Partners ↓
            </a>
            <a
              href="#team"
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition duration-200"
            >
              Our Team ↓
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Ticker Strip */}
      <div className="relative z-10 border-t border-white/10 bg-black/50 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-slate-300 sm:px-6 lg:px-8">
          <span className="font-medium flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Over {pharmacyCount}+ verified pharmacy premises live in Kenya
          </span>
          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span>PPB Good Pharmacy Practice (GPP)</span>
            <span>·</span>
            <span>M-Pesa STK Push Native</span>
            <span>·</span>
            <span>Cold-Chain Verified</span>
          </div>
        </div>
      </div>
    </section>
  );
}
