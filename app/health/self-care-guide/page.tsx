import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/app/components/PageHero";
import CtaBanner from "@/app/components/CtaBanner";
import SelfCareTriageClient from "@/app/components/health/SelfCareTriageClient";
import styles from "./SelfCareGuideSurface.module.css";

export const metadata: Metadata = {
  title: "Self-Care vs Medical Attention Guide | Clinical Triage",
  description:
    "Learn when your symptoms are safe for self-care with non-prescription OTC products and when you should consult a pharmacist or seek emergency medical attention.",
  alternates: { canonical: "/health/self-care-guide" },
};

export default function SelfCareGuidePage() {
  return (
    <div className={`${styles.surface} min-h-screen bg-transparent text-[var(--foreground)]`}>
      <PageHero
        eyebrow="Clinical Triage & Self-Care"
        title="When is a Condition Appropriate for Self-Care?"
        description="A comprehensive pharmacist-backed guide to help you distinguish between mild conditions suitable for home OTC care and symptoms requiring in-person clinical review or emergency attention."
        crumbs={[
          { label: "Health Library", href: "/health" },
          { label: "Self-Care vs Medical Attention Guide" },
        ]}
      />

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid gap-6 md:grid-cols-3">
            <div className="liquid-glass care-glass rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">1</span>
                <h3 className="font-bold text-emerald-950 dark:text-emerald-100">Self-Care Appropriate</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-emerald-900 dark:text-emerald-200/80">
                Mild, known, or transient symptoms with clear triggers. Safe to manage at home using over-the-counter (OTC) products, hydration, and rest for 3 to 7 days.
              </p>
            </div>

            <div className="liquid-glass care-glass rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">2</span>
                <h3 className="font-bold text-amber-950 dark:text-amber-100">Pharmacist / GP Review</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200/80">
                Symptoms persisting beyond expected timeframes, moderate discomfort, recurring episodes, or patients on multiple chronic prescription medicines.
              </p>
            </div>

            <div className="liquid-glass care-glass rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 shadow-sm backdrop-blur-xl">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-700 text-xs font-bold text-white">3</span>
                <h3 className="font-bold text-rose-950 dark:text-rose-100">Emergency Red Flags</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-rose-900 dark:text-rose-200/80">
                Severe pain, breathing difficulty, chest tightness, blood in stool/vomit, sudden confusion, or infant fever under 3 months. Requires emergency medical care.
              </p>
            </div>
          </div>

          <SelfCareTriageClient />

          <div className="mt-16 rounded-3xl border border-[var(--health-ui-border)] bg-[var(--card)] p-8 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display), serif" }}>
              The 4 Golden Rules of Safe OTC Self-Care
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-[var(--card-elev)] p-5"><span className="text-2xl">📋</span><h3 className="mt-3 font-semibold text-[var(--foreground)]">Always Check Labels</h3><p className="mt-1.5 text-xs leading-relaxed text-[var(--health-editorial-body)]">Check active ingredients to avoid accidental double-dosing (e.g. taking paracetamol cold sachets alongside paracetamol pain tablets).</p></div>
              <div className="rounded-2xl bg-[var(--card-elev)] p-5"><span className="text-2xl">⏳</span><h3 className="mt-3 font-semibold text-[var(--foreground)]">Respect Time Limits</h3><p className="mt-1.5 text-xs leading-relaxed text-[var(--health-editorial-body)]">OTC products are meant for short-term relief. If symptoms do not improve within 3–7 days, stop and consult our pharmacist or doctor.</p></div>
              <div className="rounded-2xl bg-[var(--card-elev)] p-5"><span className="text-2xl">⚖️</span><h3 className="mt-3 font-semibold text-[var(--foreground)]">Weight-Based Pediatric Dosing</h3><p className="mt-1.5 text-xs leading-relaxed text-[var(--health-editorial-body)]">Always dose children by weight, never by age alone. Use oral measuring syringes, never household tablespoons.</p></div>
              <div className="rounded-2xl bg-[var(--card-elev)] p-5"><span className="text-2xl">💬</span><h3 className="mt-3 font-semibold text-[var(--foreground)]">Ask About Interactions</h3><p className="mt-1.5 text-xs leading-relaxed text-[var(--health-editorial-body)]">Certain OTC medicines interact with blood pressure, diabetes, and blood-thinning prescriptions. Tell us what you take.</p></div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--health-ui-border)] pt-6">
              <p className="text-xs text-[var(--health-editorial-body)]">Need personalised guidance? Our licensed pharmacists are available during open hours.</p>
              <div className="flex gap-3">
                <Link href="/medicines" className="btn-primary !py-2 !px-4 text-xs font-semibold">Browse OTC Catalog</Link>
                <Link href="/how-do-you-feel" className="btn-ghost !py-2 !px-4 text-xs font-semibold">Try AI Symptom Check</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBanner
        title="Need to speak with a pharmacist?"
        description="Our clinical team is always available to help you evaluate symptoms, recommend the safest OTC treatment, or arrange doctor referrals when needed."
      />
    </div>
  );
}
