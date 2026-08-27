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
  Zap,
  Truck,
  CheckCircle2,
} from "lucide-react";

interface LandingHeroInteractiveProps {
  platformPromise: string;
  platformDescription: string;
  initialQuery?: string;
  pharmacyCount?: number;
}

const QUICK_SHORTCUTS = [
  { label: "Refill Rx", href: "/refill", icon: Pill, color: "text-amber-400" },
  { label: "AI Symptom Checker", href: "/how-do-you-feel", icon: Sparkles, color: "text-emerald-400" },
  { label: "Photo Medicine Scan", href: "/medicines?photo=1", icon: Camera, color: "text-blue-400" },
  { label: "Book Vaccines", href: "/vaccinations", icon: Syringe, color: "text-purple-400" },
];

export default function LandingHeroInteractive({
  initialQuery = "",
  pharmacyCount = 12,
}: LandingHeroInteractiveProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  return (
    <section className="landing-hero relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c131a] to-[#081016] text-white">
      {/* Animated background elements */}
      <div className="landing-hero-wash" aria-hidden />
      <div className="landing-grain" aria-hidden />
      
      {/* Enhanced ambient glows */}
      <div className="landing-ambient-glow pointer-events-none absolute -left-32 -top-20 h-[40rem] w-[40rem] rounded-full bg-gradient-to-br from-emerald-900/40 to-teal-800/30 blur-[140px]" />
      <div className="landing-ambient-glow pointer-events-none absolute -right-20 top-1/4 h-[35rem] w-[35rem] rounded-full bg-gradient-to-bl from-amber-900/30 to-yellow-800/20 blur-[150px]" />
      <div className="landing-ambient-glow pointer-events-none absolute left-1/2 bottom-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-gradient-to-t from-blue-900/25 to-indigo-800/15 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-36 lg:px-8 lg:pb-32">
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center lg:gap-20">
          {/* Left Column: Enhanced Typography & Focus */}
          <div className="lg:col-span-7">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-3 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-transparent px-4 py-2 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-xs font-semibold text-amber-200">Kenya Pharmacy Network</span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-medium text-slate-300">PPB Accredited</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>

            {/* Headline with enhanced typography */}
            <h1
              className="mt-8 text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Care that meets you{" "}
              <span className="block mt-2 font-medium italic bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 bg-clip-text text-transparent animate-shimmer-text">
                where you live.
              </span>
            </h1>

            {/* Subhead with better spacing */}
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              One universal account for accredited neighbourhood pharmacies. 
              Refills in 60s, AI clinical triage, and doorstep delivery across Kenya.
            </p>

            {/* Enhanced Search Form */}
            <div className="mt-10">
              <form
                action="/"
                method="GET"
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-3xl sm:rounded-full border border-white/10 bg-white/5 p-2.5 shadow-2xl backdrop-blur-xl focus-within:border-amber-400/50 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all"
              >
                <div className="relative flex flex-1 items-center">
                  <Search className="pointer-events-none absolute left-5 h-5 w-5 text-amber-300/80" />
                  <input
                    name="q"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pharmacy, city, or medicine..."
                    className="h-12 w-full bg-transparent pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl sm:rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-8 text-sm font-bold text-[#0a120e] shadow-lg shadow-amber-900/30 transition-all hover:brightness-110 hover:shadow-amber-900/50 active:scale-98"
                >
                  <span>Find Care</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Quick Action Chips */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                {QUICK_SHORTCUTS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition-all hover:bg-white/15 hover:text-white hover:border-white/30 hover:scale-105"
                  >
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* CTAs with better visual hierarchy */}
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3 text-sm font-bold text-[#0a120e] shadow-lg shadow-white/10 transition-all hover:bg-slate-100 hover:shadow-white/20 active:scale-98"
              >
                <span>Create free account</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/for-pharmacies"
                className="text-sm font-semibold text-amber-200/90 transition-all hover:text-amber-100 hover:underline hover:underline-offset-4"
              >
                Join as a pharmacy →
              </Link>
            </div>
          </div>

          {/* Right Column: Enhanced Visual Showcase Card */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-[#111827]/95 to-[#0b101b]/98 p-5 shadow-2xl backdrop-blur-xl">
              {/* Cover Photo with Live Badges */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.5rem]">
                <Image
                  src="https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp"
                  alt="Aether accredited partner pharmacy"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 460px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b101b] via-[#0b101b]/20 to-transparent" />

                {/* Top Status Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/85 border border-amber-400/50 px-3 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-md shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Open Now · Till 8 PM
                  </span>
                </div>

                <div className="absolute top-4 right-4">
                  <span className="rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-bold uppercase text-[#0c1a14] shadow-lg shadow-amber-900/50">
                    ★ 4.9 Verified
                  </span>
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                    Nairobi · Kenyatta Avenue
                  </p>
                  <p
                    className="text-xl font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Aether Central Pharmacy
                  </p>
                </div>
              </div>

              {/* 3 Quick Stat Blocks */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <Clock className="mx-auto h-4 w-4 text-amber-300 mb-1.5" />
                  <p className="font-bold text-white text-sm">35 Mins</p>
                  <p className="text-[10px] text-slate-400">Delivery</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <ShieldCheck className="mx-auto h-4 w-4 text-emerald-300 mb-1.5" />
                  <p className="font-bold text-white text-sm">PPB Licensed</p>
                  <p className="text-[10px] text-slate-400">Premise 0001</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <Truck className="mx-auto h-4 w-4 text-blue-300 mb-1.5" />
                  <p className="font-bold text-white text-sm">Doorstep</p>
                  <p className="text-[10px] text-slate-400">Courier</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <Link
                  href="/p/aether"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-white to-slate-100 px-4 py-3 text-xs font-bold text-[#0c1a14] shadow-lg transition-all hover:from-slate-100 hover:to-white active:scale-98"
                >
                  <span>Visit Storefront</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href="https://wa.me/254790670542?text=Hello%20Aether%20Pharmacy,%20I%20would%20like%20to%20inquire%20about%20a%20prescription"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-200 backdrop-blur-sm transition-all hover:bg-amber-400/20 hover:border-amber-400/60"
                >
                  <MessageCircle className="h-4 w-4 text-amber-300" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Ticker Strip */}
      <div className="relative border-t border-white/10 bg-black/50 backdrop-blur-sm py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-slate-300 sm:px-6 lg:px-8">
          <span className="font-medium flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            {pharmacyCount}+ verified pharmacy premises live in Kenya
          </span>
          <div className="hidden sm:flex items-center gap-6 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Same-Day Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Cold-Chain Certified
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              M-Pesa Native
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
