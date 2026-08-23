"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";
import SplitTextWave from "./SplitTextWave";

interface TravelLabHeroProps {
  pharmacyCount?: number;
  initialQuery?: string;
}

export default function TravelLabHero({ pharmacyCount = 0, initialQuery = "" }: TravelLabHeroProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  return (
    <section className="relative min-h-[88vh] flex flex-col justify-between overflow-hidden bg-[#070b10] text-white">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/gallery/welcoming_retail_floor.webp"
          alt="Pharmacy care environment"
          fill
          priority
          className="object-cover opacity-20 scale-105"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b10]/95 via-[#070b10]/72 to-[#070b10]" />
        <div className="landing-grain" aria-hidden />
      </div>

      <div className="pointer-events-none absolute -left-40 top-1/4 h-[35rem] w-[35rem] rounded-full bg-[#0c2e28]/40 blur-[140px]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-[30rem] w-[30rem] rounded-full bg-[#c9a227]/15 blur-[140px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 pb-14 pt-28 text-center sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/55 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 backdrop-blur-md sm:text-xs">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            Aether Healthcare Network
          </div>

          <div className="mx-auto mt-7 max-w-4xl">
            <SplitTextWave
              as="h1"
              delay={120}
              stagger={16}
              className="text-4xl font-medium tracking-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display), serif" }}
              lines={[
                { text: "Find the right pharmacy", className: "text-white drop-shadow" },
                { text: "when you need care.", className: "mt-1.5 italic font-medium text-[#fde047] drop-shadow-[0_2px_20px_rgba(253,224,71,0.25)]" },
              ]}
            />
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-200 sm:text-lg sm:leading-7">
            Discover pharmacies, medicines and healthcare services across Kenya — with public listings you can explore before you go.
          </p>

          <div className="mx-auto mt-8 max-w-2xl text-left">
            <form
              action="/pharmacies"
              method="GET"
              role="search"
              className="rounded-2xl border border-white/20 bg-black/70 p-2 shadow-2xl backdrop-blur-xl transition focus-within:border-amber-400/60 focus-within:ring-2 focus-within:ring-amber-400/10 sm:rounded-2xl"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex min-w-0 flex-1 items-center">
                  <Search aria-hidden className="pointer-events-none absolute left-4 h-5 w-5 text-amber-300/80" />
                  <label htmlFor="hero-pharmacy-search" className="sr-only">Search pharmacies, medicines or locations</label>
                  <input
                    id="hero-pharmacy-search"
                    name="q"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search a medicine, pharmacy or location"
                    autoComplete="off"
                    className="h-12 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-400 sm:text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-7 text-sm font-bold text-[#0a120e] shadow-md transition hover:brightness-110 active:scale-[0.98] sm:min-w-32"
                >
                  Search
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 px-2 pb-1 text-[11px] text-slate-400">
                <span>Try:</span>
                {[
                  "pharmacies near me",
                  "Nairobi",
                  "pain relief",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setSearchQuery(suggestion)}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 transition hover:border-amber-300/30 hover:bg-white/10 hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-4 flex flex-col items-center justify-center gap-3 text-xs sm:flex-row">
              <Link href="/pharmacies" className="inline-flex items-center gap-1.5 font-semibold text-white underline-offset-4 hover:text-amber-300 hover:underline">
                Browse the pharmacy directory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="hidden text-slate-500 sm:inline">·</span>
              <Link href="/pharmacies" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white">
                <MapPin className="h-3.5 w-3.5 text-amber-300" /> Explore by location
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-400 sm:text-xs">
            <span>Verified listings</span>
            <span className="text-slate-600">•</span>
            <span>Public medicine availability</span>
            <span className="text-slate-600">•</span>
            <span>Delivery options where available</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 bg-black/45 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 text-center text-[10px] text-slate-400 sm:text-xs">
          <span className="font-medium text-slate-300">
            {pharmacyCount > 0 ? `${pharmacyCount} featured pharmacies currently listed` : "Pharmacy directory available across Kenya"}
          </span>
          <span className="hidden text-slate-600 sm:inline">•</span>
          <span>Search by medicine, pharmacy or location</span>
        </div>
      </div>
    </section>
  );
}
