import type { Metadata } from "next";
import { Mail, ShieldCheck } from "lucide-react";
import PageHero from "../components/PageHero";
import { platform } from "../lib/data";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${platform.legalName}.`,
  alternates: { canonical: "/privacy" },
};

const sections = [
  ["responsibility", "Who is responsible"],
  ["information", "Information we process"],
  ["use", "How we use information"],
  ["health", "Health information"],
  ["ai", "AI-assisted features"],
  ["sharing", "Service providers"],
  ["retention", "Retention & deletion"],
  ["security", "Security"],
  ["rights", "Your rights"],
  ["cookies", "Cookies & analytics"],
  ["contact", "Contact"],
] as const;

const sectionClass =
  "liquid-glass care-glass scroll-mt-28 rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-4 backdrop-blur-xl shadow-sm sm:rounded-3xl sm:p-6";
const headingClass =
  "text-base font-semibold leading-snug text-[var(--foreground)] sm:text-lg";
const bodyClass = "mt-2 text-[13px] leading-6 text-[var(--muted)] sm:text-sm sm:leading-7";

export default function PrivacyPage() {
  return (
    <div className="afyvia-route-surface afyvia-artwork-surface min-h-screen bg-transparent overflow-x-hidden text-[var(--foreground)] transition-colors duration-300">
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="How information is handled across the Afyvia pharmacy network."
        crumbs={[{ label: "Privacy Policy" }]}
      />

      <section className="px-3 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto w-full max-w-4xl">
          <div className="liquid-glass care-glass mb-5 rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] p-4 backdrop-blur-xl shadow-sm sm:mb-7 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">Your privacy across Afyvia</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-sm sm:leading-6">
                  This policy explains what information may be processed, why it is used, how it is protected, and the choices available to you.
                </p>
                <p className="mt-2 text-[11px] font-medium text-[var(--muted-2)]">Last updated: September 5, 2026</p>
              </div>
            </div>
          </div>

          <nav aria-label="Privacy policy sections" className="mb-5 sm:mb-7">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted-2)]">Jump to a section</p>
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {sections.map(([id, label], index) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="glass inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold text-[var(--muted)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:text-xs"
                >
                  {index + 1}. {label}
                </a>
              ))}
            </div>
          </nav>

          <div className="space-y-3 sm:space-y-4">
            <section id="responsibility" className={sectionClass}>
              <h2 className={headingClass}>1. Who is responsible for your information</h2>
              <p className={bodyClass}>
                {platform.legalName} operates the Afyvia multi-tenant pharmacy platform. Each listed pharmacy controls
                the pharmacy-specific records it creates or receives through its storefront and staff workspace, while
                Afyvia operates the shared platform, security, account, infrastructure and support services. Questions
                can be sent to {platform.email} or {platform.phone}.
              </p>
            </section>

            <section id="information" className={sectionClass}>
              <h2 className={headingClass}>2. Information we may process</h2>
              <ul className="mt-3 space-y-2 text-[13px] leading-6 text-[var(--muted)] sm:text-sm sm:leading-7">
                {[
                  "Account, identity and contact details, including name, email and phone.",
                  "Pharmacy relationships, caregiver relationships and account preferences.",
                  "Prescription, refill, order, dispensing, adherence, screening and vaccination records.",
                  "Symptom check-in messages and optional health-related photos you choose to upload.",
                  "Delivery details, approximate service location and booking information.",
                  "Payment status, M-Pesa transaction references and reconciliation information; we do not need your M-Pesa PIN.",
                  "Customer-support, pharmacist, AI-assistant and other messaging records.",
                  "Loyalty activity, notifications, consent/preferences and audit/security events.",
                  "Technical information needed for security and service operation, such as IP address, browser/device information and logs.",
                ].map((item) => (
                  <li key={item} className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden="true" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="use" className={sectionClass}>
              <h2 className={headingClass}>3. How we use information</h2>
              <p className={bodyClass}>
                Information is used to provide pharmacy services; authenticate accounts; process prescriptions,
                refills, orders, bookings and payments; support medication adherence and caregiver features; provide
                customer/pharmacist communication; detect abuse and security incidents; maintain audit records; improve
                reliability; and comply with applicable legal, professional and regulatory obligations.
              </p>
            </section>

            <section id="health" className={sectionClass}>
              <h2 className={headingClass}>4. Health information and emergencies</h2>
              <p className={bodyClass}>
                Prescription, adherence, screening, vaccination, symptom and related records may be sensitive health
                information. Access is restricted by account, pharmacy and role permissions. Optional symptom images
                are stored in private object storage and are served through short-lived application-authorised access.
                Do not use the website or AI assistant as an emergency service. In Kenya call {platform.emergency} or {platform.emergencyAlt} when urgent emergency help is required.
              </p>
            </section>

            <section id="ai" className={sectionClass}>
              <h2 className={headingClass}>5. AI-assisted features</h2>
              <p className={bodyClass}>
                Some features use an external AI model provider to generate educational or support responses. The
                platform is designed to minimise the information sent. Detailed caregiver clinical context is disabled
                by default unless the deployment has explicitly enabled that processing. AI does not replace a
                pharmacist or doctor and must not be used to make emergency, diagnostic or prescribing decisions.
              </p>
            </section>

            <section id="sharing" className={sectionClass}>
              <h2 className={headingClass}>6. Service providers and sharing</h2>
              <p className={bodyClass}>
                We do not sell personal information. Information may be processed by infrastructure, database, object
                storage, communications, push-notification, payment and AI service providers where required to operate
                the service. Pharmacy-specific information is available only to the relevant pharmacy and authorised
                users except where disclosure is required by law, needed to protect safety, or expressly authorised.
              </p>
            </section>

            <section id="retention" className={sectionClass}>
              <h2 className={headingClass}>7. Retention and deletion</h2>
              <p className={bodyClass}>
                Different records have different operational, clinical, financial, security and legal retention needs.
                We retain information only for the applicable purpose and required period, then delete or anonymise it
                where appropriate. Some records may need to be preserved for legal, professional, accounting, fraud or
                audit requirements even after an account is closed.
              </p>
            </section>

            <section id="security" className={sectionClass}>
              <h2 className={headingClass}>8. Security</h2>
              <p className={bodyClass}>
                Controls include tenant isolation, role-based access, database row-level security, protected sessions,
                encrypted integration credentials, private health-media storage, rate limiting and audit logging.
                Security reduces risk but no internet service can guarantee absolute security.
              </p>
            </section>

            <section id="rights" className={sectionClass}>
              <h2 className={headingClass}>9. Your choices and rights</h2>
              <p className={bodyClass}>
                Subject to applicable law and record-retention obligations, you may request access, correction,
                deletion or other available controls over personal information. You can also manage communication
                preferences in the product. Requests may require identity verification before information is disclosed
                or changed.
              </p>
            </section>

            <section id="cookies" className={sectionClass}>
              <h2 className={headingClass}>10. Cookies and analytics</h2>
              <p className={bodyClass}>
                Essential cookies are used for security and signed-in functionality. Optional analytics may be used
                when configured to understand product usage and reliability. Browser controls can be used to manage
                non-essential cookies where applicable.
              </p>
            </section>

            <section id="contact" className={sectionClass}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className={headingClass}>11. Contact</h2>
                  <p className={bodyClass}>Privacy questions or rights requests can be sent directly to our privacy contact.</p>
                </div>
                <a
                  href={`mailto:${platform.email}`}
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 sm:w-auto"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email privacy team
                </a>
              </div>
              <p className="mt-3 break-all text-xs text-[var(--muted-2)]">{platform.email}</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
