import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for ${platform.legalName}.`,
  alternates: { canonical: "/terms" },
};

const sections = [
  { id: "acceptance", label: "Acceptance" },
  { id: "informational-purpose", label: "Informational purpose" },
  { id: "orders-payments", label: "Orders & payments" },
  { id: "form-submissions", label: "Form submissions" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "warranties", label: "Warranties" },
  { id: "liability", label: "Liability" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
] as const;

const sectionClass =
  "liquid-glass care-glass scroll-mt-28 rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-4 backdrop-blur-xl shadow-sm transition-colors duration-300 sm:rounded-3xl sm:p-6";

export default function TermsPage() {
  return (
    <div className="aether-route-surface aether-artwork-surface min-h-screen bg-transparent overflow-x-hidden text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description="Please read these terms before using this website."
        crumbs={[{ label: "Terms of Service" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto w-full max-w-4xl">
          <div className="liquid-glass care-glass mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-4 backdrop-blur-xl shadow-sm sm:mb-7 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="text-xs text-[var(--muted-2)]">Last updated: August 24, 2026</p>
            <Link
              href="/privacy"
              className="glass inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:w-auto"
            >
              View Privacy Policy
            </Link>
          </div>

          <nav aria-label="Terms sections" className="-mx-3 mb-6 overflow-x-auto px-3 pb-1 sm:mx-0 sm:mb-8 sm:px-0">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {sections.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="glass inline-flex min-h-10 shrink-0 items-center rounded-full px-3.5 py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  {index + 1}. {section.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="space-y-3.5 text-[13px] leading-6 text-[var(--muted)] sm:space-y-4 sm:text-sm sm:leading-7">
            <section id="acceptance" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                1. Acceptance
              </h2>
              <p className="mt-2">
                By accessing this website you agree to these Terms of Service and our{" "}
                <Link href="/privacy" className="font-semibold text-[var(--brand)] underline-offset-2 hover:underline">
                  Privacy Policy
                </Link>
                . If you do not agree, please do not use the site.
              </p>
            </section>

            <section id="informational-purpose" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                2. Informational purpose
              </h2>
              <p className="mt-2">
                Content on this website is for general information and education. It is not medical advice, diagnosis,
                or treatment. Always consult a licensed pharmacist or physician for decisions about your health. In an
                emergency in Kenya, call {platform.emergency} or {platform.emergencyAlt}.
              </p>
            </section>

            <section id="orders-payments" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                3. Orders, reservations and payments
              </h2>
              <p className="mt-2">
                Participating pharmacies may offer online reservations and M-Pesa payments for non-prescription items
                through this website. Prescription medicines require a valid prescription and are fulfilled by the
                pharmacy after pharmacist review. Refill and delivery forms are requests and do not guarantee
                fulfilment, pricing, or insurance coverage. Payments for reservations may be refunded per the
                cancelling pharmacy&apos;s policy.
              </p>
            </section>

            <section id="form-submissions" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                4. Form submissions
              </h2>
              <p className="mt-2">
                You agree to provide accurate information on contact, refill, delivery, and career forms. Misuse,
                spam, or fraudulent submissions are prohibited. We may refuse or ignore abusive requests.
              </p>
            </section>

            <section id="intellectual-property" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                5. Intellectual property
              </h2>
              <p className="mt-2">
                Site design, text, and branding are owned by {platform.legalName} or its licensors. Stock photographs are
                used under their respective licences (e.g. Unsplash). You may not copy or redistribute site content for
                commercial purposes without permission.
              </p>
            </section>

            <section id="warranties" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                6. Disclaimer of warranties
              </h2>
              <p className="mt-2">
                The website is provided “as is”. We do not warrant uninterrupted availability or error-free content.
                Service descriptions and hours may change without notice.
              </p>
            </section>

            <section id="liability" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                7. Limitation of liability
              </h2>
              <p className="mt-2">
                To the fullest extent permitted by law, {platform.legalName} is not liable for indirect or consequential
                damages arising from use of this website. Nothing in these terms limits liability that cannot be limited
                under applicable law.
              </p>
            </section>

            <section id="changes" className={sectionClass}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                8. Changes
              </h2>
              <p className="mt-2">
                We may update these terms from time to time. Continued use of the site after changes constitutes
                acceptance of the revised terms.
              </p>
            </section>

            <section id="contact" className={`${sectionClass} glass-panel-strong`}>
              <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg" style={{ fontFamily: "var(--font-display), serif" }}>
                9. Contact
              </h2>
              <p className="mt-2">Questions about these terms can be sent to our platform team.</p>
              <a
                href={`mailto:${platform.email}`}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:w-auto"
              >
                Email {platform.email}
              </a>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
