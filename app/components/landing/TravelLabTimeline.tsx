"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const MILESTONES = [
  {
    phase: "2024",
    title: "Founded in Nairobi",
    desc: "Afyvia is established to unite licensed independent pharmacies under one modern digital network.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp",
  },
  {
    phase: "2025",
    title: "Fintech & M-Pesa Rails",
    desc: "Integrated instant Lipa na M-Pesa STK push and Universal Patient ID across partner counters.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/careful_dispensing.webp",
  },
  {
    phase: "2025",
    title: "Cold-Chain & Clinics",
    desc: "Rolled out 2°C–8°C digital temperature logging and pharmacy-based vaccination booking.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/modern_care_tools.webp",
  },
  {
    phase: "2026",
    title: "AI Clinical Triage",
    desc: "Launched Vision AI medicine pack scanning and evidence-based pharmacist clinical triage.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/private_counselling.webp",
  },
  {
    phase: "Future",
    title: "National Scale",
    desc: "Expanding to 47 counties with unified chronic adherence and health plan integrations.",
    image: "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/curated_wellness_aisle.webp",
  },
];

export default function TravelLabTimeline() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="timeline" className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#f8fafc] overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0f172a]">
            Milestones
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-tight text-[#0f172a] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Our Growth & Technology Journey
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            From a single dispensary in Nairobi to a nationwide healthcare network.
          </p>
        </div>

        {/* Horizontal Timeline Bar */}
        <div className="mt-16 relative">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-7 left-12 right-12 h-0.5 bg-slate-200 z-0" />

          {/* Timeline Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 relative z-10">
            {MILESTONES.map((item, idx) => {
              const isSelected = activeIndex === idx;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`group flex flex-col text-left rounded-2xl border p-5 transition duration-300 ${
                    isSelected
                      ? "border-[#0f172a] bg-white shadow-xl -translate-y-1"
                      : "border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  {/* Point Holder */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs transition ${
                        isSelected
                          ? "bg-[#0f172a] text-amber-300 shadow-md"
                          : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                      }`}
                    >
                      {item.phase}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm text-[#0f172a] leading-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#475569]">
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Milestone Photo Spotlight */}
        <div className="mt-10 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-12 lg:items-center">
            <div className="relative h-64 lg:h-80 w-full lg:col-span-6 bg-slate-900">
              <Image
                src={MILESTONES[activeIndex].image}
                alt={MILESTONES[activeIndex].title}
                fill
                className="object-cover transition duration-700"
                sizes="(max-width: 1024px) 100vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 text-white">
                <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold uppercase text-amber-300 backdrop-blur">
                  Phase: {MILESTONES[activeIndex].phase}
                </span>
                <p className="mt-1 font-semibold text-base">{MILESTONES[activeIndex].title}</p>
              </div>
            </div>

            <div className="p-8 lg:col-span-6">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Milestone Highlight
              </span>
              <h3
                className="mt-2 text-2xl font-semibold text-[#0f172a]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {MILESTONES[activeIndex].title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#475569]">
                {MILESTONES[activeIndex].desc}
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => (prev > 0 ? prev - 1 : MILESTONES.length - 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
                  aria-label="Previous milestone"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveIndex((prev) => (prev < MILESTONES.length - 1 ? prev + 1 : 0))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition"
                  aria-label="Next milestone"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="text-xs font-mono text-slate-400">
                  {activeIndex + 1} of {MILESTONES.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
