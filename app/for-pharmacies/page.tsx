import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
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
  Workflow,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "For pharmacies",
  description:
    "Give your independent pharmacy a trusted digital front door, structured patient requests and an operating workspace built for Kenya.",
};

const outcomes = [
  {
    icon: Store,
    title: "A storefront people can trust",
    text: "Your name, your hours, your location and the services you actually offer.",
  },
  {
    icon: Package,
    title: "A catalogue that works harder",
    text: "Show stocked medicines and prices clearly, without rebuilding your product list elsewhere.",
  },
  {
    icon: Workflow,
    title: "Requests with less back-and-forth",
    text: "Turn scattered chats into structured orders, refill requests and follow-ups.",
  },
  {
    icon: BarChart3,
    title: "A clearer view of the business",
    text: "See activity, revenue signals and patient conversations in one workspace.",
  },
];

const beforeAfter = [
  {
    icon: MessageCircle,
    label: "Before",
    title: "“Do you have this?”",
    text: "The same stock question arrives through different channels, with no useful trail.",
  },
  {
    icon: Zap,
    label: "With Aether",
    title: "A request you can act on",
    text: "Patients find your catalogue, send a clear request and stay connected to your pharmacy.",
  },
  {
    icon: HeartPulse,
    label: "The result",
    title: "More continuity of care",
    text: "Refills, services and conversations have a home beyond the counter.",
  },
];

const verificationSteps = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Create your pharmacy",
    text: "Reserve your pharmacy identity and create the owner account. Your draft stays private.",
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Build the KYP dossier",
    text: "Add premises, responsible professional, licence, business and authority evidence.",
  },
  {
    number: "03",
    icon: Users,
    title: "Review the real details",
    text: "Confirm the premises, map pin, county and public contact channels before submission.",
  },
  {
    number: "04",
    icon: BadgeCheck,
    title: "Get reviewed, then launch",
    text: "Independent review comes first. Setup, activation and publishing unlock after approval.",
  },
];

const included = [
  "Branded pharmacy storefront",
  "Medicine catalogue and stock controls",
  "Patient orders, refills and enquiries",
  "Services, vaccinations and counselling",
  "Staff roles for your pharmacy",
  "Patient conversations and follow-ups",
];

function GlassIcon({
  icon: Icon,
  tone = "teal",
}: {
  icon: typeof Store;
  tone?: "teal" | "gold" | "white";
}) {
  const toneClasses = {
    teal: "bg-teal-400/15 text-teal-100 ring-teal-200/15",
    gold: "bg-amber-300/15 text-amber-100 ring-amber-200/15",
    white: "bg-white/10 text-white ring-white/15",
  };

  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${toneClasses[tone]}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </span>
  );
}

export default function ForPharmaciesPage() {
  return (
    <main className="overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative px-4 pb-8 pt-24 sm:px-6 sm:pb-12 sm:pt-32 lg:px-8 lg:pb-16">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at 78% 14%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 26rem), radial-gradient(circle at 7% 20%, color-mix(in srgb, #2dd4bf 11%, transparent), transparent 22rem)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_25%,var(--line-2))] bg-[color-mix(in_srgb,var(--brand-soft)_70%,transparent)] px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--brand)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              For independent pharmacies
            </div>

            <h1
              className="mt-6 max-w-2xl text-[clamp(2.8rem,6vw,5.7rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Make your pharmacy
              <span className="block text-[var(--brand)]">impossible to miss.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
              Aether gives your pharmacy a trusted digital front door, a clearer way to receive patient requests and an operating workspace that keeps your own brand at the centre.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/onboard"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_40px_color-mix(in_srgb,var(--brand)_28%,transparent)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-deep)]"
              >
                Start your KYP application
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
              <Link
                href="#economics"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_68%,transparent)] px-5 py-3 text-sm font-bold text-[var(--foreground)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
              >
                See the numbers
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-[var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_color-mix(in_srgb,#34d399_14%,transparent)]" />
                Drafts stay private
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--brand)]" aria-hidden />
                Verification before publishing
              </span>
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
              <div
                className="pointer-events-none absolute inset-0 opacity-80"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.12), transparent 28%, transparent 65%, rgba(45,212,191,0.12))",
                }}
              />

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
                          Verified pharmacy · Open today
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold text-teal-50">
                      Eldoret
                    </span>
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 text-[11px] font-semibold text-white/70">
                    <Package className="h-4 w-4 shrink-0" aria-hidden />
                    Search medicines, services and refills
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {[
                    ["Catalogue", Package],
                    ["Refills", Clock3],
                    ["Services", Stethoscope],
                    ["Messages", MessageCircle],
                  ] as const).map(([label, Icon]) => (
                    <div
                      key={label as string}
                      className="flex min-h-16 items-center gap-2.5 rounded-2xl border border-black/10 bg-white px-3 py-2.5 shadow-sm"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-xs font-extrabold text-[#1d3028]">{label as string}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7b8c84]">Today in your workspace</p>
                      <p className="mt-1 text-sm font-extrabold text-[#153027]">The counter has a second shift.</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbf4dd] text-[#a08418]">
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5 border-t border-black/8 pt-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e6f4ef] text-[#0d6e5a]">
                      <Zap className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#1d3028]">New medicine request</p>
                      <p className="text-[10px] text-[#7b8c84]">Arrived 2 minutes ago · Ready to review</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-[#7b8c84]" aria-hidden />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:absolute sm:-bottom-5 sm:-left-7 sm:mt-0 sm:max-w-[14rem]">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_78%,transparent)] px-3.5 py-3 shadow-[0_18px_46px_color-mix(in_srgb,var(--foreground)_12%,transparent)] backdrop-blur-2xl">
                <GlassIcon icon={ShieldCheck} tone="teal" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Trust first</p>
                  <p className="mt-1 text-xs font-extrabold text-[var(--foreground)]">Verified before visible</p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:absolute sm:-right-6 sm:top-2 sm:mt-0 sm:max-w-[14rem]">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_78%,transparent)] px-3.5 py-3 shadow-[0_18px_46px_color-mix(in_srgb,var(--foreground)_12%,transparent)] backdrop-blur-2xl">
                <GlassIcon icon={WalletCards} tone="gold" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Simple start</p>
                  <p className="mt-1 text-xs font-extrabold text-[var(--foreground)]">KES 17/day after launch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
            Built for the pharmacy you already run
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[var(--foreground)]">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Keep your brand</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Keep your patients</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[var(--brand)]" aria-hidden /> Keep control</span>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand)]">The shift</p>
            <h2
              className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Your counter is busy. Your digital front door should not be.
            </h2>
            <p className="mt-5 text-base leading-7 text-[var(--muted)]">
              The platform turns the everyday moments around your pharmacy into a calmer, more useful flow for both your team and your patients.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {beforeAfter.map(({ icon: Icon, label, title, text }, index) => (
              <article
                key={title}
                className="group relative overflow-hidden rounded-[1.65rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_76%,transparent)] p-6 shadow-[0_16px_50px_color-mix(in_srgb,var(--foreground)_5%,transparent)] transition duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--brand)_35%,var(--line-2))]"
              >
                <div
                  className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-70 blur-2xl transition duration-500 group-hover:scale-125"
                  aria-hidden
                  style={{
                    background:
                      index === 1
                        ? "color-mix(in srgb, var(--brand) 20%, transparent)"
                        : "color-mix(in srgb, var(--accent) 12%, transparent)",
                  }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-bold tracking-[-0.025em] text-[var(--foreground)]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8" id="economics">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#073b32] p-7 text-white shadow-[0_26px_80px_rgba(7,59,50,0.2)] sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-300/15 blur-3xl" aria-hidden />
            <div className="relative">
              <div className="flex items-center gap-3">
                <GlassIcon icon={WalletCards} tone="gold" />
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-100/70">Simple economics</p>
              </div>
              <h2
                className="mt-8 max-w-md text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-5xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Start small. Make the value visible.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-teal-50/75 sm:text-base sm:leading-7">
                There is no monthly surprise before your pharmacy is verified and ready to activate.
              </p>
              <div className="mt-10 border-t border-white/15 pt-5 text-sm text-teal-50/70">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-200" aria-hidden /> No payment is a guarantee of approval.</p>
                <p className="mt-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-200" aria-hidden /> Promotional waivers appear in billing when allocated.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_78%,transparent)] p-5 shadow-[0_20px_60px_color-mix(in_srgb,var(--foreground)_6%,transparent)] sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color-mix(in_srgb,var(--brand)_22%,var(--line-2))] bg-[color-mix(in_srgb,var(--brand-soft)_48%,transparent)] p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--brand)]">Step one</p>
                <p className="mt-6 flex items-end gap-2 text-[clamp(2.7rem,6vw,4rem)] font-extrabold leading-none tracking-[-0.07em] text-[var(--foreground)]">
                  <span className="text-base tracking-normal text-[var(--brand)]">KES</span>100
                </p>
                <p className="mt-3 text-sm font-bold text-[var(--foreground)]">Know Your Pharmacy review</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">One-time review fee. Your evidence is checked before the pharmacy can publish.</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color-mix(in_srgb,var(--accent)_30%,var(--line-2))] bg-[color-mix(in_srgb,var(--accent-soft)_52%,transparent)] p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--accent-deep)]">Step two</p>
                <p className="mt-6 flex items-end gap-2 text-[clamp(2.7rem,6vw,4rem)] font-extrabold leading-none tracking-[-0.07em] text-[var(--foreground)]">
                  <span className="text-base tracking-normal text-[var(--accent-deep)]">KES</span>500
                </p>
                <p className="mt-3 text-sm font-bold text-[var(--foreground)]">Platform service / month</p>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Starts after verification, setup and activation — roughly KES 17 per day.</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">Included in the service</p>
                  <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-[var(--foreground)]">The essentials for a pharmacy that wants to be found and followed up.</p>
                </div>
                <Link href="/for-pharmacies/walkthrough" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-[var(--brand)] hover:underline">
                  See the journey <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm leading-5 text-[var(--muted)]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] px-4 py-20 sm:px-6 sm:py-28 lg:px-8" id="verification">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--brand)]">Trust is part of the product</p>
              <h2
                className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                A verified network starts with the real pharmacy.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
              Your draft is private while you prepare. Publishing stays locked until the mandatory evidence and review steps are complete.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-4">
            {verificationSteps.map(({ number, icon: Icon, title, text }, index) => (
              <article key={number} className="relative rounded-[1.5rem] border border-[var(--line-2)] bg-[color-mix(in_srgb,var(--card)_72%,transparent)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold tracking-[0.16em] text-[var(--brand)]">{number}</span>
                  <Icon className="h-5 w-5 text-[var(--brand)]" aria-hidden />
                </div>
                <h3 className="mt-8 text-lg font-bold tracking-[-0.02em] text-[var(--foreground)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p>
                {index < verificationSteps.length - 1 ? (
                  <ArrowRight className="absolute -right-3 top-8 z-10 hidden h-5 w-5 rounded-full bg-[var(--surface)] text-[var(--muted)] md:block" aria-hidden />
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0d6e5a] via-[#084c3f] to-[#062d27] p-7 text-white shadow-[0_30px_90px_rgba(8,76,63,0.24)] sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-20 -top-36 h-96 w-96 rounded-full border-[48px] border-white/5" aria-hidden />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-teal-300/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-100/75">Your next patient should find you</p>
              <h2
                className="mt-4 text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Put your pharmacy on the map — properly.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-6 text-teal-50/80 sm:text-base sm:leading-7">
                Start with the real details. Build trust before visibility. Then give your team a workspace that makes every request easier to follow.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/onboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#084c3f] shadow-xl transition hover:-translate-y-0.5 hover:bg-teal-50"
              >
                Start onboarding
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/login?next=/onboard"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
