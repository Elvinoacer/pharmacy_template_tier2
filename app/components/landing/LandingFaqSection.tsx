"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, HelpCircle, ArrowRight, Sparkles } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
  category: "patients" | "payments" | "owners";
}

const FAQS: FaqItem[] = [
  {
    category: "patients",
    q: "How does Aether verify that pharmacies are licensed and safe?",
    a: "Every pharmacy listed on Aether must submit a valid Pharmacy and Poisons Board (PPB) premise registration number, superintendent pharmacist credentials, and proof of proper cold-chain refrigeration. Superadmins inspect and verify each record before any storefront goes live.",
  },
  {
    category: "patients",
    q: "Can I use one patient account across multiple different pharmacies in Kenya?",
    a: "Yes! Your Aether account is universal across the entire network. When you move between neighborhoods or cities (e.g. Nairobi to Mombasa), your medication history, allergies, and refill reminders travel with you securely while each independent pharmacy remains in control of its local dispensing.",
  },
  {
    category: "patients",
    q: "How fast is same-day prescription delivery?",
    a: "Because orders are fulfilled by your nearest neighborhood pharmacy rather than a distant centralized warehouse, average doorstep dispatch time in Nairobi and Mombasa is under 45 minutes from pharmacist approval.",
  },
  {
    category: "payments",
    q: "Can I pay using M-Pesa STK Push or SHA / NHIF insurance?",
    a: "Yes. All accredited pharmacies support instant Lipa na M-Pesa STK push without any additional platform surcharges. Most partner branches also accept SHA / NHIF and private medical insurance schemes (AAR, Jubilee, Britam, CIC) — you can upload your insurance card during checkout.",
  },
  {
    category: "payments",
    q: "Are there extra hidden fees when ordering through Aether?",
    a: "No. Medicine prices are set directly by each pharmacy at standard retail counter rates. There are zero surprise service fees or platform commissions charged to patients.",
  },
  {
    category: "owners",
    q: "How does an independent pharmacy join the Aether Network?",
    a: "You can start your application online in under 3 minutes at /onboard. Submit your legal entity name, PPB premise number, and location. Our compliance team will review your application within 1 to 2 business days and help you configure your digital storefront.",
  },
  {
    category: "owners",
    q: "Does Aether take over my pharmacy branding or customer relationships?",
    a: "Never. Aether provides the digital rails — your pharmacy keeps its own brand, logo, hours, WhatsApp number, M-Pesa till, and direct customer relationships. You gain access to our unified patient network, refill management tools, and analytics dashboard.",
  },
];

export default function LandingFaqSection() {
  const [selectedCat, setSelectedCat] = useState<"all" | "patients" | "payments" | "owners">("all");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter(
    (item) => selectedCat === "all" || item.category === selectedCat
  );

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28 bg-[#f8fafc] border-t border-slate-200/80">
      <div className="mx-auto max-w-5xl">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#0f2e29]">
            <HelpCircle className="h-3.5 w-3.5 text-[#c9a227]" />
            Frequently Asked Questions
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight text-[#0f172a] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Everything you need to know
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            Clear answers about patient care, refills, insurance, and pharmacy onboarding.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "all", label: "All Questions" },
            { id: "patients", label: "For Patients & Refills" },
            { id: "payments", label: "M-Pesa & Insurance" },
            { id: "owners", label: "For Pharmacy Owners" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedCat(tab.id as "all" | "patients" | "payments" | "owners");
                setOpenIndex(null);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                selectedCat === tab.id
                  ? "bg-[#0f172a] text-white shadow-sm"
                  : "bg-white text-[#475569] border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        <div className="mt-10 space-y-3">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-[#0f172a] hover:text-[#0c352f] transition"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#0f172a]" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-[#f8fafc] p-5 pt-4 text-sm leading-relaxed text-[#475569]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Callout */}
        <div className="mt-12 text-center text-xs text-[#64748b]">
          Have a specific question not listed here?{" "}
          <Link href="/contact" className="font-bold text-[#0f172a] hover:underline">
            Speak with our platform care team
          </Link>{" "}
          or message our WhatsApp helpline.
        </div>
      </div>
    </section>
  );
}
