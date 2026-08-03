import Image from "next/image";
import Link from "next/link";
import CtaBanner from "./components/CtaBanner";
import { PublicTestimonials } from "./components/PublicTestimonials";
import Reveal from "./components/Reveal";
import SectionHeading from "./components/SectionHeading";
import {
  articles,
  gallery,
  pharmacy,
  services,
  testimonials,
  trustIndicators,
} from "./lib/data";

const QUICK_ACTIONS = [
  {
    title: "Request a refill",
    desc: "Submit online in under a minute",
    href: "/refill",
    icon: "↻",
  },
  {
    title: "Delivery enquiry",
    desc: "Check if we deliver to you",
    href: "/delivery",
    icon: "📦",
  },
  {
    title: "Call the pharmacy",
    desc: pharmacy.phone,
    href: pharmacy.phoneHref,
    icon: "☎",
  },
  {
    title: "WhatsApp us",
    desc: "Message the care team",
    href: pharmacy.whatsappHref,
    icon: "💬",
  },
];

export default function HomePage() {
  const featuredServices = services.slice(0, 6);
  const featuredArticles = articles.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <div className="hero-glow -left-20 top-10" />
        <div
          className="hero-glow right-0 top-40 opacity-70"
          style={{
            background: "radial-gradient(circle, rgba(201,162,39,0.22) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#084c3f] shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Open today · {pharmacy.hours[0].time}
            </div>

            <h1
              className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-[#0c1a14] sm:text-5xl lg:text-[3.4rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Care you can{" "}
              <span className="gradient-text">trust</span>
              , right in your neighbourhood
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5a6b62] sm:text-lg">
              {pharmacy.description} Visit us for prescriptions, vaccinations, health checks, and
              friendly pharmacist advice.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/refill" className="btn-primary">
                Request a refill
              </Link>
              <Link href="/contact" className="btn-ghost">
                Contact & directions
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="font-semibold text-[#0c1a14]">{pharmacy.address.full}</p>
                <p className="text-[#5a6b62]">Free parking · Wheelchair accessible</p>
              </div>
              <div>
                <a href={pharmacy.phoneHref} className="font-semibold text-teal-800 hover:underline">
                  {pharmacy.phone}
                </a>
                <p className="text-[#5a6b62]">Call or WhatsApp</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-teal-400/20 via-transparent to-amber-300/20 blur-2xl" />
            <div className="relative grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-7 row-span-2 overflow-hidden rounded-[1.5rem] shadow-2xl shadow-teal-900/20">
                <div className="relative aspect-[3/4] sm:aspect-[4/5]">
                  <Image
                    src="/images/gallery/welcoming_retail_floor.webp"
                    alt="Modern pharmacy interior with organised shelves"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 60vw, 320px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#084c3f]/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-teal-100/80">
                      Austin · TX
                    </p>
                    <p
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {pharmacy.name}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-5 overflow-hidden rounded-[1.25rem] shadow-xl">
                <div className="relative aspect-square">
                  <Image
                    src="/images/services/medication-counselling.webp"
                    alt="Pharmacist preparing medication"
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
              </div>
              <div className="col-span-5 rounded-[1.25rem] border border-white/60 bg-white/90 p-3.5 shadow-xl backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700/70">
                  Today&apos;s hours
                </p>
                <p className="mt-1 text-sm font-semibold text-[#0c1a14]">
                  {pharmacy.hours[0].time}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#5a6b62]">
                  Walk-ins welcome · Vaccines available
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="card-lift flex items-center gap-3 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-lg">
                {a.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#0c1a14]">{a.title}</span>
                <span className="block text-xs text-[#5a6b62]">{a.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust band */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#084c3f] via-[#0d6e5a] to-[#0f766e] px-6 py-12 text-white shadow-2xl shadow-teal-900/25 sm:px-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {trustIndicators.map((s) => (
              <div key={s.label} className="text-center sm:text-left">
                <p
                  className="text-3xl font-semibold tracking-tight sm:text-4xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-teal-100/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured services */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <SectionHeading
                eyebrow="Our services"
                title="Everything you need from a modern community pharmacy"
              />
              <Link href="/services" className="text-sm font-semibold text-teal-800 hover:underline">
                View all services →
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredServices.map((s, i) => (
              <Reveal key={s.slug} delay={i * 60}>
                <Link
                  href={`/services/${s.slug}`}
                  className="card-lift group flex h-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-[0_16px_50px_rgba(8,40,32,0.08)]"
                >
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={s.image}
                      alt={s.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3
                      className="text-lg font-semibold text-[#0c1a14]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {s.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5a6b62]">{s.short}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800">
                      Learn more
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="grid overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_24px_70px_rgba(8,40,32,0.1)] lg:grid-cols-2">
              <div className="relative min-h-[260px] lg:min-h-[400px]">
                <Image
                  src="/images/gallery/modern_care_tools.webp"
                  alt="Pharmacist consulting with a patient"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="flex flex-col justify-center p-8 sm:p-12">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                  Why Aether
                </p>
                <h2
                  className="mt-3 text-2xl font-semibold tracking-tight text-[#0c1a14] sm:text-3xl"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  A pharmacy that still knows your name
                </h2>
                <ul className="mt-6 space-y-3">
                  {[
                    "Licensed pharmacists on every shift",
                    "Most major insurance plans accepted",
                    "Private counselling space",
                    "Local delivery across greater Austin",
                    "Vaccinations and health screenings on site",
                    pharmacy.certifications[1],
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#0c1a14]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/about" className="btn-primary mt-8 w-fit !py-2.5 text-sm">
                  Our story & team
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Hours + contact strip */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Opening hours
            </h2>
            <ul className="mt-4 space-y-3">
              {pharmacy.hours.map((h) => (
                <li
                  key={h.day}
                  className="flex items-center justify-between border-b border-teal-900/5 pb-3 text-sm last:border-0"
                >
                  <span className="text-[#5a6b62]">{h.day}</span>
                  <span className="font-semibold text-[#0c1a14]">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-sm sm:p-8">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Contact
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-[#5a6b62]">
              <li>
                <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">
                  Address
                </span>
                {pharmacy.address.full}
              </li>
              <li>
                <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">
                  Phone
                </span>
                <a href={pharmacy.phoneHref} className="font-semibold text-[#0c1a14] hover:text-teal-800">
                  {pharmacy.phone}
                </a>
              </li>
              <li>
                <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">
                  Email
                </span>
                <a href={`mailto:${pharmacy.email}`} className="font-semibold text-[#0c1a14] hover:text-teal-800">
                  {pharmacy.email}
                </a>
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={pharmacy.mapsDirections} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2 text-sm">
                Get directions
              </a>
              <a href={pharmacy.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-primary !py-2 text-sm">
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow="Patient stories"
              title="Trusted by neighbours across Austin"
              align="center"
            />
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 70}>
                <figure className="card-lift flex h-full flex-col rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
                  <div className="mb-3 flex gap-0.5 text-amber-400" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <svg key={si} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7.2L12 16.8 5.7 21.2 8 14 2 9.2h7.6L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-[#3d4f46]">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-teal-900/5 pt-4">
                    <Image
                      src={t.avatar}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0c1a14]">{t.name}</p>
                      <p className="text-xs text-[#5a6b62]">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Health tips */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <SectionHeading
                eyebrow="Health library"
                title="Practical advice from our pharmacists"
              />
              <Link href="/health" className="text-sm font-semibold text-teal-800 hover:underline">
                All articles →
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {featuredArticles.map((a, i) => (
              <Reveal key={a.slug} delay={i * 70}>
                <Link
                  href={`/health/${a.slug}`}
                  className="card-lift group block overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm"
                >
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                      {a.category} · {a.readTime}
                    </p>
                    <h3
                      className="mt-2 text-lg font-semibold text-[#0c1a14]"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {a.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5a6b62]">{a.excerpt}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery preview */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading eyebrow="Inside the pharmacy" title="A calm space for careful care" />
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {gallery.slice(0, 6).map((g, i) => (
              <div
                key={g.src}
                className={`relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2 min-h-[220px] md:min-h-[320px]" : "min-h-[140px] md:min-h-[160px]"}`}
              >
                <Image src={g.src} alt={g.alt} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                  <p className="text-xs font-medium text-white">{g.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicTestimonials />

      <CtaBanner />
    </div>
  );
}
