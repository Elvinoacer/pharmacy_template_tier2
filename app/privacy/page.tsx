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
        description="How information is handled across the Aether pharmacy network."
        crumbs={[{ label: "Privacy Policy" }]}
      />

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-[#5a6b62]">
          <p className="text-xs text-[#5a6b62]/80">Last updated: September 5, 2026</p>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">1. Who is responsible for your information</h2>
            <p className="mt-2">
              {platform.legalName} operates the Aether multi-tenant pharmacy platform. Each listed pharmacy controls
              the pharmacy-specific records it creates or receives through its storefront and staff workspace, while
              Aether operates the shared platform, security, account, infrastructure and support services. Questions
              can be sent to {platform.email} or {platform.phone}.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">2. Information we may process</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Account, identity and contact details, including name, email and phone.</li>
              <li>Pharmacy relationships, caregiver relationships and account preferences.</li>
              <li>Prescription, refill, order, dispensing, adherence, screening and vaccination records.</li>
              <li>Symptom check-in messages and optional health-related photos you choose to upload.</li>
              <li>Delivery details, approximate service location and booking information.</li>
              <li>Payment status, M-Pesa transaction references and reconciliation information; we do not need your M-Pesa PIN.</li>
              <li>Customer-support, pharmacist, AI-assistant and other messaging records.</li>
              <li>Loyalty activity, notifications, consent/preferences and audit/security events.</li>
              <li>Technical information needed for security and service operation, such as IP address, browser/device information and logs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">3. How we use information</h2>
            <p className="mt-2">
              Information is used to provide pharmacy services; authenticate accounts; process prescriptions,
              refills, orders, bookings and payments; support medication adherence and caregiver features; provide
              customer/pharmacist communication; detect abuse and security incidents; maintain audit records; improve
              reliability; and comply with applicable legal, professional and regulatory obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">4. Health information and emergencies</h2>
            <p className="mt-2">
              Prescription, adherence, screening, vaccination, symptom and related records may be sensitive health
              information. Access is restricted by account, pharmacy and role permissions. Optional symptom images
              are stored in private object storage and are served through short-lived application-authorised access.
              Do not use the website or AI assistant as an emergency service. In Kenya call {platform.emergency} or {platform.emergencyAlt} when urgent emergency help is required.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">5. AI-assisted features</h2>
            <p className="mt-2">
              Some features use an external AI model provider to generate educational or support responses. The
              platform is designed to minimise the information sent. Detailed caregiver clinical context is disabled
              by default unless the deployment has explicitly enabled that processing. AI does not replace a
              pharmacist or doctor and must not be used to make emergency, diagnostic or prescribing decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">6. Service providers and sharing</h2>
            <p className="mt-2">
              We do not sell personal information. Information may be processed by infrastructure, database, object
              storage, communications, push-notification, payment and AI service providers where required to operate
              the service. Pharmacy-specific information is available only to the relevant pharmacy and authorised
              users except where disclosure is required by law, needed to protect safety, or expressly authorised.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">7. Retention and deletion</h2>
            <p className="mt-2">
              Different records have different operational, clinical, financial, security and legal retention needs.
              We retain information only for the applicable purpose and required period, then delete or anonymise it
              where appropriate. Some records may need to be preserved for legal, professional, accounting, fraud or
              audit requirements even after an account is closed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">8. Security</h2>
            <p className="mt-2">
              Controls include tenant isolation, role-based access, database row-level security, protected sessions,
              encrypted integration credentials, private health-media storage, rate limiting and audit logging.
              Security reduces risk but no internet service can guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">9. Your choices and rights</h2>
            <p className="mt-2">
              Subject to applicable law and record-retention obligations, you may request access, correction,
              deletion or other available controls over personal information. You can also manage communication
              preferences in the product. Requests may require identity verification before information is disclosed
              or changed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">10. Cookies and analytics</h2>
            <p className="mt-2">
              Essential cookies are used for security and signed-in functionality. Optional analytics may be used
              when configured to understand product usage and reliability. Browser controls can be used to manage
              non-essential cookies where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0c1a14]">11. Contact</h2>
            <p className="mt-2">
              Privacy questions or rights requests:{" "}
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
