import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${platform.legalName}.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="How we collect, use, and protect information when you use this website."
        crumbs={[{ label: "Privacy Policy" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-[#5a6b62]">
          <p className="text-xs text-[#5a6b62]/80">Last updated: March 1, 2026 · Demo content for Tier 1 template</p>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              1. Who we are
            </h2>
            <p className="mt-2">
              {platform.legalName} (“we”, “us”) operates this website as a multi-tenant pharmacy network.
              Independent pharmacies on Aether keep their own patient records. Platform contact: {platform.email}, {platform.phone}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              2. Information we collect
            </h2>
            <p className="mt-2">We may collect information you submit through forms, including:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Contact details (name, phone, email)</li>
              <li>Refill request details (medicine name, preferred date, optional Rx number)</li>
              <li>Delivery area and messages</li>
              <li>Career applications and CV file names</li>
              <li>Technical data such as browser type (via analytics, when enabled)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              3. How we use information
            </h2>
            <p className="mt-2">
              We use submitted information to respond to enquiries, process refill and delivery requests as
              administrative messages, consider job applications, improve the website, and comply with legal
              obligations. Website forms in this Tier 1 demo do not create a full medical record system.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              4. Health information
            </h2>
            <p className="mt-2">
              When you share prescription-related details with a listed pharmacy, that pharmacy treats them in line
              with the Kenya Data Protection Act (2019) and applicable pharmacy regulations. Do not use website
              forms for emergencies — in Kenya call {platform.emergency} or {platform.emergencyAlt}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              5. Sharing
            </h2>
            <p className="mt-2">
              We do not sell your personal information. We may share data with service providers who help us operate
              email, hosting, or analytics, and when required by law or to protect safety.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              6. Retention & security
            </h2>
            <p className="mt-2">
              We retain enquiry data only as long as needed for the purpose collected or as required by law. We use
              reasonable technical and organisational measures to protect information; no method of transmission is
              100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              7. Your rights
            </h2>
            <p className="mt-2">
              Depending on your jurisdiction, you may request access, correction, or deletion of personal information
              we hold about you. Contact {platform.email} to make a request.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              8. Cookies & analytics
            </h2>
            <p className="mt-2">
              We may use essential cookies for site function and optional analytics (e.g. Google Analytics) to
              understand traffic. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]" style={{ fontFamily: "var(--font-display), serif" }}>
              9. Contact
            </h2>
            <p className="mt-2">
              Privacy questions:{" "}
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
