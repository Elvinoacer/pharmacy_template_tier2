"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

export default function TravelLabContact() {
  return (
    <section id="contact" className="relative overflow-hidden bg-[#070b10] px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="landing-hero-wash" aria-hidden />
      <div className="landing-grain" aria-hidden />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Ready when you are</p>
          <h2 className="mt-4 text-3xl font-medium leading-tight tracking-tight text-white sm:text-5xl" style={{ fontFamily: "var(--font-display), serif" }}>
            What do you need today?
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/pharmacies" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-8 py-3.5 text-xs font-bold text-[#0a120e] shadow-lg transition hover:brightness-110 active:scale-98">
              <span>Find a pharmacy</span><ArrowRight className="h-4 w-4" />
            </Link>
            <a href="https://wa.me/254790670542?text=Hello%20Aether%20Healthcare,%20I%20have%20an%20inquiry." target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-98">
              <MessageCircle className="h-4 w-4 text-amber-300" /><span>Ask on WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Aether Healthcare Group. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms</Link>
            <Link href="/for-pharmacies" className="transition hover:text-white">For pharmacies</Link>
          </div>
        </div>
      </div>
    </section>
  );
}