import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  HeartPulse,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Pill,
  Syringe,
  Truck,
  BadgeCheck,
  Leaf,
  Clock,
} from "lucide-react";
import { listMarketplacePharmacies } from "@/app/lib/tenant";
import { platform } from "@/app/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${platform.name} — ${platform.tagline}`,
  description: platform.description,
};

const TRUST = [
  { label: "PPB licence review", icon: BadgeCheck },
  { label: "One patient account", icon: Users },
  { label: "M-Pesa at the counter", icon: Pill },
  { label: "SHA / NHIF friendly", icon: ShieldCheck },
  { label: "WhatsApp-first care", icon: HeartPulse },
];

const PATIENT_STEPS = [
  {
    n: "01",
    title: "Find a pharmacy you can walk to",
    body: "Search by neighbourhood, city, or name. Every live listing has been licence-reviewed — not a directory scrape.",
  },
  {
    n: "02",
    title: "Keep one account across the network",
    body: "Prescriptions, refills, and loyalty stay with the shop that dispensed them. Your login works everywhere on Aether.",
  },
  {
    n: "03",
    title: "Be known, not processed",
    body: "Counselling, vaccinations, delivery, and a pharmacist who still has time for the person at the counter.",
  },
];

const OWNER_STEPS = [
  {
    n: "01",
    title: "Tell us about the premises",
    body: "Legal name, PPB number, slug, and a draft storefront. Nothing is public until you submit.",
  },
  {
    n: "02",
    title: "Network review",
    body: "Super-admins check the licence, location, and duplicates. Typical turnaround is one to two business days.",
  },
  {
    n: "03",
    title: "Keep your brand. Go live.",
    body: "Your hours, WhatsApp, M-Pesa, staff, and prices. The platform is the rails — not a white-label takeover.",
  },
];

const CARE = [
  {
    icon: Pill,
    title: "Refills that arrive",
    body: "Request online, track status, pick up or take home delivery from the pharmacy you chose.",
  },
  {
    icon: Syringe,
    title: "Vaccines on site",
    body: "Flu, travel, and adult immunisation — booked with the shop that holds the cold chain.",
  },
  {
    icon: Stethoscope,
    title: "A pharmacist, not a chatbot",
    body: "AI can help you start. A licensed professional finishes the conversation that matters.",
  },
  {
    icon: Truck,
    title: "Care that travels",
    body: "Same-day delivery from neighbourhood pharmacies who already know the streets.",
  },
];

function statusChip(p: { featured: boolean }) {
  return p.featured ? "Featured partner" : "Verified pharmacy";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const city = (sp.city || "").trim();
  const pharmacies = await listMarketplacePharmacies({ q: q || undefined, city: city || undefined });
  const cities = Array.from(new Set(pharmacies.map((p) => p.city).filter(Boolean))) as string[];

  return (
    <div className="landing-root">
      {/* ───────── HERO ───────── */}
      <section className="landing-hero relative overflow-hidden text-[#f3f7f4]">
        <div className="landing-hero-wash" aria-hidden />
        <div className="landing-grain" aria-hidden />
        <div className="pointer-events-none absolute -left-24 top-10 h-[28rem] w-[28rem] rounded-full bg-[#0d6e5a]/25 blur-[90px]" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#c9a227]/10 blur-[100px]" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-32 sm:px-6 sm:pb-24 sm:pt-36 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100/90 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/80 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              Kenya · licensed neighbourhood care
            </p>

            <h1
              className="mt-6 max-w-xl text-[2.6rem] font-medium leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.35rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Care that meets you
              <br />
              <em className="font-medium not-italic text-teal-200/95">where you live.</em>
            </h1>

            <p
              className="mt-5 max-w-lg text-lg leading-snug text-teal-50/80 sm:text-xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {platform.promise}
            </p>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-teal-100/70">
              {platform.description} This is the first impression we keep: life, first. Caring, always.
            </p>

            <form
              action="/"
              className="mt-8 flex max-w-xl flex-col gap-2.5 sm:flex-row sm:items-stretch"
            >
              <label className="relative flex-1">
                <span className="sr-only">Search pharmacies</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-200/60" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Pharmacy, city, or county"
                  className="h-[52px] w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 pl-11 pr-4 text-sm text-white outline-none ring-0 placeholder:text-teal-100/45 backdrop-blur focus:border-teal-200/40 focus:bg-white/14"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-semibold text-[#084c3f] transition hover:bg-teal-50"
              >
                Find care
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Create a patient account
              </Link>
              <Link
                href="/for-pharmacies"
                className="inline-flex items-center gap-2 text-sm font-semibold text-teal-100/80 hover:text-white"
              >
                Join as a pharmacy
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="grid grid-cols-12 gap-3">
              <div className="relative col-span-7 row-span-2 overflow-hidden rounded-[1.75rem] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/gallery/welcoming_retail_floor.webp"
                    alt="A welcoming neighbourhood pharmacy floor"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 60vw, 280px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#041510] via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-100/80">
                      Independent · Kenya
                    </p>
                    <p
                      className="mt-1 text-lg font-medium text-white"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      A pharmacist close to home
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative col-span-5 overflow-hidden rounded-[1.35rem]">
                <div className="relative aspect-square">
                  <Image
                    src="/images/services/medication-counselling.webp"
                    alt="Pharmacist counselling a patient"
                    fill
                    className="object-cover"
                    sizes="180px"
                  />
                </div>
              </div>
              <div className="col-span-5 rounded-[1.35rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
                <Leaf className="h-5 w-5 text-teal-200" />
                <p
                  className="mt-3 text-sm font-medium leading-snug text-white"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  Life, held with care.
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-teal-100/70">
                  Every live pharmacy on Aether is reviewed before a patient can find it.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 sm:px-6">
            {TRUST.map((t) => (
              <p key={t.label} className="inline-flex items-center gap-2 text-[12px] font-medium text-teal-100/75">
                <t.icon className="h-3.5 w-3.5 text-teal-200/80" />
                {t.label}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── TWO AUDIENCES ───────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">Two doors. One network.</p>
          <h2
            className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Built for the person seeking medicine — and the pharmacy that still belongs to its street.
          </h2>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <article className="relative overflow-hidden rounded-[1.85rem] border border-teal-900/8 bg-white p-8 shadow-[0_16px_50px_rgba(8,40,32,0.06)] sm:p-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0d6e5a]/10 text-[#0d6e5a]">
                <HeartPulse className="h-5 w-5" />
              </div>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0d6e5a]">For patients</p>
              <h3
                className="mt-2 text-2xl font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Find care. Keep one record.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5a6b62]">
                Search a verified pharmacy, refill without the queue, ask how you feel, and carry your
                prescriptions from Nairobi to the coast on a single login.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-[#3d4f46]">
                {["Verified PPB premises only", "Refills, vaccines, delivery", "Caregiver access for family"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#0d6e5a]" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <Link href="/register" className="btn-primary mt-8">
                Create a patient account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

            <article className="relative overflow-hidden rounded-[1.85rem] bg-[#061510] p-8 text-[#e7f4ef] shadow-[0_16px_50px_rgba(8,40,32,0.18)] sm:p-10">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-teal-100">
                <Building2 className="h-5 w-5" />
              </div>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-200/80">
                For pharmacy owners
              </p>
              <h3
                className="mt-2 text-2xl font-semibold text-white"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Your licence. Your brand. Our rails.
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-teal-100/75">
                Aether is a network, not a takeover. Keep your M-Pesa, your staff, your hours — and meet
                patients who already have an account.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-teal-50/90">
                {["Draft → review → go live", "CRM, refills, loyalty per shop", "Never mix another pharmacy’s data"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
              <Link
                href="/for-pharmacies"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#084c3f] transition hover:bg-teal-50"
              >
                Bring your pharmacy
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ───────── DIRECTORY ───────── */}
      <section id="pharmacies" className="border-t border-teal-900/5 bg-[#f4f7f4] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">The network</p>
              <h2
                className="mt-2 text-3xl font-semibold tracking-tight text-[#0c1a14] sm:text-4xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Pharmacies on Aether
              </h2>
              <p className="mt-2 text-sm text-[#5a6b62]">
                {pharmacies.length === 0
                  ? "No listed pharmacies match that search yet."
                  : `${pharmacies.length} verified ${pharmacies.length === 1 ? "pharmacy" : "pharmacies"} accepting patients.`}
              </p>
            </div>
            {cities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    !city ? "border-teal-800/20 bg-teal-50 text-[#084c3f]" : "border-teal-900/10 bg-white text-[#5a6b62]"
                  }`}
                >
                  All
                </Link>
                {cities.slice(0, 8).map((c) => (
                  <Link
                    key={c}
                    href={`/?city=${encodeURIComponent(c)}`}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      city === c
                        ? "border-teal-800/20 bg-teal-50 text-[#084c3f]"
                        : "border-teal-900/10 bg-white text-[#5a6b62]"
                    }`}
                  >
                    {c}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {pharmacies.length === 0 ? (
            <div className="rounded-[1.85rem] border border-dashed border-teal-900/15 bg-white px-6 py-16 text-center">
              <Building2 className="mx-auto h-10 w-10 text-teal-800/40" />
              <p className="mt-4 text-sm text-[#5a6b62]">
                The directory fills as pharmacies are verified.{" "}
                <Link href="/for-pharmacies" className="font-semibold text-[#0d6e5a] hover:underline">
                  Apply to join the network
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pharmacies.map((p) => (
                <Link
                  key={p.id}
                  href={`/p/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[1.6rem] border border-teal-900/8 bg-white shadow-[0_10px_40px_rgba(8,40,32,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(8,40,32,0.1)]"
                >
                  <div className="relative h-36 overflow-hidden bg-[#0d6e5a]">
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0d6e5a] to-[#084c3f]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                    <span className="absolute right-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#084c3f]">
                      {statusChip(p)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d6e5a] text-sm font-bold text-teal-50">
                        {p.name.slice(0, 1)}
                      </div>
                      <h3
                        className="text-lg font-semibold text-[#0c1a14] group-hover:text-[#0d6e5a]"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        {p.name}
                      </h3>
                    </div>
                    <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-[#5a6b62]">
                      {p.tagline || p.description || "Neighbourhood pharmacy on the Aether network."}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#084c3f]">
                        <MapPin className="h-3.5 w-3.5" />
                        {[p.city, p.county].filter(Boolean).join(", ") || p.country}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d6e5a]">
                        Visit
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────── HOW CARE WORKS ───────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">For patients</p>
              <h2
                className="mt-2 text-2xl font-semibold text-[#0c1a14] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Three quiet steps to being looked after
              </h2>
              <ol className="mt-8 space-y-6">
                {PATIENT_STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span
                      className="text-sm font-semibold tracking-[0.14em] text-[#c9a227]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-[#0c1a14]">{s.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#5a6b62]">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">For pharmacies</p>
              <h2
                className="mt-2 text-2xl font-semibold text-[#0c1a14] sm:text-3xl"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                From draft to a listed storefront
              </h2>
              <ol className="mt-8 space-y-6">
                {OWNER_STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span
                      className="text-sm font-semibold tracking-[0.14em] text-[#c9a227]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold text-[#0c1a14]">{s.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#5a6b62]">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link href="/onboard" className="btn-ghost mt-8">
                Start pharmacy onboarding
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── CARE PILLARS ───────── */}
      <section className="border-t border-teal-900/5 bg-white px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6e5a]">What care looks like</p>
          <h2
            className="mt-2 max-w-xl text-3xl font-semibold text-[#0c1a14] sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Medicine is logistics. Healing is a person.
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CARE.map((c) => (
              <div key={c.title} className="rounded-[1.4rem] border border-teal-900/8 bg-[#f7faf8] p-5">
                <c.icon className="h-5 w-5 text-[#0d6e5a]" />
                <h3 className="mt-4 font-semibold text-[#0c1a14]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── MANIFESTO ───────── */}
      <section className="relative overflow-hidden bg-[#061510] px-4 py-24 text-[#e7f4ef] sm:px-6 sm:py-28">
        <div className="landing-grain" aria-hidden />
        <div className="relative mx-auto max-w-3xl text-center">
          <Sparkles className="mx-auto h-6 w-6 text-teal-200/80" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.26em] text-teal-200/70">The promise</p>
          <blockquote
            className="mt-6 text-3xl font-medium leading-[1.25] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            “This is the ultimate place we promise life, and caring, as a first impression.”
          </blockquote>
          <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-teal-100/70 sm:text-base">
            Aether is not a marketplace of SKUs. It is a network of licensed people who still look up
            when you walk in. Patients come for medicine. Pharmacies come to be found by the
            neighbourhood they already serve. Both are welcome. Both are the point.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#pharmacies"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#084c3f]"
            >
              Browse pharmacies
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Read our story
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── STATS + CLOSING ───────── */}
      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, k: "Verified first", v: "Every live shop is licence-reviewed before patients can find it." },
            { icon: Clock, k: "Open when you need it", v: "Hours, WhatsApp, and delivery belong to each pharmacy — not a call centre." },
            { icon: Users, k: "One identity", v: "Patients keep one Aether account. Clinical records stay with the shop that earned them." },
          ].map((s) => (
            <div key={s.k} className="rounded-[1.6rem] border border-teal-900/8 bg-white p-7">
              <s.icon className="h-6 w-6 text-[#0d6e5a]" />
              <h3
                className="mt-4 text-xl font-semibold text-[#0c1a14]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                {s.k}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-[2rem] bg-[#0d6e5a] px-8 py-14 text-center text-white sm:px-12">
          <h2
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Come for medicine. Stay for the people who still care.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-teal-50/85">
            Whether you are opening a new pharmacy or looking for tonight’s refill — Aether is the
            door. Life first. Caring always.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="#pharmacies"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#084c3f]"
            >
              Find a pharmacy
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/onboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white"
            >
              List your pharmacy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
