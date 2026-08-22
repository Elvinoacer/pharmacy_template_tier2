"use client";

import Image from "next/image";
import { ShieldCheck, Award } from "lucide-react";

const TEAM = [
  {
    name: "Dr. Priya Nair, PharmD",
    role: "Lead Pharmacist & Group CEO",
    qual: "PharmD · Chronic Disease Therapy",
    image: "/images/team/priya-nair.webp",
  },
  {
    name: "Marcus Chen, RPh",
    role: "Clinical Immunization Lead",
    qual: "RPh · Cold-Chain Certified",
    image: "/images/team/marcus-chen.webp",
  },
  {
    name: "Sofia Alvarez, PharmD",
    role: "Patient Adherence & Safety",
    qual: "PharmD · Drug Interaction Audit",
    image: "/images/team/sofia-alvarez.webp",
  },
  {
    name: "David Kim",
    role: "Logistics & Cold-Chain Lead",
    qual: "Good Pharmacy Practice (GPP)",
    image: "/images/team/david-kim.webp",
  },
];

export default function TravelLabTeam() {
  return (
    <section id="team" className="relative px-4 py-20 sm:px-6 sm:py-28 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0f172a]">
            Our Team
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-tight text-[#0f172a] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Clinical & Executive Leadership
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            Guided by veteran healthcare clinicians and technology builders.
          </p>
        </div>

        {/* 4-Grid Team Cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="group flex flex-col items-center text-center rounded-2xl border border-slate-200 bg-[#f8fafc] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#0f172a] hover:bg-white hover:shadow-lg"
            >
              <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-slate-200 shadow-md">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-110"
                  sizes="112px"
                />
              </div>

              <h3 className="mt-5 font-semibold text-sm text-[#0f172a]">
                {member.name}
              </h3>
              <p className="text-xs font-medium text-[#c9a227] mt-0.5">
                {member.role}
              </p>
              <p className="text-[11px] text-[#64748b] mt-1">
                {member.qual}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
