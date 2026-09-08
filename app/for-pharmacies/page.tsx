import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Shield, Sparkles } from "lucide-react";

export const metadata = {
  title: "For pharmacies",
  description: "Bring your independent pharmacy onto the Aether network — branded storefront, CRM, and verified listing.",
};

const STEPS = [
  {
    n: "01",
    title: "Tell us about the pharmacy",
    body: "Legal name, trading name, PPB premises number, and a public slug. Save a draft any time — nothing goes live until you submit.",
  },
  {
    n: "02",
    title: "Network review",
    body: "Aether super-admins check licence details, location, and duplicates. We may ask for a clearer document or a phone confirmation.",
  },
  {
    n: "03",
    title: "Set up & go live",
    body: "Hours, delivery, branding, first staff invite, and optional M-Pesa. When you are ready, list the storefront in the marketplace.",
  },
];

const KEEP = [
  "Your own brand, hours, and WhatsApp line",
  "Your own inventory, prices, and M-Pesa shortcode",
  "Staff roles scoped only to your pharmacy",
  "Shared clinical library (MedicationMaster) — no duplicate drug typing",
  "Patients can keep one Aether account across pharmacies",
];

const pageShell =
  "overflow-x-hidden bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300";

const adaptiveCard =
  "min-w-0 rounded-[1.35rem] border border-[var(--line-2)] bg-[var(--card)] shadow-sm transition-colors duration-300 sm:rounded-3xl";

export default function ForPharmaciesPage() {
  return (
    <div className={pageShell}>
      <section className="relative overflow-hidden px-3 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-32 lg:pb-16 lg:pt-36">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 80% 0%, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 58%), radial-gradient(ellipse 60% 50% at 10% 40%, color-mix(in srgb, var(--brand) 12%, transparent) 0%, transparent 62%)",
          }}
        />

        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-3xl min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
              For pharmacy owners
            </p>
            <h1
              className="mt-2.5 max-w-3xl break-words text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--foreground)] sm:mt-3 sm:text-5xl sm:leading-tight lg:text-6xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Your pharmacy. Our rails.
            </h1>
            <p className="mt-4 max-w-2xl text-[13.5px] leading-6 text-[var(--muted)] sm:text-base sm:leading-relaxed lg:text-lg">
              Aether is a multi-tenant network, not a single shop. You keep the licence, the
              counter, and the relationship — we give you a verified storefront, CRM, and
              a patient portal that already knows how refills work in Kenya.
            </p>

            <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:mt-8 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
              <Link href="/onboard" className="btn-primary w-full justify-center sm:w-auto">
                Start pharmacy onboarding
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
              <Link href="/login?next=/onboard" className="btn-ghost w-full justify-center sm:w-auto">
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-3 pb-10 sm:px-6 sm:pb-16">
        <div className="mx-auto grid max-w-5xl gap-3 sm:gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.n} className={`${adaptiveCard} p-5 sm:p-6`}>
              <p className="text-[10px] font-bold tracking-[0.18em] text-[var(--accent)] sm:text-xs sm:tracking-[0.2em]">
                {step.n}
              </p>
              <h2 className="mt-2 break-words text-[15px] font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
                {step.title}
              </h2>
              <p className="mt-2 break-words text-[12.5px] leading-5 text-[var(--muted)] sm:text-sm sm:leading-relaxed">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--surface)] px-3 py-10 transition-colors duration-300 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 sm:gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10">
          <div className="min-w-0 px-1 sm:px-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-xs sm:tracking-[0.2em]">
              Ownership stays local
            </p>
            <h2
              className="mt-2 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              What stays yours
            </h2>
            <ul className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
              {KEEP.map((item) => (
                <li key={item} className="flex min-w-0 items-start gap-2.5 text-[12.5px] leading-5 text-[var(--muted)] sm:gap-3 sm:text-sm sm:leading-relaxed">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
                  </span>
                  <span className="min-w-0 break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="min-w-0 rounded-[1.35rem] border border-[var(--line-2)] bg-[var(--brand-deep)] p-5 text-white shadow-md sm:rounded-3xl sm:p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 sm:h-11 sm:w-11">
              <Shield className="h-5 w-5 text-teal-100 sm:h-6 sm:w-6" aria-hidden />
            </span>
            <p
              className="mt-4 text-[1.05rem] font-semibold leading-snug sm:text-lg"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Verification is the gate
            </p>
            <p className="mt-2 text-[12.5px] leading-5 text-white/80 sm:text-sm sm:leading-relaxed">
              Draft applications are invisible to patients. Super-admins review licence
              documents, flag duplicates, and only then can you go live. Suspended
              pharmacies drop off the marketplace immediately.
            </p>

            <div className="mt-5 grid gap-2.5 sm:mt-6">
              <div className="flex min-w-0 items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-100 sm:text-xs sm:tracking-wide">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">Typical review: 1–2 business days</span>
              </div>
              <div className="flex min-w-0 items-start gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200 sm:text-xs sm:tracking-wide">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">Setup wizard after approval</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
