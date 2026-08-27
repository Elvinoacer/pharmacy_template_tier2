"use client";

import { ShieldCheck, Sparkles, Building2, Landmark, CreditCard, Award } from "lucide-react";

const PARTNERS = [
  {
    name: "Pharmacy & Poisons Board (PPB)",
    type: "Statutory Regulator",
    desc: "100% premises licensing and GPP compliance verification.",
    icon: ShieldCheck,
  },
  {
    name: "Safaricom Lipa na M-Pesa",
    type: "Payments & Mobile Money",
    desc: "Instant STK push authorization and digital receipts.",
    icon: CreditCard,
  },
  {
    name: "Social Health Authority (SHA / NHIF)",
    type: "Public Health Scheme",
    desc: "Digital prescription fulfillment & claim assistance.",
    icon: Landmark,
  },
  {
    name: "Mastercard Healthcare Rails",
    type: "Card & Fintech Solution",
    desc: "Secure multi-currency settlement & patient health cards.",
    icon: Sparkles,
  },
  {
    name: "Good Pharmacy Practice (GPP)",
    type: "Clinical Standard",
    desc: "Strict storage protocols & cold-chain adherence audits.",
    icon: Award,
  },
  {
    name: "Kenya Community Chemist Network",
    type: "Provider Alliance",
    desc: "Over 400+ independent retail pharmacists.",
    icon: Building2,
  },
];

export default function TravelLabPartners() {
  return (
    <section id="partners" className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#f8fafc] border-t border-slate-200/80">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0f172a]">
            Partners & Regulators
          </p>
          <h2
            className="mt-3 text-3xl font-medium tracking-tight text-[#0f172a] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Institutional Backing & Trust
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            Collaborating with leading statutory bodies, fintech networks, and healthcare innovators.
          </p>
        </div>

        {/* 6-Grid Partner Cards */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map((partner) => {
            const Icon = partner.icon;
            return (
              <div
                key={partner.name}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#0f172a] hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#0f172a] group-hover:bg-[#0f172a] group-hover:text-white transition">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#c9a227] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                      {partner.type}
                    </span>
                  </div>

                  <h3 className="mt-5 font-semibold text-base text-[#0f172a]">
                    {partner.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#64748b] leading-relaxed">
                    {partner.desc}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  Verified Partner Standard
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
