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
} from "lucide-react";

interface LandingHeroInteractiveProps {
  platformPromise: string;
  platformDescription: string;
  initialQuery?: string;
  pharmacyCount?: number;
}

const QUICK_SHORTCUTS = [
  { label: "Refill Rx", href: "/refill", icon: Pill, color: "text-amber-300" },
  { label: "AI Symptom Checker", href: "/how-do-you-feel", icon: Sparkles, color: "text-teal-200" },
  { label: "Photo Medicine Scan", href: "/medicines?photo=1", icon: Camera, color: "text-amber-200" },
  { label: "Book Vaccines", href: "/vaccinations", icon: Syringe, color: "text-sky-200" },
];

export default function LandingHeroInteractive({
  initialQuery = "",
  pharmacyCount = 12,
}: LandingHeroInteractiveProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  return (
    <section className="landing-hero relative overflow-hidden text-white">
      {/* Background ambient lighting */}
      <div className="landing-hero-wash" aria-hidden />
      <div className="landing-grain" aria-hidden />
      <div className="landing-ambient-glow pointer-events-none absolute -left-32 -top-20 h-[32rem] w-[32rem] rounded-full bg-[#0c2e28]/35 blur-[120px]" />
      <div className="landing-ambient-glow pointer-events-none absolute -right-20 top-1/4 h-[28rem] w-[28rem] rounded-full bg-[#c9a227]/10 blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          {/* Left Column: Minimal Text, Strong Focus */}
          <div className="lg:col-span-7">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span className="text-amber-300 font-bold">Kenya Pharmacy Network</span>
              <span className="text-slate-500">·</span>
              <span>PPB Accredited</span>
            </div>

            {/* Headline */}
            <h1
              className="mt-5 text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Care that meets you{" "}
              <span className="block mt-1 animate-shimmer-text italic font-medium">
                where you live.
              </span>
            </h1>

            {/* 1 Short Subhead */}
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              One universal account for accredited neighbourhood pharmacies. Refills in 60s, AI clinical triage, and doorstep delivery.
            </p>

            {/* Clean Search Form */}
            <div className="mt-8">
              <form
                action="/"
                method="GET"
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl sm:rounded-full border border-white/15 bg-black/60 p-2 shadow-2xl backdrop-blur-xl focus-within:border-amber-400/40"
              >
                <div className="relative flex flex-1 items-center">
                  <Search className="pointer-events-none absolute left-4 h-4 w-4 text-amber-200/80" />
                  <input
                    name="q"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pharmacy, city, or medicine..."
                    className="h-11 w-full bg-transparent pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl sm:rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-7 text-xs font-bold text-[#0a120e] shadow-md transition hover:brightness-110 active:scale-98"
                >
                  <span>Find Care</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* Quick Action Chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {QUICK_SHORTCUTS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white hover:border-white/20"
                  >
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-[#0a120e] shadow transition hover:bg-slate-100 active:scale-98"
              >
                <span>Create free account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/for-pharmacies"
                className="text-xs font-semibold text-amber-200/90 transition hover:text-white"
              >
                Join as a pharmacy →
              </Link>
            </div>
          </div>

          {/* Right Column: Clean Visual Showcase Card */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b from-[#111827]/90 to-[#0b101b]/95 p-4 shadow-2xl backdrop-blur-xl">
              {/* Cover Photo with Live Badges */}
              <div className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl">
                <Image
                  src="/images/gallery/welcoming_retail_floor.webp"
                  alt="Aether accredited partner pharmacy"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 460px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b101b] via-transparent to-transparent" />

                {/* Top Status Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 border border-amber-400/40 px-2.5 py-1 text-[10px] font-bold text-amber-200 backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Open Now · Till 8 PM
                  </span>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase text-[#0c1a14] shadow">
                    ★ 4.9 Verified
                  </span>
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Nairobi · Kenyatta Avenue
                  </p>
                  <p
                    className="text-lg font-medium text-white"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    Aether Central Pharmacy
                  </p>
                </div>
              </div>

              {/* 3 Quick Stat Blocks */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <Clock className="mx-auto h-3.5 w-3.5 text-amber-300" />
                  <p className="mt-1 font-bold text-white text-xs">35 Mins</p>
                  <p className="text-[10px] text-slate-400">Delivery</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <ShieldCheck className="mx-auto h-3.5 w-3.5 text-slate-200" />
                  <p className="mt-1 font-bold text-white text-xs">PPB Licensed</p>
                  <p className="text-[10px] text-slate-400">Premise 0001</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <Truck className="mx-auto h-3.5 w-3.5 text-amber-300" />
                  <p className="mt-1 font-bold text-white text-xs">Doorstep</p>
                  <p className="text-[10px] text-slate-400">Courier</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 flex gap-2">
                <Link
                  href="/p/aether"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#0c1a14] transition hover:bg-slate-100"
                >
                  <span>Visit Storefront</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href="https://wa.me/254790670542?text=Hello%20Aether%20Pharmacy,%20I%20would%20like%20to%20inquire%20about%20a%20prescription"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-black/60 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-black"
                >
                  <MessageCircle className="h-4 w-4 text-amber-300" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Ticker Strip */}
      <div className="relative border-t border-white/10 bg-black/40 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-slate-300 sm:px-6 lg:px-8">
          <span className="font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {pharmacyCount}+ verified pharmacy premises live in Kenya
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>✓ Same-Day Delivery</span>
            <span>✓ Cold-Chain Certified</span>
            <span>✓ M-Pesa Native</span>
          </div>
        </div>
      </div>
    </section>
  );
}
