"use client";

import { ShieldCheck, Clock, Users, Award, TrendingUp, CheckCircle } from "lucide-react";

const STATS = [
  { 
    value: "100%", 
    label: "PPB Licensed", 
    sublabel: "Verified premises only",
    icon: ShieldCheck,
    color: "text-emerald-600"
  },
  { 
    value: "< 45m", 
    label: "Avg Delivery", 
    sublabel: "Same-day dispatch",
    icon: Clock,
    color: "text-amber-600"
  },
  { 
    value: "15k+", 
    label: "Prescriptions", 
    sublabel: "Successfully refilled",
    icon: Award,
    color: "text-blue-600"
  },
  { 
    value: "4.9★", 
    label: "Patient Rating", 
    sublabel: "Across all pharmacies",
    icon: TrendingUp,
    color: "text-purple-600"
  },
];

const TRUST_BADGES = [
  "Cold-Chain Certified",
  "M-Pesa Native",
  "WhatsApp Ordering",
  "AI-Powered Triage",
];

export default function LandingStatsSection() {
  return (
    <section className="relative border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Trust Badges Strip */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          {TRUST_BADGES.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100"
            >
              <CheckCircle className="h-3 w-3" />
              {badge}
            </span>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-2xl bg-white p-5 text-center shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-slate-50/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="relative z-10">
                  <Icon className={`mx-auto h-6 w-6 ${stat.color} mb-2`} />
                  <p
                    className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{stat.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{stat.sublabel}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
