"use client";

import { Star, ShieldCheck, Clock, Award, Users, CheckCircle2, Quote } from "lucide-react";

const STATS = [
  {
    icon: ShieldCheck,
    value: "100%",
    label: "PPB Licensed & Verified",
    desc: "Every premises is inspected by the Pharmacy and Poisons Board before listing.",
  },
  {
    icon: Clock,
    value: "< 45 min",
    label: "Average Delivery Time",
    desc: "Dispatched from neighborhood chemists who already know the local streets.",
  },
  {
    icon: Award,
    value: "15,000+",
    label: "Prescriptions Refilled",
    desc: "Managed safely across Nairobi, Mombasa, Kisumu, Nakuru, and Eldoret.",
  },
  {
    icon: Users,
    value: "4.9 / 5.0",
    label: "Patient Satisfaction",
    desc: "From over 2,400+ verified customer reviews across the platform.",
  },
];

const COMMUNITY_STORIES = [
  {
    name: "Dr. Faith Mwangi",
    role: "Mother of two & Caregiver",
    location: "Kilimani, Nairobi",
    quote:
      "Managing my mother’s hypertension and diabetes refills used to mean queuing in traffic twice a month. With Aether, her regular chemist receives the order automatically and delivers right to her doorstep.",
    rating: 5,
    tag: "Caregiver Circle",
  },
  {
    name: "David Otieno",
    role: "Patient with Asthma",
    location: "Nyali, Mombasa",
    quote:
      "When my inhaler ran out on a Sunday evening, the AI pack scanner found an open partner pharmacy in 10 seconds. The pharmacist confirmed my prescription over WhatsApp within minutes.",
    rating: 5,
    tag: "Emergency Refill",
  },
  {
    name: "Dr. Kamau Karanja, PharmD",
    role: "Lead Pharmacist & Owner",
    location: "Westlands, Nairobi",
    quote:
      "Aether gives our independent pharmacy the modern digital power of a national chain without taking away our name or our direct patient relationships. Onboarding was smooth and ethical.",
    rating: 5,
    tag: "Accredited Owner",
  },
];

export default function LandingTrustMetrics() {
  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Metric Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-[2rem] border border-teal-900/10 bg-[#f8faf9] p-7 transition hover:-translate-y-1 hover:border-[#0d6e5a]/30 hover:bg-white hover:shadow-[0_16px_40px_rgba(8,40,32,0.08)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-[#0d6e5a] shadow-inner group-hover:bg-[#0d6e5a] group-hover:text-white transition">
                  <Icon className="h-5 w-5" />
                </div>
                <p
                  className="mt-6 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 font-semibold text-[#0d6e5a] text-sm">{stat.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#5a6b62]">{stat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Real Customer Stories Heading */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">
            Voices From The Community
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Trusted by families and clinicians alike.
          </h2>
          <p className="mt-2 text-sm text-[#5a6b62]">
            Real experiences from patients, caregivers, and pharmacists who rely on Aether every day.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {COMMUNITY_STORIES.map((story) => (
            <div
              key={story.name}
              className="relative flex flex-col justify-between rounded-[2rem] border border-teal-900/8 bg-[#fdfefd] p-8 shadow-[0_10px_35px_rgba(8,40,32,0.04)] transition hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: story.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#084c3f]">
                    {story.tag}
                  </span>
                </div>

                <blockquote className="mt-5 text-sm leading-relaxed text-[#3d4f46] italic">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="font-semibold text-sm text-[#0c1a14]">{story.name}</p>
                <p className="text-xs text-[#8a9a92]">{story.role} · {story.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
