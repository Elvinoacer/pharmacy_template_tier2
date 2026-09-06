"use client";

import { Zap, Shield, Smartphone, Heart, Clock, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Zap,
    title: "60-Second Refills",
    description: "Re-order chronic medications in under a minute with saved prescriptions and one-tap M-Pesa checkout.",
    color: "from-amber-400 to-orange-500",
    bgGradient: "from-amber-50 to-orange-50",
  },
  {
    icon: Shield,
    title: "Verified Pharmacies Only",
    description: "Every pharmacy is PPB-accredited with verified premise licenses and superintendent pharmacists on record.",
    color: "from-emerald-400 to-teal-500",
    bgGradient: "from-emerald-50 to-teal-50",
  },
  {
    icon: Smartphone,
    title: "WhatsApp & M-Pesa Native",
    description: "Order via WhatsApp chat. Pay instantly with Lipa na M-Pesa STK push. Zero platform surcharges.",
    color: "from-blue-400 to-indigo-500",
    bgGradient: "from-blue-50 to-indigo-50",
  },
  {
    icon: Heart,
    title: "AI Health Triage",
    description: "Symptom checker powered by clinical guidelines. Get personalized care recommendations in seconds.",
    color: "from-pink-400 to-rose-500",
    bgGradient: "from-pink-50 to-rose-50",
  },
  {
    icon: Clock,
    title: "Same-Day Delivery",
    description: "Average dispatch time under 45 minutes from neighborhood pharmacies, not distant warehouses.",
    color: "from-purple-400 to-violet-500",
    bgGradient: "from-purple-50 to-violet-50",
  },
  {
    icon: TrendingUp,
    title: "Universal Patient ID",
    description: "One account works across all network pharmacies. Your medication history travels with you securely.",
    color: "from-cyan-400 to-sky-500",
    bgGradient: "from-cyan-50 to-sky-50",
  },
];

export default function LandingFeaturesShowcase() {
  return (
    <section className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
            Platform Features
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Healthcare designed for{" "}
            <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 bg-clip-text text-transparent">
              real life
            </span>
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Built on Kenya&apos;s most trusted pharmacy infrastructure. Every feature crafted to save time,
            reduce costs, and improve health outcomes for patients nationwide.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />

                <div className="relative z-10">
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg shadow-slate-200/50`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">
                    <span>Learn more</span>
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500">
            Ready to experience the future of pharmacy care?{" "}
            <a href="/register" className="font-semibold text-amber-600 hover:text-amber-700 underline underline-offset-2">
              Create your free account
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
