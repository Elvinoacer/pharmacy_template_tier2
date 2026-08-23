import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for ${platform.legalName}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description="Please read these terms before using this website."
        crumbs={[{ label: "Terms of Service" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-[#5a6b62]">
          <p className="text-xs text-[#5a6b62]/80">Last updated: August 24, 2026</p>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              1. Acceptance
            </h2>
            <p className="mt-2">
              By accessing this website you agree to these Terms of Service and our Privacy Policy. If you do not
              agree, please do not use the site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              2. Informational purpose
            </h2>
            <p className="mt-2">
              Content on this website is for general information and education. It is not medical advice, diagnosis,
              or treatment. Always consult a licensed pharmacist or physician for decisions about your health. In an
              emergency in Kenya, call {platform.emergency} or {platform.emergencyAlt}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
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

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              4. Form submissions
            </h2>
            <p className="mt-2">
              You agree to provide accurate information on contact, refill, delivery, and career forms. Misuse,
              spam, or fraudulent submissions are prohibited. We may refuse or ignore abusive requests.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              5. Intellectual property
            </h2>
            <p className="mt-2">
              Site design, text, and branding are owned by {platform.legalName} or its licensors. Stock photographs are
              used under their respective licences (e.g. Unsplash). You may not copy or redistribute site content for
              commercial purposes without permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              6. Disclaimer of warranties
            </h2>
            <p className="mt-2">
              The website is provided “as is”. We do not warrant uninterrupted availability or error-free content.
              Service descriptions and hours may change without notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              7. Limitation of liability
            </h2>
            <p className="mt-2">
              To the fullest extent permitted by law, {platform.legalName} is not liable for indirect or consequential
              damages arising from use of this website. Nothing in these terms limits liability that cannot be limited
              under applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              8. Changes
            </h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the site after changes constitutes
              acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              9. Contact
            </h2>
            <p className="mt-2">
              Questions about these terms:{" "}
              <a href={`mailto:${platform.email}`} className="font-semibold text-teal-800">
                {platform.email}
              </a>
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
