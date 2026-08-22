"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, HeartPulse, Building2 } from "lucide-react";

export default function LandingCtaBanner() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#080c12] text-[#f8fafc] overflow-hidden">
      {/* Ambient background glow */}
      <div className="landing-hero-wash" aria-hidden />
      <div className="landing-grain" aria-hidden />
      <div className="landing-ambient-glow pointer-events-none absolute left-1/2 -top-24 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#0c2e28]/40 blur-[130px]" />
      <div className="landing-ambient-glow pointer-events-none absolute -right-20 -bottom-20 h-[28rem] w-[28rem] rounded-full bg-[#c9a227]/18 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/60 px-4 py-1.5 text-xs font-semibold text-amber-200 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>The Aether Healthcare Network</span>
        </div>

        <h2
          className="mt-6 text-3xl font-medium tracking-tight text-white sm:text-5xl lg:text-[3.25rem] leading-[1.12]"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Come for medicine.{" "}
          <span className="block mt-1 animate-shimmer-text italic font-medium">
            Stay for the people who still care.
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Whether you need tonight’s prescription refill delivered in 35 minutes or you’re an accredited pharmacy owner looking to expand your neighbourhood reach — you belong here.
        </p>

        {/* Dual Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="#pharmacies"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-8 py-3.5 text-sm font-bold text-[#0a120e] shadow-[0_4px_25px_rgba(201,162,39,0.35)] transition hover:brightness-110 active:scale-98"
          >
            <HeartPulse className="h-4 w-4 text-[#0a120e]" />
            <span>Find a pharmacy near you</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/onboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-98"
          >
            <Building2 className="h-4 w-4 text-amber-300" />
            <span>List your pharmacy</span>
          </Link>
        </div>

        {/* Trust Footnote */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium text-slate-400 border-t border-white/10 pt-8">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            PPB Licensed Premises Only
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Lipa na M-Pesa Native
          </span>
          <span className="flex items-center gap-1.5">
            <HeartPulse className="h-4 w-4 text-slate-300" />
            Data Protection Act 2019 Compliant
          </span>
        </div>
      </div>
    </section>
  );
}
