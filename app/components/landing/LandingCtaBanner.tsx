"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, HeartPulse, Building2 } from "lucide-react";

export default function LandingCtaBanner() {
  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-20 bg-[#080c12] text-white overflow-hidden">
      <div className="landing-hero-wash" aria-hidden />
      <div className="landing-grain" aria-hidden />

      <div className="relative mx-auto max-w-4xl text-center">
        <h2
          className="text-3xl font-medium tracking-tight sm:text-4xl lg:text-[2.75rem] leading-[1.15]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Life first.{" "}
          <span className="animate-shimmer-text italic font-medium">
            Caring, always.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Refills in 35 minutes or accredited pharmacy onboarding in 3 minutes.
        </p>

        {/* Dual Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#pharmacies"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-7 py-3 text-xs font-bold text-[#0a120e] shadow transition hover:brightness-110 active:scale-98"
          >
            <span>Find a pharmacy near you</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href="/onboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-98"
          >
            <span>List your pharmacy</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
