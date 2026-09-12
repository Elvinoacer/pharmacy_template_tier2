import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  HeartPulse,
  LayoutDashboard,
  MessageCircle,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  Stethoscope,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "For pharmacies",
  description:
    "Give your pharmacy a beautiful digital storefront and a simpler way to receive patient requests.",
};

const actions: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Store, title: "Get discovered", detail: "Your pharmacy, visible." },
  { icon: Package, title: "Show what you have", detail: "Medicines, services, hours." },
  { icon: Zap, title: "Receive requests", detail: "One organised workspace." },
  { icon: HeartPulse, title: "Keep the relationship", detail: "Refills and follow-ups." },
];

const verifySteps: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Users, title: "Create", detail: "Your pharmacy profile" },
  { icon: ShieldCheck, title: "Verify", detail: "Your real details" },
  { icon: BadgeCheck, title: "Launch", detail: "After approval" },
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
              Your pharmacy.
              <span className="block text-[var(--brand)]">Online, properly.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-[var(--muted)] sm:text-lg">
              A beautiful digital front door for medicines, refills, services and patient requests.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboard"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_40px_color-mix(in_srgb,var(--brand)_28%,transparent)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-deep)]"
              >
                Start onboarding
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_68%,transparent)] px-5 py-3 text-sm font-bold text-[var(--foreground)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
              >
                See how it works
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
              <CheckCircle2 className="h-4 w-4 text-[var(--brand)]" aria-hidden />
              Verified pharmacies only
            </div>
          </div>

          <div className="relative min-w-0 lg:py-8">
            <div
              className="absolute -inset-8 -z-10 rounded-[4rem] opacity-70 blur-3xl"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--brand) 24%, transparent) 0%, transparent 68%)",
              }}
            />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#071d19] p-2 shadow-[0_34px_100px_rgba(6,42,35,0.24)] sm:rounded-[2.5rem] sm:p-3">
              <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), transparent 30%, transparent 65%, rgba(45,212,191,0.12))" }} />

              <div className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#f5faf8] p-3 text-[#0c1a14] sm:rounded-[2rem] sm:p-4">
                <div className="flex items-center gap-2 border-b border-black/10 px-1 pb-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff6b5b]" />
                  <span className="h-2 w-2 rounded-full bg-[#f4bd4f]" />
                  <span className="h-2 w-2 rounded-full bg-[#51c45b]" />
                  <div className="ml-2 min-w-0 flex-1 truncate rounded-full bg-black/[0.055] px-3 py-1.5 text-[10px] font-semibold text-[#5a6b62]">
                    aether.health/p/your-pharmacy
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#7b8c84]" aria-hidden />
                </div>

                <div className="mt-3 rounded-[1.35rem] bg-gradient-to-br from-[#0d6e5a] via-[#0b5c4d] to-[#073b32] p-4 text-white shadow-lg sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
                        <Store className="h-5 w-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold sm:text-base">Your Pharmacy</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-teal-100/80">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                          Verified · Open today
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-teal-50">
                      Eldoret
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 text-[11px] font-semibold text-white/70">
                    <Package className="h-4 w-4 shrink-0" aria-hidden />
                    Search medicines and services
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="flex min-h-16 items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-3 py-2.5 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                      <Package className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-xs font-extrabold text-[#1d3028]">Catalogue</span>
                  </div>
                  <div className="flex min-h-16 items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-3 py-2.5 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                      <Clock3 className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-xs font-extrabold text-[#1d3028]">Refills</span>
                  </div>
                  <div className="flex min-h-16 items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-3 py-2.5 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                      <Stethoscope className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-xs font-extrabold text-[#1d3028]">Services</span>
                  </div>
                  <div className="flex min-h-16 items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-3 py-2.5 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                      <MessageCircle className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-xs font-extrabold text-[#1d3028]">Messages</span>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fbf4dd] text-[#a08418]">
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7b8c84]">Workspace</p>
                      <p className="mt-1 text-sm font-extrabold text-[#153027]">1 new request to review</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#7b8c84]" aria-hidden />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:absolute sm:-bottom-5 sm:-left-7 sm:mt-0 sm:max-w-[14rem]">
              <FloatingCard icon={ShieldCheck} label="Trust first" value="Verified before visible" tone="teal" />
            </div>
            <div className="mt-3 grid gap-3 sm:absolute sm:-right-6 sm:top-2 sm:mt-0 sm:max-w-[14rem]">
              <FloatingCard icon={WalletCards} label="Simple start" value="KES 17/day after launch" tone="gold" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-[var(--foreground)] sm:justify-between">
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">One place to</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Be found</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Show stock</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Receive requests</span>
          <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Follow up</span>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand)]">What patients see</p>
              <h2
                className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Your pharmacy, beyond the counter.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-[var(--muted)]">Less chasing. More useful action.</p>
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

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8" id="how-it-works">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#073b32] p-7 text-white shadow-[0_26px_80px_rgba(7,59,50,0.2)] sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-100 ring-1 ring-amber-200/15">
                  <WalletCards className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-100/70">Simple pricing</p>
              </div>
              <p className="mt-9 flex items-end gap-2 text-6xl font-extrabold leading-none tracking-[-0.08em]">
                <span className="mb-1 text-base tracking-normal text-teal-100">KES</span>500
              </p>
              <p className="mt-3 text-lg font-bold text-white">per month</p>
              <p className="mt-2 max-w-xs text-sm leading-6 text-teal-50/70">Only after verification and activation.</p>
              <div className="mt-9 border-t border-white/15 pt-5 text-sm text-teal-50/80">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-200" aria-hidden /> KES 100 one-time review</p>
                <p className="mt-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-200" aria-hidden /> No monthly charge before launch</p>
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
                  From application to launch.
                </h2>
              </div>
              <Link href="/for-pharmacies/walkthrough" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--brand)] hover:underline">
                Full walkthrough <ArrowRight className="h-4 w-4" aria-hidden />
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
              Start onboarding
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
