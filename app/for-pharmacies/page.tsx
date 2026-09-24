import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  WalletCards,
} from "lucide-react";
import PharmacyDemo from "@/app/components/onboard/PharmacyDemo";
import PharmacyRoiCalculator from "@/app/components/onboard/PharmacyRoiCalculator";
import styles from "@/app/components/onboard/OnboardSurface.module.css";

export const metadata = {
  title: "Pharmacy platform in Kenya — online storefront, medicines & services",
  alternates: { canonical: "/for-pharmacies" },
  openGraph: { title: "Afyvia for pharmacies in Kenya", description: "Publish your pharmacy storefront, medicines and services, and receive customer requests on Afyvia.", url: "/for-pharmacies" },
  description:
    "Your online storefront, refill requests and patient follow-up. KES 100 verification, then launch free. Premium is KES 500/month only when you need more.",
};

export default function ForPharmaciesPage() {
  return (
    <div className={`${styles.page} ${styles.landing} afyvia-route-surface afyvia-artwork-surface bg-transparent`}>
      <div className={styles.frame}>
        {/* Top Trust Notification Bar */}
        <div className="liquid-glass care-glass mb-2.5 sm:mb-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] backdrop-blur-xl px-3 py-1.5 text-[11px] text-[var(--muted)] shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[var(--foreground)]">Community Chemist Network:</span>
            <span>Nairobi, Mombasa, Kisumu &amp; Eldoret pharmacy network</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline">Admin verification: <strong>before launch</strong></span>
            <Link href="/for-pharmacies/walkthrough" className="font-bold text-[var(--brand)] hover:underline flex items-center gap-1">
              Step-by-step walkthrough <ArrowRight size={12} aria-hidden />
            </Link>
          </div>
        </div>

        {/* HERO SECTION */}
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>
              <Store size={15} aria-hidden /> Afyvia for community pharmacies
            </p>
            <h1 className={styles.heroTitle}>
              Your pharmacy.<br />
              <em>Now open online.</em>
            </h1>
            <p className={styles.lead}>
              Get found nearby. Let chronic patients request refills over WhatsApp. Launch on the free plan after a one-time KES 100 verification fee.
            </p>

            <div className={styles.heroActions}>
              <Link href="/onboard" className="btn-primary !px-5 !py-2.5 text-sm sm:text-base shadow-md shadow-emerald-900/15">
                Create your pharmacy <ArrowRight size={16} aria-hidden />
              </Link>
              <a href="#pricing" className={styles.quietLink}>
                Simple, upfront pricing <ArrowRight size={14} aria-hidden />
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3.5 text-xs font-semibold text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[var(--brand)]" aria-hidden />
                Manual verification before launch
              </span>
              <span className="flex items-center gap-1.5">
                <Smartphone size={15} className="text-[var(--brand)]" aria-hidden />
                Direct M-PESA Till &amp; Paybill payouts
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles size={15} className="text-[var(--brand)]" aria-hidden />
                Free plan · KES 100 verification
              </span>
            </div>

            {/* Quick Outcomes */}
            <div className={styles.outcomes}>
              {[
                ["01", "Get found nearby", "Your own web link at afyvia.health/p/your-slug"],
                ["02", "One clean queue", "Refills, prescriptions & walk-ins in one place"],
                ["03", "Keep chronic regulars", "Automated WhatsApp reminders before medicine runs out"],
              ].map(([number, title, detail]) => (
                <div key={number}>
                  <small>{number}</small>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE WORKSPACE DEMO */}
          <div className={styles.heroDemo}>
            <PharmacyDemo />
            <p className={`${styles.fieldHint} mt-2 text-center text-xs`}>
              ⚡ Live demo: Tap Storefront, Live Stock, or Refill Queue above to try it.
            </p>
          </div>
        </section>

        {/* INTERACTIVE RETENTION & ROI CALCULATOR */}
        <PharmacyRoiCalculator />

        {/* PRICING HERO SECTION */}
        <section id="pricing" className={`${styles.offer} mt-8 sm:mt-10`}>
          <div>
            <p className={styles.kicker}>
              <WalletCards size={15} aria-hidden /> Simple, honest pricing
            </p>
            <h2>Small cost.<br />New front door.</h2>
            <p>
              Digital storefront, live stock, prescription intake, and automated refill reminders. No commissions, no agency lock-in.
            </p>
          </div>
          <div className={styles.offerPrice}>
            <span>ONE TIME</span>
            <strong><small>KES</small> 100</strong>
            <p>Admin verification review &amp; anti-clone lock</p>
          </div>
          <div className={styles.offerPrice}>
            <span>ONLY AFTER LAUNCH</span>
            <strong><small>KES</small> 500<small> /mo</small></strong>
            <p>~KES 17 a day. KES 0 while setting up. 1 saved refill covers 5 months.</p>
          </div>
        </section>

        {/* WHY THESE FEES - DETAILED TRANSPARENCY */}
        <section className="mt-6 sm:mt-8 grid gap-4 sm:gap-6 md:grid-cols-2" aria-label="Why these fees">
          {/* Card 1: KES 100 Verification Fee */}
          <div className="liquid-glass care-glass rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] backdrop-blur-xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
                  <ShieldCheck size={16} aria-hidden />
                  <span>Why KES 100 Verification Fee?</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                  Paid Once
                </span>
              </div>
              <h3 className="mt-2 text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                Protecting patients and your pharmacy&apos;s name
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                Anyone can put a business name online. The KES 100 fee covers real validation before you go live:
              </p>
              <ul className="mt-3.5 space-y-2 text-xs text-[var(--muted)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden />
                  <span>
                    <strong>Regulatory Evidence Review:</strong> Share PPB and licensing details when available. Missing paperwork does not stop intake; an admin reviews the evidence before approval.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden />
                  <span>
                    <strong>Anti-Clone Lock:</strong> Locks your pharmacy name &amp; GPS pin so copycats can&apos;t pretend to be you.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Smartphone size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden />
                  <span>
                    <strong>M-PESA Handshake:</strong> 1-second STK test links your Till or Paybill for instant patient payouts.
                  </span>
                </li>
              </ul>
            </div>
            <div className="mt-4 rounded-xl bg-[var(--brand-soft)] p-3 text-xs font-semibold text-[var(--brand-deep)]">
              ☕ Paid once. Less than chai &amp; mandazi to unlock the verified badge patients look for.
            </div>
          </div>

          {/* Card 2: KES 500/Month Subscription */}
          <div className="liquid-glass care-glass rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] backdrop-blur-xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--brand)]">
                  <Sparkles size={16} aria-hidden />
                  <span>Optional Premium · KES 500 / month</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                  After Launch
                </span>
              </div>
              <h3 className="mt-2 text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                1 saved regular covers 5 months of service
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                Pharmacies lose up to 35% of chronic patients to silent churn. Here is what your KES 17/day replaces:
              </p>
              <ul className="mt-3.5 space-y-2 text-xs text-[var(--muted)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden />
                  <span>
                    <strong>WhatsApp Refill Reminders:</strong> Pings hypertension &amp; diabetes patients before their medicines run out.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden />
                  <span>
                    <strong>1,400+ Kenyan Medicines:</strong> Pre-loaded dosages &amp; packs. Zero tedious typing or manual catalog entry.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden />
                  <span>
                    <strong>Prescription Reach:</strong> Your direct storefront requests stay available; Free includes 10 new Afyvia marketplace prescription referrals each month, while Premium removes that marketplace cap.
                  </span>
                </li>
              </ul>
            </div>
            <div className="mt-4 rounded-xl bg-[var(--brand-soft)] p-3 text-xs font-semibold text-[var(--brand-deep)]">
              Free remains available after launch. Optional Premium costs KES 500/month; verification is KES 100 once.
            </div>
          </div>
        </section>

        {/* COMPARISON: CUSTOM AGENCY BUILD VS AFYVIA */}
        <section className="liquid-glass care-glass mt-8 sm:mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] backdrop-blur-xl p-4 sm:p-6 shadow-sm" aria-label="Comparison with custom build">
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">The Smart Choice</span>
            <h3 className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-[var(--foreground)]">
              Custom Agency Website vs Afyvia Platform
            </h3>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted)]">
              Why Kenyan community pharmacists choose Afyvia over hiring freelance web developers.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] text-[var(--muted)]">
                  <th className="py-2.5 px-3 font-bold">Requirement</th>
                  <th className="py-2.5 px-3 font-bold text-rose-700 dark:text-rose-300">Hiring an Agency</th>
                  <th className="py-2.5 px-3 font-bold text-[var(--brand)]">Afyvia Pharmacy Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] text-[var(--foreground)]">
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Upfront development cost</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">KES 60,000 – KES 120,000</td>
                  <td className="py-2.5 px-3 font-bold text-[var(--brand)]">KES 100 (one-time check)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Monthly upkeep &amp; hosting</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">KES 3,000 – KES 8,000 / mo</td>
                  <td className="py-2.5 px-3 font-bold text-[var(--brand)]">Free to launch · Premium KES 500 / mo</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Time to launch</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">2 to 4 months of meetings</td>
                  <td className="py-2.5 px-3 font-bold text-[var(--brand)]">Live in 10 minutes</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">M-PESA Daraja setup</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">Extra KES 25,000 developer fee</td>
                  <td className="py-2.5 px-3 font-bold text-[var(--brand)]">Pre-built, direct to your Till</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">WhatsApp refill reminders</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">Expensive custom build</td>
                  <td className="py-2.5 px-3 font-bold text-[var(--brand)]">Included out of the box</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold">Verification badge</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">None (generic website)</td>
                  <td className="py-2.5 px-3 font-bold text-[var(--brand)]">Admin-reviewed trust badge</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* LAUNCH PATHWAY */}
        <section className="mt-8 sm:mt-10" aria-label="Your path to launch">
          <div className="mb-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">Simple 4-Step Process</span>
            <h3 className="mt-0.5 font-serif text-xl sm:text-2xl font-semibold text-[var(--foreground)]">
              From join to your first online patient
            </h3>
          </div>
          <div className={styles.launchPath}>
            {[
              ["Create account", "Name your pharmacy and pick your link. Stays private until you launch."],
              ["Share verification details", "Add the PPB, licensing, pharmacist and business details you already have. Missing documents can be reviewed by the admin later."],
              ["Confirm with KES 100", "Quick STK test links your M-PESA Till or Paybill."],
              ["Set up & launch", "After admin approval, pick your stocked medicines, set your hours, and welcome patients."],
            ].map(([title, desc], i) => (
              <div key={title} className="liquid-glass care-glass flex flex-col p-3.5 sm:p-4 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] backdrop-blur-xl shadow-sm">
                <span className="text-xs font-mono font-bold text-[var(--brand)]">{String(i + 1).padStart(2, "0")}</span>
                <strong className="mt-1 text-sm font-semibold text-[var(--foreground)]">{title}</strong>
                <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">{desc}</p>
                <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-[var(--brand)]">
                  {i < 3 ? (
                    <>Next step <ArrowRight size={12} aria-hidden /></>
                  ) : (
                    <>Live storefront <Check size={12} aria-hidden /></>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CLOSING BANNER */}
        <div className={`liquid-glass care-glass ${styles.closing} mt-8 sm:mt-10 rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_55%,var(--card-elev))] bg-[var(--care-glass)] backdrop-blur-xl p-6 sm:p-7 shadow-sm`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)]">Zero Risk. Immediate Impact.</span>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-[var(--foreground)]">
              Ready to open your digital front door?
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted)]">
              Start with your pharmacy name. Build at your own pace. KES 0 monthly until you choose to launch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/onboard" className="btn-primary !px-5 !py-2.5 text-sm sm:text-base">
              Get started now <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/for-pharmacies/walkthrough" className="btn-ghost !px-4 !py-2.5 text-xs sm:text-sm">
              See detailed walkthrough
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
