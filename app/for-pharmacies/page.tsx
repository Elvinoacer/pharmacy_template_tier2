import Link from "next/link";
import { CheckCircle2, ClipboardList, Shield, Sparkles, ArrowRight } from "lucide-react";

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

export default function ForPharmaciesPage() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pt-36">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 80% 0%, rgba(201,162,39,0.16) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 10% 40%, rgba(13,110,90,0.12) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0d6e5a]">For pharmacy owners</p>
          <h1
            className="mt-3 text-4xl font-bold leading-tight text-[#0c1a14] sm:text-5xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your pharmacy. Our rails.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#4b5d55] sm:text-lg">
            Aether is a multi-tenant network, not a single shop. You keep the licence, the
            counter, and the relationship — we give you a verified storefront, CRM, and
            a patient portal that already knows how refills work in Kenya.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboard" className="btn-primary">
              Start pharmacy onboarding
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login?next=/onboard" className="btn-ghost">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-teal-900/8 bg-white p-6">
              <p className="text-xs font-bold tracking-[0.2em] text-[#c9a227]">{s.n}</p>
              <h2 className="mt-2 text-lg font-semibold text-[#0c1a14]">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-teal-900/5 bg-white/70 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <h2
              className="text-2xl font-semibold text-[#0c1a14] sm:text-3xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              What stays yours
            </h2>
            <ul className="mt-6 space-y-3">
              {KEEP.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-[#3f514a]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0d6e5a]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-teal-900/10 bg-[#084c3f] p-8 text-[#e7f4ef]">
            <Shield className="h-7 w-7 text-teal-200" />
            <p className="mt-4 text-lg font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
              Verification is the gate
            </p>
            <p className="mt-2 text-sm leading-relaxed text-teal-100/85">
              Draft applications are invisible to patients. Super-admins review licence
              documents, flag duplicates, and only then can you go live. Suspended
              pharmacies drop off the marketplace immediately.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-200">
              <ClipboardList className="h-4 w-4" />
              Typical review: 1–2 business days
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
              <Sparkles className="h-4 w-4" />
              Setup wizard after approval
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
