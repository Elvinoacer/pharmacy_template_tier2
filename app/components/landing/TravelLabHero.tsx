"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";
import SplitTextWave from "./SplitTextWave";

interface TravelLabHeroProps {
  pharmacyCount?: number;
  initialQuery?: string;
}

export default function TravelLabHero({ pharmacyCount = 12, initialQuery = "" }: TravelLabHeroProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-[#070b10] text-white sm:min-h-[92vh]">
      <div className="absolute inset-0 z-0">
        <Image src="/images/gallery/welcoming_retail_floor.webp" alt="Aether Healthcare Network Floor" fill priority className="object-cover opacity-25 scale-105 motion-safe:transition-transform motion-safe:duration-[10000ms]" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b10]/90 via-[#070b10]/72 to-[#070b10]" />
        <div className="landing-grain" aria-hidden />
      </div>
      <div className="pointer-events-none absolute -left-48 top-1/4 h-80 w-80 rounded-full bg-[#0c2e28]/40 blur-[120px] sm:h-[35rem] sm:w-[35rem] sm:blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-72 w-72 rounded-full bg-[#c9a227]/15 blur-[120px] sm:h-[30rem] sm:w-[30rem] sm:blur-[140px]" />

      <div className="relative z-10 mx-auto my-auto w-full max-w-6xl px-4 pb-8 pt-28 text-center sm:px-6 sm:pb-14 sm:pt-36 lg:px-8 lg:pt-40">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-400/35 bg-black/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300 shadow-[0_0_25px_rgba(201,162,39,0.2)] backdrop-blur-md sm:px-4 sm:text-xs sm:tracking-[0.25em]"><span className="relative flex h-2 w-2 shrink-0"><span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" /></span><SplitTextWave as="span" text="The Aether Healthcare Group" delay={80} stagger={20} className="truncate tracking-wider font-mono font-bold text-amber-300 sm:tracking-widest" /></div>
        <div className="mx-auto mt-6 max-w-4xl sm:mt-8"><SplitTextWave as="h1" delay={200} stagger={18} className="text-[clamp(2.25rem,10vw,4.5rem)] font-medium leading-[1.04] tracking-tight" style={{ fontFamily: "var(--font-display), serif" }} lines={[{ text: "Rewriting the story of", className: "text-white drop-shadow" },{ text: "pharmacy care in Africa.", className: "mt-1.5 italic font-medium text-[#fef08a] drop-shadow-[0_2px_20px_rgba(253,224,71,0.28)] sm:mt-2.5 sm:text-[#fde047]" }]} /></div>
        <div className="mx-auto mt-5 max-w-2xl text-[clamp(1rem,3.8vw,1.125rem)] leading-7 text-slate-200 sm:mt-6 sm:leading-relaxed"><SplitTextWave as="p" splitBy="word" text="Connecting independent accredited chemists, licensed clinicians, and families through one unified digital healthcare infrastructure." delay={550} stagger={28} className="leading-inherit font-normal text-slate-200" /></div>
        <div className="animate-hero-search mx-auto mt-8 max-w-xl sm:mt-10"><form action="#network" method="GET" className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-black/70 p-2 shadow-2xl backdrop-blur-xl transition duration-300 focus-within:border-amber-400/50 sm:flex-row sm:items-center sm:rounded-full"><div className="relative flex w-full flex-1 items-center"><Search className="pointer-events-none absolute left-4 h-5 w-5 text-amber-300/80 sm:h-4 sm:w-4" /><input name="q" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search pharmacy, county, or medicine..." className="h-12 w-full bg-transparent pl-12 pr-4 text-base text-white outline-none placeholder:text-slate-400 sm:h-11 sm:pl-11 sm:text-sm" /></div><button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-7 text-sm font-bold text-[#0a120e] shadow-md transition hover:brightness-110 active:scale-[0.98] sm:h-11 sm:min-h-0 sm:w-auto sm:rounded-full sm:text-xs"><span>Explore</span><ArrowRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button></form><div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-8 sm:gap-2.5">{[["#story","Our Story"],["#network","Network & Directory"],["#timeline","Milestones"],["#partners","Partners"],["#team","Our Team"]].map(([href,label]) => (<a key={href} href={href} className="min-h-10 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-slate-300 transition duration-200 hover:bg-white/10 hover:text-white sm:min-h-0 sm:px-3.5 sm:py-1.5 sm:text-xs">{label} ↓</a>))}</div></div>
      </div>
      <div className="relative z-10 border-t border-white/10 bg-black/50 py-3.5 backdrop-blur-md"><div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-slate-300 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-3 sm:px-6 sm:text-left lg:px-8"><span className="flex items-center gap-2 font-medium"><span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 motion-safe:animate-pulse" />Over {pharmacyCount}+ verified pharmacy premises live in Kenya</span><div className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-400 sm:justify-end sm:gap-x-4 sm:text-[11px]"><span>PPB Good Pharmacy Practice</span><span className="hidden sm:inline">·</span><span>M-Pesa STK Push</span><span className="hidden sm:inline">·</span><span>Cold-Chain Verified</span></div></div></div>
    </section>
  );
}
