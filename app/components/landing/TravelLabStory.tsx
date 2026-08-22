"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, HeartPulse } from "lucide-react";

export default function TravelLabStory() {
  return (
    <section id="story" className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#f8fafc] overflow-hidden">
      <div className="mx-auto max-w-6xl">
        {/* Uppercase Kicker */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0f172a]">
            This Is Our Story
          </p>
          
          {/* Main Statement */}
          <h2
            className="mt-6 text-3xl font-medium tracking-tight text-[#0f172a] sm:text-4xl lg:text-5xl max-w-4xl mx-auto leading-[1.2]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            We brought modern healthcare rails to Kenya to empower independent pharmacists and make essential medicine effortless.
          </h2>

          <p className="mt-6 max-w-2xl mx-auto text-base text-[#475569] leading-relaxed">
            With strict Pharmacy and Poisons Board accreditation, cold-chain assurance, and native M-Pesa rails, we bridge the gap between world-class technology and neighbourhood compassion.
          </p>
        </div>

        {/* 3 Large Visual Story Cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {/* Story Card 1 */}
          <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-500 hover:-translate-y-1.5 hover:shadow-xl">
            <div className="relative h-60 w-full overflow-hidden bg-slate-900">
              <Image
                src="/images/gallery/careful_dispensing.webp"
                alt="Careful dispensing and clinical auditing"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 380px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute top-4 left-4 rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur">
                01 / Safety First
              </span>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Clinical Quality Assurance
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-xs leading-relaxed text-[#475569]">
                Every medication is verified by licensed pharmacists before dispensing. Zero uninspected premises, strict anti-counterfeit protocols.
              </p>
            </div>
          </div>

          {/* Story Card 2 */}
          <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-500 hover:-translate-y-1.5 hover:shadow-xl">
            <div className="relative h-60 w-full overflow-hidden bg-slate-900">
              <Image
                src="/images/gallery/modern_care_tools.webp"
                alt="Modern digital healthcare technology"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 380px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute top-4 left-4 rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur">
                02 / Rails & Tech
              </span>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  60-Second Refill Pipeline
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-xs leading-relaxed text-[#475569]">
                Vision AI pack scanning, universal patient records, and instant Lipa na M-Pesa STK push for effortless continuity of care.
              </p>
            </div>
          </div>

          {/* Story Card 3 */}
          <div className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-500 hover:-translate-y-1.5 hover:shadow-xl">
            <div className="relative h-60 w-full overflow-hidden bg-slate-900">
              <Image
                src="/images/gallery/private_counselling.webp"
                alt="Private counselling consultation"
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 380px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute top-4 left-4 rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur">
                03 / Community
              </span>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Neighbourhood Trust
                </h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-xs leading-relaxed text-[#475569]">
                Independent chemists retain their brand and direct patient relationships while gaining enterprise-grade digital reach.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
