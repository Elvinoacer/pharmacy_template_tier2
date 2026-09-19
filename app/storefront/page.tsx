import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  HeartPulse,
  MessageCircle,
  Phone,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import CtaBanner from "../components/CtaBanner";
import { PublicTestimonials } from "../components/PublicTestimonials";
import Reveal from "../components/Reveal";
import SectionHeading from "../components/SectionHeading";
import ChoosePharmacy from "../components/ChoosePharmacy";
import StorefrontUnavailable from "../components/StorefrontUnavailable";
import { articles } from "../lib/data";
import { listPublicServices } from "../lib/services/pharmacy-services";
import {
  getStorefrontView,
  resolveBullets,
} from "../lib/services/storefront-content";

import { prismaUnscoped } from "../lib/db";
import NetworkStorefrontShowcase from "./NetworkShowcase";

const R2_FALLBACK = "https://pub-cc07856d657b4a7197710051042b3eda.r2.dev/images/gallery/welcoming_retail_floor.webp";

export default async function StorefrontPage() {
  const view = await getStorefrontView();
  if (view.status === "unavailable") {
    return <StorefrontUnavailable slug={view.slug} next="/" />;
  }
  if (view.status !== "active") {
    const [networkPharmacies, dbServices] = await Promise.all([
      prismaUnscoped.pharmacy.findMany({
        where: { status: "active", listed: true },
        select: {
          id: true,
          name: true,
          slug: true,
          tagline: true,
          city: true,
          county: true,
          coverImageUrl: true,
          logoUrl: true,
        },
        take: 6,
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      listPublicServices().catch(() => []),
    ]);
    return (
      <NetworkStorefrontShowcase
        pharmacies={networkPharmacies}
        services={dbServices.slice(0, 6)}
      />
    );
  }

  const { resolved, content } = view;
  const base = `/p/${resolved.slug}`;
  const place = [resolved.address.city, resolved.address.state]
    .filter(Boolean)
    .join(", ");

  const dbServices = await listPublicServices().catch(() => []);
  const featuredServices = dbServices.slice(0, 6);
  const featuredArticles = articles.slice(0, 3);
  const todayHours = resolved.hours[0];

  // Quick actions stay functional bindings — tenants rename/reorder/hide them
  // from the Storefront Studio; the destinations are wired by key.
  const iconFor: Record<
    string,
    typeof RotateCw | undefined
  > = { refill: RotateCw, photo: Camera, feel: HeartPulse, call: Phone, whatsapp: MessageCircle };
  const hrefFor: Record<string, { href: string; external?: boolean }> = {
    refill: { href: `${base}/refill` },
    photo: { href: `${base}/medicines?photo=1` },
    feel: { href: `${base}/how-do-you-feel` },
    call: { href: resolved.phoneHref, external: true },
    whatsapp: { href: resolved.whatsappHref, external: true },
  };
  const quickActions = content.quickActions
    .filter((qa) => hrefFor[qa.key])
    .map((qa) => ({ ...qa, ...(hrefFor[qa.key] as { href: string; external?: boolean }), Icon: iconFor[qa.key] ?? RotateCw }));

  const trustFacts = [
    { value: "PPB", label: "Verified & licensed pharmacy" },
    { value: String(resolved.hours.length || 7), label: resolved.hours.length ? "Days open every week" : "Days reachable by phone" },
    { value: resolved.address.city || "Kenya", label: "Serving this neighbourhood" },
    { value: "1:1", label: "Pharmacist-led, personal care" },
  ];

  const whyBullets = resolveBullets(content.whyChooseUs.bullets, resolved);
  const heroCover =
    resolved.coverImageUrl || content.gallery[0]?.src || R2_FALLBACK;
  const heroSideImage =
    content.gallery.find((g) => g.caption === "Private counselling")?.src ||
    content.gallery[2]?.src ||
    heroCover;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36">
        <div className="hero-mesh-bg absolute inset-0 -z-10 opacity-60" />

        <div
          className="hero-glow -left-20 top-10 animate-gentle-pulse tenant-hero-glow"
          style={
            content.theme.brandAccent
              ? { background: `radial-gradient(circle, ${content.theme.brandAccent}38 0%, transparent 70%)` }
              : undefined
          }
        />
        <div
          className="hero-glow right-0 top-40 opacity-70"
          style={{
            background:
              "radial-gradient(circle, rgba(201,162,39,0.22) 0%, transparent 70%)",
          }}
        />

        <span aria-hidden className="drift-particle drift-particle-up" style={{ width: 6, height: 6, background: "rgba(45,212,191,0.3)", top: "60%", left: "15%", animationDelay: "0s" }} />
        <span aria-hidden className="drift-particle drift-particle-up" style={{ width: 4, height: 4, background: "rgba(201,162,39,0.25)", top: "50%", left: "75%", animationDelay: "2s" }} />
        <span aria-hidden className="drift-particle drift-particle-down" style={{ width: 5, height: 5, background: "rgba(13,110,90,0.2)", top: "30%", left: "55%", animationDelay: "4s" }} />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="animate-fade-up">
            <div className="hero-badge mb-6 inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#084c3f] shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {content.hero.kickerBadge ||
                (todayHours
                  ? `Open today · ${todayHours.time}`
                  : `Here for you in ${place || "your neighbourhood"}`)}
            </div>

            <h1
              className="max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-[#0c1a14] sm:text-5xl lg:text-[3.6rem]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              <span className="hero-line-1 block">
                {content.hero.headlineStart}{" "}
                {content.hero.highlight && (
                  <span className="relative inline-block px-1">
                    <span className="gradient-text font-extrabold">{content.hero.highlight}</span>
                    <svg
                      className="absolute -bottom-1 left-0 w-full text-emerald-500/35"
                      height="8"
                      viewBox="0 0 100 8"
                      preserveAspectRatio="none"
                      fill="none"
                      aria-hidden
                    >
                      <path d="M2 6 C 30 1, 70 1, 98 6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
                {content.hero.headlineEnd}
              </span>
              <span className="hero-line-2 mt-1.5 block font-normal italic text-[#0b5c4b]">
                {content.hero.subline}
              </span>
            </h1>

            <p className="hero-line-3 mt-5 max-w-lg text-base leading-relaxed text-[#5a6b62] sm:text-lg">
              {content.hero.description}
            </p>

            <div className="hero-line-4 mt-8 flex flex-wrap items-center gap-3">
              <Link href={`${base}/refill`} className="btn-primary button-sparkle-overlay">
                Request a refill
              </Link>
              <Link href={`${base}/contact`} className="btn-ghost">
                Contact &amp; directions
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M12 6l6 6-6 6" />
                </svg>
              </Link>
            </div>

            <div className="hero-line-5 mt-10 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="font-semibold text-[#0c1a14]">{resolved.address.full || place || "Kenya"}</p>
                <p className="text-[#5a6b62]">{content.hero.secondaryLineLabel}</p>
              </div>
              <div>
                <a href={resolved.phoneHref} className="font-semibold text-teal-800 hover:underline">
                  {resolved.phone}
                </a>
                <p className="text-[#5a6b62]">Call or WhatsApp</p>
              </div>
            </div>
          </div>

          <div className="hero-media relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-teal-400/20 via-transparent to-amber-300/20 blur-2xl animate-subtle-zoom" />
            <div className="relative grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-7 row-span-2 overflow-hidden rounded-[1.5rem] shadow-2xl shadow-teal-900/20 ring-1 ring-inset ring-white/25">
                <div className="relative aspect-[3/4] sm:aspect-[4/5]">
                  <Image
                    src={heroCover}
                    alt={`${resolved.name} pharmacy`}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 768px) 60vw, 320px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#084c3f]/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-white/90">
                      {place || "Kenya"}
                    </p>
                    <p
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {resolved.name}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-5 overflow-hidden rounded-[1.25rem] shadow-xl ring-1 ring-inset ring-white/25">
                <div className="relative aspect-square">
                  {heroSideImage && (
                    <Image
                      src={heroSideImage}
                      alt="Pharmacist preparing medication"
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  )}
                </div>
              </div>
              <div className="glass-tile col-span-5 rounded-[1.25rem] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700/70">
                  Today&apos;s hours
                </p>
                <p className="mt-1 text-sm font-semibold text-[#0c1a14]">
                  {todayHours ? todayHours.time : "Call to confirm"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#5a6b62]">
                  Walk-ins welcome · Vaccines available
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <section className="px-4 pb-8 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map((a, i) => (
            <Reveal key={a.key} delay={i * 80}>
              <Link
                href={a.href}
                {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="card-lift glass-tile group flex h-full items-center gap-3 rounded-2xl p-4 transition hover:bg-white/95"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800 transition duration-300 group-hover:scale-110 group-hover:bg-teal-100 group-hover:shadow-md">
                  <a.Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#0c1a14] transition-colors duration-300 group-hover:text-teal-800">{a.title}</span>
                  <span className="block truncate text-xs text-[#5a6b62]">{a.desc}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Trust band — tenant-honest facts, not network-wide marketing ── */}
      <section className="px-4 py-12 sm:px-6">
        <div className="hero-mesh-band relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#084c3f] via-[#0d6e5a] to-[#0f766e] px-6 py-12 text-white shadow-2xl shadow-teal-900/25 sm:px-12 tenant-trust-band">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-teal-300/8 via-transparent to-transparent" aria-hidden />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {trustFacts.map((s, i) => (
              <Reveal key={s.label} delay={i * 100}>
                <div className="text-center sm:text-left">
                  <p
                    className="truncate text-3xl font-semibold tracking-tight sm:text-4xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    <span className="animate-number-pop" style={{ animationDelay: `${i * 0.15 + 0.3}s`, display: "inline-block" }}>
                      {s.value}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-white/90">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured services ──────────────────────────────────────────── */}
      {content.sections.services && (
        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <SectionHeading
                  eyebrow="Our services"
                  title="Everything you need from a modern community pharmacy"
                />
                <Link href={`${base}/services`} className="group inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline">
                  View all services
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                    <path d="M5 12h14M12 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </Reveal>
            {featuredServices.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] bg-white/70 p-10 text-center backdrop-blur-sm">
                <p className="text-sm font-semibold text-[#0c1a14]">Services are being updated</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#5a6b62]">
                  {resolved.name} hasn&apos;t published its service catalogue yet. Call{" "}
                  <a href={resolved.phoneHref} className="font-semibold text-teal-800 hover:underline">{resolved.phone}</a>{" "}
                  and the team will gladly help.
                </p>
              </div>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredServices.map((s, i) => (
                  <Reveal key={s.slug} delay={i * 60}>
                    <Link
                      href={`${base}/services/${s.slug}`}
                      className="card-lift glass-tile-strong group flex h-full flex-col overflow-hidden rounded-3xl transition-shadow duration-500 hover:shadow-[0_24px_60px_rgba(8,40,32,0.16)]"
                    >
                      <div className="relative h-44 overflow-hidden bg-[#eef5f1]">
                        {s.imageUrl ? (
                          <Image
                            src={s.imageUrl}
                            alt={s.title}
                            fill
                            className="object-cover transition duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-teal-900/30" aria-hidden>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5.25v13.5M5.25 12h13.5" /></svg>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3
                          className="text-lg font-semibold text-[#0c1a14] transition-colors duration-300 group-hover:text-teal-800"
                          style={{ fontFamily: "var(--font-display), serif" }}
                        >
                          {s.title}
                        </h3>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-[#5a6b62]">{s.short}</p>
                        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800 transition-transform duration-300 group-hover:translate-x-1">
                          Learn more
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                            <path d="M5 12h14M12 6l6 6-6 6" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Why choose us ──────────────────────────────────────────────── */}
      {content.sections.whyChooseUs && (
        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="glass-panel-strong group/card grid overflow-hidden rounded-[2rem] lg:grid-cols-2">
                <div className="relative min-h-[260px] overflow-hidden lg:min-h-[400px]">
                  <Image
                    src={content.whyChooseUs.imageUrl || content.gallery[3]?.src || heroCover}
                    alt="Pharmacist consulting with a patient"
                    fill
                    className="object-cover transition duration-[1.2s] ease-out group-hover/card:scale-[1.03]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 lg:block hidden" aria-hidden />
                </div>
                <div className="flex flex-col justify-center p-8 sm:p-12">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
                    {content.whyChooseUs.eyebrow || `Why ${resolved.name}`}
                  </p>
                  <h2
                    className="mt-3 text-2xl font-semibold tracking-tight text-[#0c1a14] sm:text-3xl"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {content.whyChooseUs.title}
                  </h2>
                  <ul className="mt-6 space-y-3">
                    {whyBullets.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-[#0c1a14]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href={`${base}/about`} className="btn-primary btn-primary-sm mt-8 w-fit">
                    Our story &amp; team
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Hours + contact strip ──────────────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          <div className="glass-panel-strong rounded-3xl p-6 sm:p-8">
            <h2
              className="text-xl font-semibold text-[#0c1a14]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Opening hours
            </h2>
            {resolved.hours.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {resolved.hours.map((h) => (
                  <li
                    key={h.day}
                    className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--foreground)_55%,var(--card))] pb-3 text-sm last:border-0"
                  >
                    <span className="text-[#5a6b62]">{h.day}</span>
                    <span className="font-semibold text-[#0c1a14]">{h.time}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl bg-[#f0faf6]/80 px-4 py-3 text-sm text-[#5a6b62] backdrop-blur-sm">
                Opening hours aren&apos;t published yet — call{" "}
                <a href={resolved.phoneHref} className="font-semibold text-teal-800 hover:underline">
                  {resolved.phone}
                </a>{" "}
                to confirm the best time to visit.
              </p>
            )}
          </div>
          <div className="glass-panel-strong rounded-3xl p-6 sm:p-8">
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
                {resolved.address.full || place || "Kenya"}
              </li>
              <li>
                <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">
                  Phone
                </span>
                <a href={resolved.phoneHref} className="font-semibold text-[#0c1a14] hover:text-teal-800">
                  {resolved.phone}
                </a>
              </li>
              <li>
                <span className="block text-xs font-bold uppercase tracking-wider text-teal-700">
                  Email
                </span>
                <a href={`mailto:${resolved.email}`} className="font-semibold text-[#0c1a14] hover:text-teal-800">
                  {resolved.email}
                </a>
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={resolved.mapsDirections} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-ghost-sm">
                Get directions
              </a>
              <a href={resolved.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-primary btn-primary-sm">
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Insurance & certifications strip ────────────────────────────── */}
      {content.sections.insuranceStrip && (content.insurance.length > 0 || content.certifications.length > 0) && (
        <section className="px-4 py-12 sm:px-6">
          <div className="glass-panel mx-auto max-w-6xl rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              {content.certifications.length > 0 && (
                <div className="lg:w-72 lg:shrink-0">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                    <ShieldCheck className="h-4 w-4" aria-hidden /> Certifications
                  </p>
                  <ul className="mt-3 space-y-2">
                    {content.certifications.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm text-[#0c1a14]">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600/70" aria-hidden />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {content.insurance.length > 0 && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Insurance we welcome</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {content.insurance.map((insurer) => (
                      <span
                        key={insurer}
                        className="glass-chip rounded-full px-3.5 py-1.5 text-xs font-medium text-[#23423a]"
                      >
                        {insurer}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Health tips — curated by the network, clearly labelled ─────── */}
      {content.sections.healthTips && (
        <section className="px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <SectionHeading
                  eyebrow={content.healthLibrary.eyebrow}
                  title={content.healthLibrary.title}
                />
                <Link href={`${base}/health`} className="group inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline">
                  All articles
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                    <path d="M5 12h14M12 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {featuredArticles.map((a, i) => (
                <Reveal key={a.slug} delay={i * 70}>
                  <Link
                    href={`${base}/health/${a.slug}`}
                    className="card-lift glass-tile-strong group block h-full overflow-hidden rounded-3xl transition-shadow duration-500 hover:shadow-[0_20px_50px_rgba(8,40,32,0.13)]"
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
                        className="mt-2 text-lg font-semibold text-[#0c1a14] transition-colors duration-300 group-hover:text-teal-800"
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
      )}

      {/* ── Gallery preview ─────────────────────────────────────────────── */}
      {content.sections.gallery && content.gallery.length > 0 && (
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <SectionHeading eyebrow="Inside the pharmacy" title="A calm space for careful care" />
            </Reveal>
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {content.gallery.slice(0, 6).map((g, i) => (
                <Reveal key={g.src} delay={i * 50}>
                  <div
                    className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "col-span-2 row-span-2 min-h-[220px] md:min-h-[320px]" : "min-h-[140px] md:min-h-[160px]"}`}
                  >
                    <Image
                      src={g.src}
                      alt={g.alt}
                      fill
                      className="object-cover transition duration-[1.2s] ease-out group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent p-3 transition-opacity duration-300 group-hover:opacity-100 opacity-90">
                      <p className="text-xs font-medium text-white">{g.caption}</p>
                    </div>
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/15 rounded-[inherit] pointer-events-none" aria-hidden />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {content.sections.testimonials && <PublicTestimonials />}

      <CtaBanner
        eyebrow={content.ctaBanner.eyebrow}
        title={content.ctaBanner.title}
        description={content.ctaBanner.description}
        primaryHref={content.ctaBanner.primary.href}
        primaryLabel={content.ctaBanner.primary.label}
        secondaryHref={content.ctaBanner.secondary.href}
        secondaryLabel={content.ctaBanner.secondary.label}
      />
    </div>
  );
}
