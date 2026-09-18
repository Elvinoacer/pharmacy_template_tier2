import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  FileCheck2,
  Rocket,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";
import PharmacyDemo from "@/app/components/onboard/PharmacyDemo";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export const metadata = {
  title: "How pharmacies join | Step-by-step walkthrough",
  description: "From your name to a live storefront patients can use. Step-by-step onboarding walkthrough for Kenyan community pharmacies.",
};

const steps = [
  {
    num: "01",
    title: "Name & Owner Account",
    desc: "Name your pharmacy, create your login password, and choose your web address (afyvia.health/p/your-name). Stays completely private until you launch.",
    duration: "1 minute",
    href: "/onboard",
    cta: "Start pharmacy profile",
    icon: Store,
    detail: "No paperwork needed now. Just your trading name and email.",
  },
  {
    num: "02",
    title: "Verification Details",
    desc: "Share the PPB, premises, pharmacist and business details you already have. Missing licensing documents do not stop intake; a platform admin reviews the application and available evidence before approval.",
    duration: "2 minutes",
    href: "/onboard/verification",
    cta: "Review verification details",
    icon: ShieldCheck,
    detail: "PPB and licensing evidence strengthens the review when available. Final approval is always manual.",
  },
  {
    num: "03",
    title: "GPS Pin & KES 100 Audit",
    desc: "Pin your shop location on the map so nearby patients can find you. The one-time KES 100 STK test securely links your M-PESA Till or Paybill.",
    duration: "1 minute",
    href: "/onboard/billing",
    cta: "See fee details",
    icon: Smartphone,
    detail: "Paid once. Price of chai & mandazi. KES 0 monthly until you launch.",
  },
  {
    num: "04",
    title: "Stock & Opening Hours",
    desc: "Pick your medicines from 1,400+ pre-loaded Kenyan brands with standard dosages, set your opening hours, and list your services.",
    duration: "5 minutes",
    href: "/admin/setup",
    cta: "Preview setup workspace",
    icon: FileCheck2,
    detail: "Pre-loaded with popular medicines (Augmentin, Metformin, Amoxicillin).",
  },
  {
    num: "05",
    title: "Go Live & Keep Patients",
    desc: "Activate your KES 500/month service (~KES 17/day) and open your doors online. Automated WhatsApp reminders keep chronic patients returning to your counter.",
    duration: "Instant",
    href: "/onboard",
    cta: "Launch your pharmacy",
    icon: Rocket,
    detail: "Just 1 saved refill (KES 2,500) covers 5 full months of Afyvia.",
  },
] as const;

export default function Walkthrough() {
  return (
    <div className={`${styles.page} afyvia-route-surface afyvia-artwork-surface bg-transparent`}>
      <div className={styles.frame}>
        <div className="flex items-center justify-between">
          <Link href="/for-pharmacies" className={styles.quietLink}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to overview
          </Link>
          <span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--brand)]" />
            Admin-reviewed onboarding flow
          </span>
        </div>

        <div className="mt-6 sm:mt-8 max-w-3xl">
          <p className={styles.kicker}>The Roadmap</p>
          <h1 className={styles.display} style={{ maxWidth: "16ch" }}>
            From join
            <em>to first patient.</em>
          </h1>
          <p className={styles.lead}>
            A simple path built for Kenyan community pharmacists. Test the live interactive demo below, then set up your shop in under 10 minutes.
          </p>
        </div>

        {/* Live Video Demo */}
        <div className="mt-6 sm:mt-8 max-w-4xl">
          <PharmacyDemo />
        </div>

        {/* Step-by-Step Cards */}
        <div className="mx-auto mt-8 sm:mt-10 max-w-4xl space-y-3">
          <div className="border-b border-[var(--line-2)] pb-3">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--foreground)]">
              Your 5-step journey to going live
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Total onboarding time: under 10 minutes. Simple, guided, and friendly.
            </p>
          </div>

          <ol className="space-y-3 pt-1">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.num}
                  className="liquid-glass care-glass rounded-xl border border-[var(--care-border)] bg-[var(--care-glass)] backdrop-blur-xl p-4 sm:p-5 shadow-sm transition-all hover:border-[var(--brand)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-soft)] font-mono text-sm font-bold text-[var(--brand)]">
                        {step.num}
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)]">{step.title}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)]">
                          <Clock size={11} /> {step.duration}
                        </span>
                      </div>
                    </div>

                    <Link href={step.href} className="btn-primary !min-h-[34px] !px-3.5 text-xs font-bold">
                      {step.cta} <ArrowRight size={12} aria-hidden />
                    </Link>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
                    {step.desc}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-[var(--card-elev)] px-2.5 py-1.5 text-xs font-medium text-[var(--brand-deep)]">
                    <Icon size={13} className="text-[var(--brand)] shrink-0" />
                    <span>{step.detail}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Final CTA */}
        <div className={`liquid-glass care-glass ${styles.closing} mx-auto mt-8 sm:mt-10 max-w-4xl rounded-2xl border border-[var(--care-border)] bg-[var(--care-glass)] backdrop-blur-xl p-6 sm:p-7 shadow-sm`}>
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold">
              Ready to claim your storefront?
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted)]">
              Start with Step 1 now. You pay nothing monthly until you review and launch.
            </p>
          </div>
          <Link href="/onboard" className="btn-primary !px-5 !py-2.5 text-sm sm:text-base">
            Create your pharmacy <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
