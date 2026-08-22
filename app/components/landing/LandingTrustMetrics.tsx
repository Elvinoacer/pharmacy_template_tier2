"use client";

import Image from "next/image";
import { Star, ShieldCheck, Clock, Award, Users, CheckCircle2, Quote, Sparkles } from "lucide-react";

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

const CLINICAL_LEADERS = [
  {
    name: "Dr. Priya Nair, PharmD",
    role: "Lead Pharmacist & Owner",
    qualification: "PharmD · Chronic Disease Therapy",
    image: "/images/team/priya-nair.webp",
  },
  {
    name: "Marcus Chen, RPh",
    role: "Clinical Immunization Lead",
    qualification: "RPh · Cold-Chain Certified",
    image: "/images/team/marcus-chen.webp",
  },
  {
    name: "Sofia Alvarez, PharmD",
    role: "Patient Adherence & Safety",
    qualification: "PharmD · Drug Interaction Audit",
    image: "/images/team/sofia-alvarez.webp",
  },
  {
    name: "David Kim",
    role: "Logistics & Cold-Chain Lead",
    qualification: "Good Pharmacy Practice (GPP)",
    image: "/images/team/david-kim.webp",
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
                className="group relative overflow-hidden rounded-[2.2rem] border border-slate-200/80 bg-[#f8fafc] p-7 transition hover:-translate-y-1.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-amber-300 shadow-inner group-hover:bg-[#0c2b24] group-hover:text-white transition duration-300">
                  <Icon className="h-6 w-6" />
                </div>
                <p
                  className="mt-6 text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 font-bold text-[#0c352f] text-sm">{stat.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#64748b]">{stat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Clinical Leadership Team Strip */}
        <div className="mt-20 rounded-[2.5rem] border border-slate-200/80 bg-[#f8fafc] p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0f2e29]">Clinical Leadership</p>
              <h3
                className="mt-2 text-2xl font-semibold text-[#0f172a] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Every Prescription Verified by Registered Pharmacists
              </h3>
            </div>
            <span className="text-xs font-semibold text-[#0f172a] bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
              🛡️ PPB Good Pharmacy Practice (GPP)
            </span>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CLINICAL_LEADERS.map((leader) => (
              <div
                key={leader.name}
                className="group flex flex-col items-center text-center rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
              >
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-200 shadow-md">
                  <Image
                    src={leader.image}
                    alt={leader.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-110"
                    sizes="96px"
                  />
                </div>
                <h4 className="mt-4 font-semibold text-sm text-[#0f172a]">{leader.name}</h4>
                <p className="text-xs font-medium text-[#0c352f] mt-0.5">{leader.role}</p>
                <p className="text-[11px] text-[#64748b] mt-1">{leader.qualification}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Real Customer Stories Heading */}
        <div className="mt-20 text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0f2e29]">
            Voices From The Community
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Trusted by families and clinicians alike.
          </h2>
          <p className="mt-2 text-sm text-[#64748b]">
            Real experiences from patients, caregivers, and pharmacists who rely on Aether every day.
          </p>
        </div>

        {/* Stories Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {COMMUNITY_STORIES.map((story) => (
            <div
              key={story.name}
              className="relative flex flex-col justify-between rounded-[2.2rem] border border-slate-200/80 bg-[#fdfefd] p-8 shadow-[0_10px_35px_rgba(15,23,42,0.03)] transition hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: story.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f172a]">
                    {story.tag}
                  </span>
                </div>

                <blockquote className="mt-5 text-sm leading-relaxed text-[#334155] italic">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="font-semibold text-sm text-[#0f172a]">{story.name}</p>
                <p className="text-xs text-[#64748b]">{story.role} · {story.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
