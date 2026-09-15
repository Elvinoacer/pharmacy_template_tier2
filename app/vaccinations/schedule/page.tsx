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
    <div className="bg-transparent">
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
          <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
              Adult & travel
            </h2>
            <ul className="mt-4 space-y-4">
              {ADULT_IMMUNIZATION_SCHEDULE.map((row) => (
                <li key={row.ageOrTrigger} className="border-b border-[var(--line-2)] pb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">{row.ageOrTrigger}</p>
                  <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{row.vaccines.join(" · ")}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{row.note}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="liquid-glass care-glass rounded-3xl border border-[var(--care-border)] bg-[var(--care-glass)] p-6 shadow-sm backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
              KEPI childhood (information)
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {KEPI_CHILDHOOD_SCHEDULE.map((row) => (
                <li key={row.age} className="flex gap-4 border-b border-[var(--line-2)] pb-2">
                  <span className="w-28 shrink-0 font-semibold text-[var(--brand-deep)]">{row.age}</span>
                  <span className="text-[var(--muted)]">{row.vaccines.join(", ")}</span>
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
