"use client";

import { Star, ShieldCheck, Clock, Award, Users } from "lucide-react";

const STATS = [
  { value: "100%", label: "PPB Licensed Premises", icon: ShieldCheck },
  { value: "< 45m", label: "Average Delivery Time", icon: Clock },
  { value: "15k+", label: "Prescriptions Refilled", icon: Award },
  { value: "4.9★", label: "Patient Satisfaction", icon: Star },
];

const REVIEWS = [
  {
    name: "Dr. Faith Mwangi",
    location: "Kilimani, Nairobi",
    quote: "With Aether, my mother’s regular chemist receives her chronic refills automatically and delivers straight to her doorstep.",
  },
  {
    name: "David Otieno",
    location: "Nyali, Mombasa",
    quote: "When my inhaler ran out on a Sunday, the AI pack scanner found an open partner chemist in seconds. Fast WhatsApp response.",
  },
  {
    name: "Dr. Kamau Karanja",
    location: "Westlands, Nairobi",
    quote: "Aether gives our pharmacy digital scale without taking away our brand or patient relationships.",
  },
];

export default function LandingTrustMetrics() {
  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl">
        {/* 4 Clean Metric Blocks */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5 text-center transition hover:bg-white hover:shadow-sm"
              >
                <p
                  className="text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#0c352f]">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* 3 Clean Quotes */}
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <div
              key={review.name}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#f8fafc] p-5 text-xs text-[#334155]"
            >
              <p className="italic leading-relaxed">&ldquo;{review.quote}&rdquo;</p>
              <div className="mt-4 pt-3 border-t border-slate-200/80 font-medium text-[#0f172a]">
                <span>{review.name}</span> · <span className="text-slate-500 font-normal">{review.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
