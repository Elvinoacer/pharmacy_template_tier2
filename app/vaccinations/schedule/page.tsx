import type { Metadata } from "next";
import PageHero from "../../components/PageHero";
import CtaBanner from "../../components/CtaBanner";
import {
  ADULT_IMMUNIZATION_SCHEDULE,
  KEPI_CHILDHOOD_SCHEDULE,
} from "../../lib/vaccination-catalog";

export const metadata: Metadata = {
  title: "Immunisation schedules",
  description: "Adult, travel, and KEPI childhood immunisation schedules — information to plan overdue doses and travel vaccines.",
  alternates: { canonical: "/vaccinations/schedule" },
};

export default function ImmunizationSchedulePage() {
  return (
    <div>
      <PageHero
        eyebrow="Immunisation information"
        title="Schedules for adults, travel, and children"
        description="Use these as a conversation starter with our pharmacists. Childhood KEPI doses are given at public immunisation clinics; we help you read the booklet and catch up."
        crumbs={[
          { label: "Vaccinations", href: "/vaccinations" },
          { label: "Schedules" },
        ]}
      />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
              Adult & travel
            </h2>
            <ul className="mt-4 space-y-4">
              {ADULT_IMMUNIZATION_SCHEDULE.map((row) => (
                <li key={row.ageOrTrigger} className="border-b border-teal-900/5 pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700">{row.ageOrTrigger}</p>
                  <p className="mt-1 text-sm font-medium text-[#0c1a14]">{row.vaccines.join(" · ")}</p>
                  <p className="mt-1 text-xs text-[#5a6b62]">{row.note}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
              KEPI childhood (information)
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {KEPI_CHILDHOOD_SCHEDULE.map((row) => (
                <li key={row.age} className="flex gap-4 border-b border-teal-900/5 pb-2">
                  <span className="w-28 shrink-0 font-semibold text-[#084c3f]">{row.age}</span>
                  <span className="text-[#5a6b62]">{row.vaccines.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <CtaBanner
        title="Not sure what you are due?"
        description="Bring any paper records. We will review, explain, and book what this pharmacy is authorised to give — or refer you."
        primaryHref="/vaccinations/book"
        primaryLabel="Book a review"
        secondaryHref="/preventive"
        secondaryLabel="Immunisation counselling"
      />
    </div>
  );
}
