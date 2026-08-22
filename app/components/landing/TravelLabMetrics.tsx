"use client";

import { ShieldCheck, Clock, Award, Users, Compass } from "lucide-react";
import SplitTextWave from "./SplitTextWave";

const STATS = [
  {
    value: "100%",
    title: "PPB Licensed",
    desc: "Every premises is inspected by the Pharmacy and Poisons Board before listing.",
    icon: ShieldCheck,
  },
  {
    value: "< 45m",
    title: "Doorstep Speed",
    desc: "Dispatched from neighborhood chemists who already know local streets.",
    icon: Clock,
  },
  {
    value: "15k+",
    title: "Refills Audited",
    desc: "Managed safely across Nairobi, Mombasa, Kisumu, Nakuru, and Eldoret.",
    icon: Award,
  },
  {
    value: "6",
    title: "Counties Live",
    desc: "Active regional distribution with cold-chain verified transport.",
    icon: Compass,
  },
  {
    value: "4.9★",
    title: "Patient Score",
    desc: "From over 2,400+ verified customer reviews across the platform.",
    icon: Users,
  },
];

export default function TravelLabMetrics() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-24 bg-[#080c12] text-white overflow-hidden">
      <div className="landing-grain" aria-hidden />
      <div className="landing-ambient-glow pointer-events-none absolute left-1/2 top-1/2 h-[35rem] w-[35rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c2e28]/30 blur-[130px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <SplitTextWave
            as="p"
            text="Impact & Scale"
            delay={100}
            stagger={20}
            hoverStagger={15}
            className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300 cursor-pointer"
          />
          <div className="mt-3">
            <SplitTextWave
              as="h2"
              splitBy="word"
              text="Powering Kenya’s community healthcare rails"
              delay={200}
              stagger={25}
              hoverStagger={18}
              className="text-2xl font-medium tracking-tight sm:text-4xl text-white cursor-pointer"
              style={{ fontFamily: "var(--font-display), serif" }}
            />
          </div>
        </div>

        {/* 5-Column Clean Metric Grid */}
        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5 text-center">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:border-amber-400/30 hover:bg-white/10"
              >
                <Icon className="mx-auto h-5 w-5 text-amber-300" />
                <p
                  className="mt-4 text-3xl font-medium tracking-tight text-white sm:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {stat.value}
                </p>
                <h3 className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-200">
                  {stat.title}
                </h3>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
                  {stat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
