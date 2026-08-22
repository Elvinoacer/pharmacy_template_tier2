"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Mail, MessageCircle, Phone, Building2 } from "lucide-react";

export default function TravelLabContact() {
  return (
    <section id="contact" className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#070b10] text-white overflow-hidden">
      <div className="landing-hero-wash" aria-hidden />
      <div className="landing-grain" aria-hidden />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Contact & Inquiries
          </p>
          <h2
            className="mt-4 text-3xl font-medium tracking-tight sm:text-5xl text-white leading-tight"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Ready to experience better healthcare rails?
          </h2>
          <p className="mt-4 text-sm text-slate-300 sm:text-base">
            Whether you are a patient seeking 35-minute delivery or a pharmacy owner scaling your counter, we’re here to help.
          </p>

          {/* Dual CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c558] to-[#c9a227] px-8 py-3.5 text-xs font-bold text-[#0a120e] shadow-lg transition hover:brightness-110 active:scale-98"
            >
              <span>Onboard your pharmacy</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://wa.me/254790670542?text=Hello%20Aether%20Healthcare,%20I%20have%20an%20inquiry."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-98"
            >
              <MessageCircle className="h-4 w-4 text-amber-300" />
              <span>WhatsApp Helpline</span>
            </a>
          </div>
        </div>

        {/* 3 Operational Hub Cards */}
        <div className="mt-16 grid gap-6 sm:grid-cols-3 border-t border-white/10 pt-12 text-left">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <MapPin className="h-4 w-4" />
              <span>Nairobi HQ</span>
            </div>
            <h4 className="mt-3 font-semibold text-sm text-white">Central Operations</h4>
            <p className="mt-1 text-xs text-slate-400">
              Kenyatta Avenue, Nairobi CBD, Kenya
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Building2 className="h-4 w-4" />
              <span>Westlands Hub</span>
            </div>
            <h4 className="mt-3 font-semibold text-sm text-white">Tech & Clinician Desk</h4>
            <p className="mt-1 text-xs text-slate-400">
              Mpaka Road, Westlands, Nairobi
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <MapPin className="h-4 w-4" />
              <span>Coast Distribution</span>
            </div>
            <h4 className="mt-3 font-semibold text-sm text-white">Mombasa Regional Office</h4>
            <p className="mt-1 text-xs text-slate-400">
              Nyali Links Road, Mombasa, Kenya
            </p>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Aether Healthcare Group. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link href="/for-pharmacies" className="hover:text-white transition">Pharmacy Network Agreement</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
