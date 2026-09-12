import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  HeartPulse,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react";
import StorefrontPreview from "@/app/components/onboard/StorefrontPreview";

export const metadata = {
  title: "For pharmacies",
  description: "Be found nearby, keep refill patients, and run requests in one place — from KES 500 a month after you go live.",
};

const actions: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Search, title: "Found nearby", detail: "A real storefront — not a pin on a map." },
  { icon: Workflow, title: "One workspace", detail: "Requests arrive in order, not WhatsApp." },
  { icon: HeartPulse, title: "Patients stay", detail: "Refills that remember them." },
  { icon: ShieldCheck, title: "Trusted first", detail: "Verified before anyone can see you." },
];

const verifySteps: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Users, title: "Create", detail: "Your pharmacy" },
  { icon: ShieldCheck, title: "Verify", detail: "Your licence" },
  { icon: BadgeCheck, title: "Launch", detail: "When you’re ready" },
];

function FloatingCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "teal" | "gold";
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)] px-3.5 py-3 shadow-[0_18px_46px_color-mix(in_srgb,var(--foreground)_12%,transparent)] backdrop-blur-2xl">
      <span
        className={
          tone === "teal"
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/15 text-[var(--brand)]"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/20 text-[var(--accent-deep)]"
        }
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
        <span className="mt-1 block text-xs font-extrabold text-[var(--foreground)]">{value}</span>
      </span>
    </div>
  );
}

export default function ForPharmaciesPage() {
  return (
    <main className="overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-32 lg:px-8 lg:pb-24">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at 78% 14%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 26rem), radial-gradient(circle at 7% 20%, color-mix(in srgb, #2dd4bf 11%, transparent), transparent 22rem)",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_25%,var(--line-2))] bg-[color-mix(in_srgb,var(--brand-soft)_70%,transparent)] px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Aether for pharmacies
            </div>

            <h1
              className="mt-6 max-w-xl text-[clamp(3.2rem,7vw,6.5rem)] font-semibold leading-[0.9] tracking-[-0.07em] text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Be the pharmacy
              <span className="block text-[var(--brand)]">they find — and stay with.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-[var(--muted)] sm:text-lg">
              A storefront patients can use. Requests your team can run. Follow-up that keeps them yours.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboard"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_40px_color-mix(in_srgb,var(--brand)_28%,transparent)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-deep)]"
              >
                List your pharmacy
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                href="#pricing"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_68%,transparent)] px-5 py-3 text-sm font-bold text-[var(--foreground)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
              >
                See what KES 500 includes
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--brand)]" aria-hidden />
              Verified before anyone can see you
            </div>
          </div>

          <div className="relative min-w-0 lg:py-8">
            <StorefrontPreview />
            <div className="mt-3 grid gap-3 sm:absolute sm:-bottom-4 sm:-left-7 sm:mt-0 sm:max-w-[14rem]">
              <FloatingCard icon={ShieldCheck} label="Trust first" value="Verified before visible" tone="teal" />
            </div>
            <div className="mt-3 grid gap-3 sm:absolute sm:-right-6 sm:top-2 sm:mt-0 sm:max-w-[14rem]">
              <FloatingCard icon={WalletCards} label="After launch" value="KES 17 a day" tone="gold" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-[var(--foreground)] sm:justify-between">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">Patients get</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> A pharmacy they can find</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Refills without the queue</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> A team that remembers them</span>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand)]">Why join</p>
              <h2
                className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Convenience is how chains win. Keep the relationship.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">You already have the trust. This is the front door and the memory.</p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map(({ icon: Icon, title, detail }) => (
              <article
                key={title}
                className="group rounded-[1.5rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_76%,transparent)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--brand)_35%,var(--line-2))] hover:shadow-[0_18px_50px_color-mix(in_srgb,var(--foreground)_7%,transparent)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] transition group-hover:scale-105">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-7 text-lg font-bold tracking-[-0.025em] text-[var(--foreground)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8" id="pricing">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#073b32] p-7 text-white shadow-[0_26px_80px_rgba(7,59,50,0.2)] sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-100 ring-1 ring-amber-200/15">
                  <WalletCards className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-100/70">After you launch</p>
              </div>
              <p className="mt-9 flex items-end gap-2 text-6xl font-extrabold leading-none tracking-[-0.08em]">
                <span className="mb-1 text-base tracking-normal text-teal-100">KES</span>500
              </p>
              <p className="mt-3 text-lg font-bold text-white">per month · about KES 17 a day</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-teal-50/70">
                Storefront, catalogue, requests, follow-up. Nothing monthly until you’re live.
              </p>
              <div className="mt-9 space-y-3 border-t border-white/15 pt-5 text-sm text-teal-50/80">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-200" aria-hidden /> KES 100 once to verify</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-200" aria-hidden /> Patients never see an unverified listing</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_78%,transparent)] p-5 shadow-[0_20px_60px_color-mix(in_srgb,var(--foreground)_6%,transparent)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">Three moves</p>
                <h2
                  className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Create. Verify. Launch.
                </h2>
              </div>
              <Link href="/for-pharmacies/walkthrough" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--brand)] hover:underline">
                See it work <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {verifySteps.map(({ icon: Icon, title, detail }, index) => (
                <div key={title} className="relative rounded-[1.35rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-5 text-base font-bold text-[var(--foreground)]">{title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
                  {index < verifySteps.length - 1 ? (
                    <ArrowRight className="absolute -right-3 top-8 z-10 hidden h-5 w-5 rounded-full bg-[var(--card)] text-[var(--muted)] sm:block" aria-hidden />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0d6e5a] via-[#084c3f] to-[#062d27] p-7 text-white shadow-[0_30px_90px_rgba(8,76,63,0.24)] sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-20 -top-36 h-96 w-96 rounded-full border-[48px] border-white/5" aria-hidden />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-teal-300/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-100/75">Ready when you are</p>
              <h2
                className="mt-4 max-w-2xl text-4xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Let your pharmacy show up.
              </h2>
            </div>
            <Link
              href="/onboard"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#084c3f] shadow-xl transition hover:-translate-y-0.5 hover:bg-teal-50"
            >
              List your pharmacy
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
